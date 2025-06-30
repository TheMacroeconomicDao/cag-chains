import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { CAGNode, ChainNode, QualityController } from '../../../../packages/core/src/node/index.js'
import { RedisService } from '../services/redis.js'

export const chainNodesRouter = new OpenAPIHono()

const redis = RedisService.getInstance()
const qualityController = new QualityController()

// ==================== SCHEMAS ====================

const ChainNodeSchema = z.object({
  id: z.string(),
  originalNodeId: z.string(),
  lockingTimestamp: z.number(),
  domains: z.array(z.string()),
  capabilities: z.array(z.string()),
  limitations: z.array(z.string()),
  expertiseLevel: z.number(),
  isPublic: z.boolean(),
  isCommercial: z.boolean(),
  pricePerUse: z.number().optional(),
  usageCount: z.number(),
  revenue: z.number()
})

const QualityAssessmentSchema = z.object({
  nodeId: z.string(),
  isEligible: z.boolean(),
  score: z.number(),
  requirements: z.array(z.object({
    metric: z.string(),
    threshold: z.number(),
    currentValue: z.number(),
    passed: z.boolean(),
    gap: z.number().optional()
  })),
  recommendations: z.array(z.string())
})

const LockNodeRequestSchema = z.object({
  qualityRequirements: z.array(z.object({
    metric: z.enum(['successRate', 'responseTime', 'tokenEfficiency', 'qualityScore']),
    threshold: z.number(),
    evaluationPeriod: z.number(),
    testCases: z.number().optional()
  })).optional(),
  reusabilityRights: z.object({
    isPublic: z.boolean().default(true),
    isCommercial: z.boolean().default(false),
    licenseType: z.enum(['open', 'commercial', 'restricted']).default('open'),
    pricePerUse: z.number().optional(),
    maxUses: z.number().optional(),
    restrictions: z.array(z.string()).default([])
  }).optional()
})

const ExecuteTaskSchema = z.object({
  type: z.string(),
  description: z.string(),
  requirements: z.object({
    domains: z.array(z.string()),
    complexity: z.number().min(1).max(10),
    timeConstraint: z.number().optional(),
    qualityTarget: z.number().min(0).max(1).optional()
  }),
  context: z.record(z.unknown()).default({})
})

// ==================== ROUTES ====================

// POST /api/v1/chain-nodes/assess/:nodeId - Assess node quality
const assessQualityRoute = createRoute({
  method: 'post',
  path: '/assess/{nodeId}',
  summary: 'Assess node quality',
  description: 'Assess CAG node quality for Chain Node eligibility',
  request: {
    params: z.object({
      nodeId: z.string().uuid()
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            customRequirements: z.array(z.object({
              metric: z.enum(['successRate', 'responseTime', 'tokenEfficiency', 'qualityScore']),
              threshold: z.number(),
              evaluationPeriod: z.number(),
              testCases: z.number().optional()
            })).optional()
          })
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Quality assessment completed',
      content: {
        'application/json': {
          schema: QualityAssessmentSchema
        }
      }
    },
    404: {
      description: 'Node not found'
    },
    500: {
      description: 'Assessment failed'
    }
  }
})

chainNodesRouter.openapi(assessQualityRoute, async (c) => {
  try {
    const { nodeId } = c.req.valid('param')
    const { customRequirements } = c.req.valid('json')

    // Get node from Redis
    const nodeData = await redis.getNode(nodeId)
    if (!nodeData) {
      return c.json({ error: 'Node not found' }, 404)
    }

    // Create CAGNode instance (this would be more sophisticated in real implementation)
    const cagNode = new CAGNode({
      domain: nodeData.domain,
      subdomains: nodeData.subdomains || [],
      nodeType: nodeData.nodeType,
      expertiseLevel: nodeData.expertiseLevel,
      openaiApiKey: process.env.OPENAI_API_KEY || ''
    })

    // Assess quality
    const assessment = await qualityController.assessNodeQuality(cagNode, customRequirements)

    return c.json({
      nodeId: assessment.nodeId,
      isEligible: assessment.isEligible,
      score: assessment.score,
      requirements: assessment.requirements.map(req => ({
        metric: req.requirement.metric,
        threshold: req.requirement.threshold,
        currentValue: req.currentValue,
        passed: req.passed,
        gap: req.gap
      })),
      recommendations: assessment.recommendations
    })
  } catch (error) {
    console.error('Quality assessment failed:', error)
    return c.json({ 
      error: 'Assessment failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// POST /api/v1/chain-nodes/lock/:nodeId - Lock node as Chain Node
const lockNodeRoute = createRoute({
  method: 'post',
  path: '/lock/{nodeId}',
  summary: 'Lock node as Chain Node',
  description: 'Lock a validated CAG node as an immutable Chain Node',
  request: {
    params: z.object({
      nodeId: z.string().uuid()
    }),
    body: {
      content: {
        'application/json': {
          schema: LockNodeRequestSchema
        }
      }
    }
  },
  responses: {
    201: {
      description: 'Chain Node created successfully',
      content: {
        'application/json': {
          schema: z.object({
            chainNode: ChainNodeSchema,
            message: z.string()
          })
        }
      }
    },
    400: {
      description: 'Node quality insufficient or invalid request'
    },
    404: {
      description: 'Node not found'
    }
  }
})

chainNodesRouter.openapi(lockNodeRoute, async (c) => {
  try {
    const { nodeId } = c.req.valid('param')
    const { qualityRequirements, reusabilityRights } = c.req.valid('json')

    // Get node from Redis
    const nodeData = await redis.getNode(nodeId)
    if (!nodeData) {
      return c.json({ error: 'Node not found' }, 404)
    }

    // Create CAGNode instance
    const cagNode = new CAGNode({
      domain: nodeData.domain,
      subdomains: nodeData.subdomains || [],
      nodeType: nodeData.nodeType,
      expertiseLevel: nodeData.expertiseLevel,
      openaiApiKey: process.env.OPENAI_API_KEY || ''
    })

    // Lock as Chain Node
    const chainNode = await qualityController.lockAsChainNode(cagNode, {
      qualityRequirements,
      reusabilityRights
    })

    // Store Chain Node in Redis
    const chainNodeData = {
      id: chainNode.getId(),
      originalNodeId: nodeId,
      lockingTimestamp: chainNode.getMetadata().lockingTimestamp,
      domains: chainNode.getMetadata().contextSnapshot.domains,
      capabilities: chainNode.getCapabilities(),
      limitations: chainNode.getLimitations(),
      expertiseLevel: chainNode.getMetadata().contextSnapshot.expertiseLevel,
      isPublic: chainNode.isPublic(),
      isCommercial: chainNode.isCommercial(),
      pricePerUse: chainNode.getPrice(),
      usageCount: chainNode.getUsageStats().count,
      revenue: chainNode.getUsageStats().revenue
    }

    await redis.set(`chain_node:${chainNode.getId()}`, JSON.stringify(chainNodeData))
    await redis.sadd('chain_nodes', chainNode.getId())

    return c.json({
      chainNode: chainNodeData,
      message: 'Chain Node created successfully'
    }, 201)
  } catch (error) {
    console.error('Chain Node locking failed:', error)
    return c.json({ 
      error: 'Locking failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 400)
  }
})

// GET /api/v1/chain-nodes - List Chain Nodes
const listChainNodesRoute = createRoute({
  method: 'get',
  path: '/',
  summary: 'List Chain Nodes',
  description: 'Get a list of available Chain Nodes with filtering options',
  request: {
    query: z.object({
      domain: z.string().optional(),
      isPublic: z.string().transform(Boolean).optional(),
      isCommercial: z.string().transform(Boolean).optional(),
      minExpertise: z.string().transform(Number).optional(),
      maxPrice: z.string().transform(Number).optional(),
      limit: z.string().transform(Number).default('50'),
      offset: z.string().transform(Number).default('0')
    })
  },
  responses: {
    200: {
      description: 'List of Chain Nodes',
      content: {
        'application/json': {
          schema: z.object({
            chainNodes: z.array(ChainNodeSchema),
            total: z.number(),
            limit: z.number(),
            offset: z.number()
          })
        }
      }
    }
  }
})

chainNodesRouter.openapi(listChainNodesRoute, async (c) => {
  try {
    const { domain, isPublic, isCommercial, minExpertise, maxPrice, limit, offset } = c.req.valid('query')

    // Get all Chain Node IDs
    const chainNodeIds = await redis.smembers('chain_nodes')
    
    // Fetch Chain Node data
    const chainNodePromises = chainNodeIds.map(async (id) => {
      const data = await redis.get(`chain_node:${id}`)
      return data ? JSON.parse(data) : null
    })
    
    let chainNodes = (await Promise.all(chainNodePromises)).filter(Boolean)

    // Apply filters
    if (domain) {
      chainNodes = chainNodes.filter(node => 
        node.domains.some((d: string) => d.toLowerCase().includes(domain.toLowerCase()))
      )
    }

    if (isPublic !== undefined) {
      chainNodes = chainNodes.filter(node => node.isPublic === isPublic)
    }

    if (isCommercial !== undefined) {
      chainNodes = chainNodes.filter(node => node.isCommercial === isCommercial)
    }

    if (minExpertise !== undefined) {
      chainNodes = chainNodes.filter(node => node.expertiseLevel >= minExpertise)
    }

    if (maxPrice !== undefined) {
      chainNodes = chainNodes.filter(node => !node.pricePerUse || node.pricePerUse <= maxPrice)
    }

    // Pagination
    const total = chainNodes.length
    const paginatedNodes = chainNodes.slice(offset, offset + limit)

    return c.json({
      chainNodes: paginatedNodes,
      total,
      limit,
      offset
    })
  } catch (error) {
    console.error('Failed to list Chain Nodes:', error)
    return c.json({ error: 'Failed to list Chain Nodes' }, 500)
  }
})

// GET /api/v1/chain-nodes/:id - Get specific Chain Node
const getChainNodeRoute = createRoute({
  method: 'get',
  path: '/{id}',
  summary: 'Get Chain Node',
  description: 'Get detailed information about a specific Chain Node',
  request: {
    params: z.object({
      id: z.string()
    })
  },
  responses: {
    200: {
      description: 'Chain Node details',
      content: {
        'application/json': {
          schema: ChainNodeSchema
        }
      }
    },
    404: {
      description: 'Chain Node not found'
    }
  }
})

chainNodesRouter.openapi(getChainNodeRoute, async (c) => {
  try {
    const { id } = c.req.valid('param')

    const data = await redis.get(`chain_node:${id}`)
    if (!data) {
      return c.json({ error: 'Chain Node not found' }, 404)
    }

    return c.json(JSON.parse(data))
  } catch (error) {
    console.error('Failed to get Chain Node:', error)
    return c.json({ error: 'Failed to get Chain Node' }, 500)
  }
})

// POST /api/v1/chain-nodes/:id/execute - Execute task on Chain Node
const executeTaskRoute = createRoute({
  method: 'post',
  path: '/{id}/execute',
  summary: 'Execute task on Chain Node',
  description: 'Execute a task using a specific Chain Node with guaranteed performance',
  request: {
    params: z.object({
      id: z.string()
    }),
    body: {
      content: {
        'application/json': {
          schema: ExecuteTaskSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Task executed successfully',
      content: {
        'application/json': {
          schema: z.object({
            result: z.string(),
            success: z.boolean(),
            tokensUsed: z.number(),
            responseTime: z.number(),
            qualityScore: z.number(),
            guaranteedMetrics: z.record(z.number()),
            contextIntegrity: z.boolean(),
            usageTracking: z.object({
              usageCount: z.number(),
              totalRevenue: z.number().optional()
            })
          })
        }
      }
    },
    400: {
      description: 'Task incompatible with Chain Node'
    },
    404: {
      description: 'Chain Node not found'
    }
  }
})

chainNodesRouter.openapi(executeTaskRoute, async (c) => {
  try {
    const { id } = c.req.valid('param')
    const taskData = c.req.valid('json')

    // Get Chain Node data
    const chainNodeData = await redis.get(`chain_node:${id}`)
    if (!chainNodeData) {
      return c.json({ error: 'Chain Node not found' }, 404)
    }

    const nodeInfo = JSON.parse(chainNodeData)

    // Get original CAG Node
    const originalNodeData = await redis.getNode(nodeInfo.originalNodeId)
    if (!originalNodeData) {
      return c.json({ error: 'Original node not found' }, 404)
    }

    // Create CAGNode and ChainNode instances
    const cagNode = new CAGNode({
      domain: originalNodeData.domain,
      subdomains: originalNodeData.subdomains || [],
      nodeType: originalNodeData.nodeType,
      expertiseLevel: originalNodeData.expertiseLevel,
      openaiApiKey: process.env.OPENAI_API_KEY || ''
    })

    // This is simplified - in real implementation we'd reconstruct the full Chain Node
    const task = {
      id: crypto.randomUUID(),
      type: taskData.type,
      description: taskData.description,
      requirements: taskData.requirements,
      dependencies: [],
      context: taskData.context,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Execute task using CAG Node (simplified for MVP)
    const result = await cagNode.processTask(task)

    // Update usage tracking
    nodeInfo.usageCount++
    if (nodeInfo.pricePerUse) {
      nodeInfo.revenue += nodeInfo.pricePerUse
    }
    await redis.set(`chain_node:${id}`, JSON.stringify(nodeInfo))

    return c.json({
      result: result.result || '',
      success: result.success,
      tokensUsed: result.tokensUsed,
      responseTime: result.responseTime,
      qualityScore: result.qualityScore,
      guaranteedMetrics: {
        min_qualityScore: 0.75,
        min_successRate: 0.85
      },
      contextIntegrity: true,
      usageTracking: {
        usageCount: nodeInfo.usageCount,
        totalRevenue: nodeInfo.revenue
      }
    })
  } catch (error) {
    console.error('Task execution failed:', error)
    return c.json({ 
      error: 'Task execution failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 400)
  }
})

// POST /api/v1/chain-nodes/:id/clone - Clone Chain Node
const cloneChainNodeRoute = createRoute({
  method: 'post',
  path: '/{id}/clone',
  summary: 'Clone Chain Node',
  description: 'Clone a Chain Node with optional customization',
  request: {
    params: z.object({
      id: z.string()
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            reusabilityRights: z.object({
              isPublic: z.boolean().optional(),
              isCommercial: z.boolean().optional(),
              licenseType: z.enum(['open', 'commercial', 'restricted']).optional(),
              pricePerUse: z.number().optional(),
              maxUses: z.number().optional(),
              restrictions: z.array(z.string()).optional()
            }).optional(),
            additionalCapabilities: z.array(z.string()).optional(),
            restrictions: z.array(z.string()).optional()
          })
        }
      }
    }
  },
  responses: {
    201: {
      description: 'Chain Node cloned successfully',
      content: {
        'application/json': {
          schema: z.object({
            clonedChainNode: ChainNodeSchema,
            message: z.string()
          })
        }
      }
    },
    403: {
      description: 'Cloning not permitted'
    },
    404: {
      description: 'Chain Node not found'
    }
  }
})

chainNodesRouter.openapi(cloneChainNodeRoute, async (c) => {
  try {
    const { id } = c.req.valid('param')
    const customization = c.req.valid('json')

    // Get Chain Node data
    const chainNodeData = await redis.get(`chain_node:${id}`)
    if (!chainNodeData) {
      return c.json({ error: 'Chain Node not found' }, 404)
    }

    const nodeInfo = JSON.parse(chainNodeData)

    // Check cloning permissions
    if (!nodeInfo.isPublic && !customization.reusabilityRights) {
      return c.json({ error: 'Chain Node cloning not permitted - commercial license required' }, 403)
    }

    // Create clone
    const cloneId = crypto.randomUUID()
    const clonedData = {
      ...nodeInfo,
      id: cloneId,
      originalNodeId: nodeInfo.originalNodeId, // Keep reference to original CAG node
      lockingTimestamp: Date.now(),
      usageCount: 0,
      revenue: 0,
      ...customization.reusabilityRights
    }

    // Store cloned Chain Node
    await redis.set(`chain_node:${cloneId}`, JSON.stringify(clonedData))
    await redis.sadd('chain_nodes', cloneId)

    return c.json({
      clonedChainNode: clonedData,
      message: 'Chain Node cloned successfully'
    }, 201)
  } catch (error) {
    console.error('Chain Node cloning failed:', error)
    return c.json({ 
      error: 'Cloning failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 400)
  }
}) 