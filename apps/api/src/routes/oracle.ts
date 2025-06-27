import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { Oracle } from '@cag-chains/core/oracle/Oracle'
import { RedisService } from '../services/redis.js'

export const oracleRouter = new OpenAPIHono()

// Initialize Oracle instance
const oracle = new Oracle({
  optimizationStrategy: 'balanced',
  maxChainSize: 10,
  maxConcurrentChains: 100,
  nodeDiscoveryTimeout: 5000,
  taskTimeout: 300000
})

// Schemas for API validation
const TaskAnalysisRequestSchema = z.object({
  taskDescription: z.string().min(1),
  context: z.record(z.unknown()).default({})
})

const TaskAnalysisResponseSchema = z.object({
  complexity: z.number().min(1).max(10),
  requiredDomains: z.array(z.string()),
  decomposition: z.array(z.object({
    id: z.string(),
    type: z.string(),
    description: z.string(),
    domain: z.string(),
    complexity: z.number(),
    dependencies: z.array(z.string())
  })),
  dependencies: z.array(z.object({
    from: z.string(),
    to: z.string(),
    type: z.enum(['data', 'sequence', 'validation']),
    strength: z.number()
  })),
  estimatedTokens: z.number(),
  parallelizable: z.boolean()
})

const ChainPlanRequestSchema = z.object({
  taskDescription: z.string().min(1),
  context: z.record(z.unknown()).default({}),
  optimizationStrategy: z.enum(['cost', 'speed', 'quality', 'balanced']).default('balanced')
})

const ChainPlanResponseSchema = z.object({
  analysis: TaskAnalysisResponseSchema,
  plan: z.object({
    id: z.string(),
    topology: z.enum(['linear', 'tree', 'graph', 'parallel']),
    tasks: z.array(z.object({
      id: z.string(),
      type: z.string(),
      description: z.string(),
      requirements: z.object({
        domains: z.array(z.string()),
        complexity: z.number(),
        timeConstraint: z.number().optional(),
        qualityTarget: z.number().optional()
      }),
      dependencies: z.array(z.string()),
      context: z.record(z.unknown())
    })),
    nodeRequirements: z.array(z.object({
      taskId: z.string(),
      requiredDomains: z.array(z.string()),
      nodeType: z.enum(['nano', 'small', 'medium', 'large', 'xlarge']),
      minExpertise: z.number(),
      priority: z.number()
    })),
    estimatedCost: z.number(),
    estimatedDuration: z.number(),
    confidence: z.number(),
    reasoning: z.string(),
    alternatives: z.array(z.object({
      topology: z.enum(['linear', 'tree', 'graph', 'parallel']),
      cost: z.number(),
      duration: z.number(),
      description: z.string()
    }))
  }),
  recommendations: z.array(z.string())
})

const OptimizeChainRequestSchema = z.object({
  chainId: z.string(),
  currentPerformance: z.object({
    actualCost: z.number(),
    actualDuration: z.number(),
    successRate: z.number(),
    bottlenecks: z.array(z.string()).default([])
  })
})

// POST /oracle/analyze - Analyze a task
const analyzeTaskRoute = createRoute({
  method: 'post',
  path: '/analyze',
  summary: 'Analyze task',
  description: 'Analyze a task description to understand complexity, required domains, and decomposition',
  request: {
    body: {
      content: {
        'application/json': {
          schema: TaskAnalysisRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Task analysis completed',
      content: {
        'application/json': {
          schema: TaskAnalysisResponseSchema
        }
      }
    },
    400: {
      description: 'Invalid request data'
    },
    500: {
      description: 'Analysis failed'
    }
  }
})

oracleRouter.openapi(analyzeTaskRoute, async (c) => {
  const { taskDescription, context } = c.req.valid('json')

  try {
    console.log(`🔍 Oracle analyzing task: ${taskDescription.substring(0, 100)}...`)
    
    const analysis = await oracle.analyzeTask(taskDescription, context)
    
    return c.json(analysis)
  } catch (error) {
    console.error('Task analysis failed:', error)
    return c.json({ 
      error: 'Failed to analyze task',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// POST /oracle/plan - Plan optimal chain
const planChainRoute = createRoute({
  method: 'post', 
  path: '/plan',
  summary: 'Plan optimal chain',
  description: 'Analyze task and create optimal CAG-Chain execution plan',
  request: {
    body: {
      content: {
        'application/json': {
          schema: ChainPlanRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Chain plan created',
      content: {
        'application/json': {
          schema: ChainPlanResponseSchema
        }
      }
    },
    400: {
      description: 'Invalid request data'
    },
    500: {
      description: 'Planning failed'
    }
  }
})

oracleRouter.openapi(planChainRoute, async (c) => {
  const { taskDescription, context, optimizationStrategy } = c.req.valid('json')

  try {
    console.log(`⚡ Oracle planning chain for task: ${taskDescription.substring(0, 100)}...`)
    
    // Update Oracle configuration if needed
    if (optimizationStrategy !== 'balanced') {
      oracle.updateConfig({ optimizationStrategy })
    }
    
    const result = await oracle.processRequest(taskDescription, context)
    
    return c.json(result)
  } catch (error) {
    console.error('Chain planning failed:', error)
    return c.json({ 
      error: 'Failed to plan chain',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// POST /oracle/optimize - Optimize existing chain
const optimizeChainRoute = createRoute({
  method: 'post',
  path: '/optimize',
  summary: 'Optimize chain',
  description: 'Optimize an existing CAG-Chain based on performance data',
  request: {
    body: {
      content: {
        'application/json': {
          schema: OptimizeChainRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Chain optimization completed',
      content: {
        'application/json': {
          schema: z.object({
            optimized: z.boolean(),
            plan: ChainPlanResponseSchema.shape.plan.optional(),
            improvements: z.array(z.string()),
            potentialSavings: z.object({
              cost: z.number(),
              duration: z.number()
            }).optional()
          })
        }
      }
    },
    404: {
      description: 'Chain not found'
    },
    500: {
      description: 'Optimization failed'
    }
  }
})

oracleRouter.openapi(optimizeChainRoute, async (c) => {
  const { chainId, currentPerformance } = c.req.valid('json')

  try {
    console.log(`🔧 Oracle optimizing chain: ${chainId}`)
    
    // In a real implementation, we would fetch the chain from database
    // For now, return optimization suggestions based on performance data
    
    const improvements: string[] = []
    let optimized = false
    let potentialSavings = undefined

    // Analyze performance and suggest improvements
    if (currentPerformance.successRate < 0.9) {
      improvements.push('Low success rate detected - consider adding error handling and retry logic')
      optimized = true
    }

    if (currentPerformance.actualCost > currentPerformance.actualDuration * 0.1) {
      improvements.push('High token cost - consider using smaller node types or optimization strategies')
      potentialSavings = {
        cost: currentPerformance.actualCost * 0.2,
        duration: 0
      }
      optimized = true
    }

    if (currentPerformance.actualDuration > 60000) {
      improvements.push('Long execution time - consider parallelization or faster node types')
      if (!potentialSavings) {
        potentialSavings = { cost: 0, duration: currentPerformance.actualDuration * 0.3 }
      } else {
        potentialSavings.duration = currentPerformance.actualDuration * 0.3
      }
      optimized = true
    }

    if (currentPerformance.bottlenecks.length > 0) {
      improvements.push(`Bottlenecks detected in: ${currentPerformance.bottlenecks.join(', ')} - consider load balancing`)
      optimized = true
    }

    return c.json({
      optimized,
      improvements,
      potentialSavings
    })
  } catch (error) {
    console.error('Chain optimization failed:', error)
    return c.json({ 
      error: 'Failed to optimize chain',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// GET /oracle/history - Get chain planning history
const getHistoryRoute = createRoute({
  method: 'get',
  path: '/history',
  summary: 'Get planning history',
  description: 'Get Oracle\'s chain planning history for learning and analytics',
  request: {
    query: z.object({
      limit: z.string().transform(Number).default('50'),
      offset: z.string().transform(Number).default('0')
    })
  },
  responses: {
    200: {
      description: 'Planning history',
      content: {
        'application/json': {
          schema: z.object({
            history: z.array(ChainPlanResponseSchema.shape.plan),
            total: z.number(),
            analytics: z.object({
              avgComplexity: z.number(),
              mostCommonDomains: z.array(z.string()),
              avgConfidence: z.number(),
              topologyDistribution: z.record(z.number())
            })
          })
        }
      }
    }
  }
})

oracleRouter.openapi(getHistoryRoute, async (c) => {
  const { limit, offset } = c.req.valid('query')

  try {
    const history = oracle.getChainHistory()
    const total = history.length
    
    // Paginate results
    const paginatedHistory = history.slice(offset, offset + limit)
    
    // Calculate analytics
    const analytics = {
      avgComplexity: history.reduce((sum, plan) => 
        sum + plan.tasks.reduce((taskSum, task) => taskSum + task.requirements.complexity, 0) / plan.tasks.length
      , 0) / Math.max(history.length, 1),
      
      mostCommonDomains: getMostCommonDomains(history),
      
      avgConfidence: history.reduce((sum, plan) => sum + plan.confidence, 0) / Math.max(history.length, 1),
      
      topologyDistribution: getTopologyDistribution(history)
    }

    return c.json({
      history: paginatedHistory,
      total,
      analytics
    })
  } catch (error) {
    console.error('Failed to get history:', error)
    return c.json({ 
      error: 'Failed to retrieve history',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// GET /oracle/status - Get Oracle status and configuration
const getStatusRoute = createRoute({
  method: 'get',
  path: '/status',
  summary: 'Get Oracle status',
  description: 'Get current Oracle configuration and status',
  responses: {
    200: {
      description: 'Oracle status',
      content: {
        'application/json': {
          schema: z.object({
            status: z.string(),
            configuration: z.object({
              optimizationStrategy: z.enum(['cost', 'speed', 'quality', 'balanced']),
              maxChainSize: z.number(),
              maxConcurrentChains: z.number(),
              nodeDiscoveryTimeout: z.number(),
              taskTimeout: z.number()
            }),
            stats: z.object({
              activeChains: z.number(),
              totalPlansCreated: z.number(),
              registeredNodes: z.number(),
              avgPlanConfidence: z.number()
            })
          })
        }
      }
    }
  }
})

oracleRouter.openapi(getStatusRoute, async (c) => {
  try {
    const activeChains = oracle.getActiveChains()
    const history = oracle.getChainHistory()
    
    const avgPlanConfidence = history.length > 0 
      ? history.reduce((sum, plan) => sum + plan.confidence, 0) / history.length 
      : 0

    return c.json({
      status: 'active',
      configuration: {
        optimizationStrategy: 'balanced', // Would come from Oracle config
        maxChainSize: 10,
        maxConcurrentChains: 100,
        nodeDiscoveryTimeout: 5000,
        taskTimeout: 300000
      },
      stats: {
        activeChains: activeChains.length,
        totalPlansCreated: history.length,
        registeredNodes: 0, // Would come from Oracle's node registry
        avgPlanConfidence
      }
    })
  } catch (error) {
    console.error('Failed to get Oracle status:', error)
    return c.json({ 
      error: 'Failed to retrieve status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Helper functions
function getMostCommonDomains(history: any[]): string[] {
  const domainCounts = new Map<string, number>()
  
  for (const plan of history) {
    for (const task of plan.tasks) {
      for (const domain of task.requirements.domains) {
        domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1)
      }
    }
  }
  
  return Array.from(domainCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([domain]) => domain)
}

function getTopologyDistribution(history: any[]): Record<string, number> {
  const distribution: Record<string, number> = {
    linear: 0,
    tree: 0,
    graph: 0,
    parallel: 0
  }
  
  for (const plan of history) {
    distribution[plan.topology] = (distribution[plan.topology] || 0) + 1
  }
  
  return distribution
} 