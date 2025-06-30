import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { eq, desc, and, ilike } from 'drizzle-orm'
import { db } from '../db/client.js'
import { cagNodes, type CAGNode, type NewCAGNode } from '../db/schema.js'
import { RedisService } from '../services/redis.js'
import { CAGNode as CAGNodeClass } from '../../../../packages/core/src/node/CAGNode.js'
import { IPFSService } from '../services/ipfs.js'

const redis = RedisService.getInstance()
const ipfs = IPFSService.getInstance()

export const nodesRouter = new OpenAPIHono()

// ==================== SCHEMAS ====================

const NodeSchema = z.object({
  id: z.string().uuid(),
  headerHash: z.string(),
  nodeType: z.enum(['nano', 'small', 'medium', 'large', 'xlarge']),
  domain: z.string(),
  subdomains: z.array(z.string()),
  expertiseLevel: z.number().min(0).max(1),
  maxTokens: z.number(),
  currentUsage: z.number(),
  status: z.enum(['initializing', 'active', 'busy', 'error', 'offline']),
  avgResponseTime: z.number(),
  tokenEfficiency: z.number(),
  successRate: z.number(),
  knowledgeHash: z.string().optional(),
  contextHashes: z.array(z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})

const CreateNodeSchema = z.object({
  nodeType: z.enum(['nano', 'small', 'medium', 'large', 'xlarge']),
  domain: z.string().min(1),
  subdomains: z.array(z.string()).optional(),
  expertiseLevel: z.number().min(0).max(1).optional(),
  openaiApiKey: z.string().min(1)
})

const NodeUpdateSchema = z.object({
  status: z.enum(['active', 'busy', 'offline']).optional(),
  currentUsage: z.number().optional(),
  avgResponseTime: z.number().optional(),
  tokenEfficiency: z.number().optional(),
  successRate: z.number().optional()
})

// ==================== ROUTES ====================

// GET /api/v1/nodes - List all nodes
const listNodesRoute = createRoute({
  method: 'get',
  path: '/',
  summary: 'List CAG nodes',
  description: 'Retrieve a list of all CAG nodes with optional filtering',
  request: {
    query: z.object({
      domain: z.string().optional(),
      status: z.enum(['initializing', 'active', 'busy', 'error', 'offline']).optional(),
      nodeType: z.enum(['nano', 'small', 'medium', 'large', 'xlarge']).optional(),
      limit: z.string().regex(/^\d+$/).transform(Number).optional(),
      offset: z.string().regex(/^\d+$/).transform(Number).optional()
    })
  },
  responses: {
    200: {
      description: 'List of CAG nodes',
      content: {
        'application/json': {
          schema: z.object({
            nodes: z.array(NodeSchema),
            total: z.number(),
            limit: z.number(),
            offset: z.number()
          })
        }
      }
    }
  }
})

nodesRouter.openapi(listNodesRoute, async (c) => {
  try {
    const { domain, status, nodeType, limit = 50, offset = 0 } = c.req.valid('query')
    
    // Get active nodes from Redis
    const activeNodeIds = await redis.getActiveNodes()
    const nodePromises = activeNodeIds.map(id => redis.getNode(id))
    const nodeData = await Promise.all(nodePromises)
    
    let filteredNodes = nodeData.filter(Boolean)
    
    // Apply filters
    if (domain) {
      filteredNodes = filteredNodes.filter(node => 
        node.domain.toLowerCase().includes(domain.toLowerCase())
      )
    }
    
    if (status) {
      filteredNodes = filteredNodes.filter(node => node.status === status)
    }
    
    if (nodeType) {
      filteredNodes = filteredNodes.filter(node => node.nodeType === nodeType)
    }
    
    // Pagination
    const total = filteredNodes.length
    const paginatedNodes = filteredNodes.slice(offset, offset + limit)
    
    return c.json({
      nodes: paginatedNodes,
      total,
      limit,
      offset
    })
  } catch (error) {
    console.error('List nodes error:', error)
    return c.json({ error: 'Failed to list nodes' }, 500)
  }
})

// POST /api/v1/nodes - Create a new node
const createNodeRoute = createRoute({
  method: 'post',
  path: '/',
  summary: 'Create CAG node',
  description: 'Create a new CAG node with specified configuration',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateNodeSchema
        }
      }
    }
  },
  responses: {
    201: {
      description: 'CAG node created successfully',
      content: {
        'application/json': {
          schema: z.object({
            node: NodeSchema,
            message: z.string()
          })
        }
      }
    },
    400: {
      description: 'Invalid request data',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
            details: z.any().optional()
          })
        }
      }
    }
  }
})

nodesRouter.openapi(createNodeRoute, async (c) => {
  try {
    const nodeData = c.req.valid('json')
    
    // Import CAGNode class (would need to import from core package)
    // const { CAGNode } = await import('@cag-chains/core')
    
    // For now, create a mock node
    const nodeId = crypto.randomUUID()
    const now = new Date().toISOString()
    
    const newNode = {
      id: nodeId,
      headerHash: `header_${nodeId}`,
      nodeType: nodeData.nodeType,
      domain: nodeData.domain,
      subdomains: nodeData.subdomains || [],
      expertiseLevel: nodeData.expertiseLevel || 0.7,
      maxTokens: getMaxTokensForType(nodeData.nodeType),
      currentUsage: 0,
      status: 'initializing' as const,
      avgResponseTime: 0,
      tokenEfficiency: 0,
      successRate: 1.0,
      knowledgeHash: undefined,
      contextHashes: [],
      createdAt: now,
      updatedAt: now
    }
    
    // Store in Redis
    await redis.registerNode(nodeId, newNode)
    
    // Create initial context in IPFS
    const contextHash = await ipfs.storeContext(
      { domain: nodeData.domain, initialized: true },
      {
        domain: nodeData.domain,
        expertiseLevel: nodeData.expertiseLevel || 0.7,
        tags: ['initial', 'context'],
        version: '1.0.0',
        nodeId: nodeId,
        compressed: false
      }
    )
    
    newNode.contextHashes = [contextHash]
    await redis.registerNode(nodeId, newNode)
    
    return c.json({
      node: newNode,
      message: 'CAG node created successfully'
    }, 201)
  } catch (error) {
    console.error('Create node error:', error)
    return c.json({ 
      error: 'Failed to create node', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 400)
  }
})

// GET /api/v1/nodes/:id - Get specific node
const getNodeRoute = createRoute({
  method: 'get',
  path: '/{id}',
  summary: 'Get CAG node',
  description: 'Retrieve detailed information about a specific CAG node',
  request: {
    params: z.object({
      id: z.string().uuid()
    })
  },
  responses: {
    200: {
      description: 'CAG node details',
      content: {
        'application/json': {
          schema: NodeSchema
        }
      }
    },
    404: {
      description: 'Node not found',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string()
          })
        }
      }
    }
  }
})

nodesRouter.openapi(getNodeRoute, async (c) => {
  try {
    const { id } = c.req.valid('param')
    
    const node = await redis.getNode(id)
    
    if (!node) {
      return c.json({ error: 'Node not found' }, 404)
    }
    
    return c.json(node)
  } catch (error) {
    console.error('Get node error:', error)
    return c.json({ error: 'Failed to get node' }, 500)
  }
})

// PUT /api/v1/nodes/:id - Update node
const updateNodeRoute = createRoute({
  method: 'put',
  path: '/{id}',
  summary: 'Update CAG node',
  description: 'Update CAG node status and metrics',
  request: {
    params: z.object({
      id: z.string().uuid()
    }),
    body: {
      content: {
        'application/json': {
          schema: NodeUpdateSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Node updated successfully',
      content: {
        'application/json': {
          schema: NodeSchema
        }
      }
    },
    404: {
      description: 'Node not found',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string()
          })
        }
      }
    }
  }
})

nodesRouter.openapi(updateNodeRoute, async (c) => {
  try {
    const { id } = c.req.valid('param')
    const updateData = c.req.valid('json')
    
    const existingNode = await redis.getNode(id)
    
    if (!existingNode) {
      return c.json({ error: 'Node not found' }, 404)
    }
    
    const updatedNode = {
      ...existingNode,
      ...updateData,
      updatedAt: new Date().toISOString()
    }
    
    await redis.registerNode(id, updatedNode)
    
    return c.json(updatedNode)
  } catch (error) {
    console.error('Update node error:', error)
    return c.json({ error: 'Failed to update node' }, 500)
  }
})

// DELETE /api/v1/nodes/:id - Delete node
const deleteNodeRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  summary: 'Delete CAG node',
  description: 'Remove a CAG node from the network',
  request: {
    params: z.object({
      id: z.string().uuid()
    })
  },
  responses: {
    200: {
      description: 'Node deleted successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string()
          })
        }
      }
    },
    404: {
      description: 'Node not found',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string()
          })
        }
      }
    }
  }
})

nodesRouter.openapi(deleteNodeRoute, async (c) => {
  try {
    const { id } = c.req.valid('param')
    
    const existingNode = await redis.getNode(id)
    
    if (!existingNode) {
      return c.json({ error: 'Node not found' }, 404)
    }
    
    // Remove from Redis
    await redis.del(`node:${id}`)
    
    // Optionally unpin IPFS content
    if (existingNode.contextHashes) {
      for (const hash of existingNode.contextHashes) {
        await ipfs.unpin(hash)
      }
    }
    
    return c.json({ message: 'Node deleted successfully' })
  } catch (error) {
    console.error('Delete node error:', error)
    return c.json({ error: 'Failed to delete node' }, 500)
  }
})

// POST /api/v1/nodes/:id/heartbeat - Send heartbeat
const heartbeatRoute = createRoute({
  method: 'post',
  path: '/{id}/heartbeat',
  summary: 'Node heartbeat',
  description: 'Send heartbeat signal from CAG node',
  request: {
    params: z.object({
      id: z.string().uuid()
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            metrics: z.object({
              currentUsage: z.number(),
              avgResponseTime: z.number(),
              tokenEfficiency: z.number(),
              successRate: z.number()
            }).optional()
          })
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Heartbeat received',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            timestamp: z.string()
          })
        }
      }
    }
  }
})

nodesRouter.openapi(heartbeatRoute, async (c) => {
  try {
    const { id } = c.req.valid('param')
    const { metrics } = c.req.valid('json')
    
    // Record heartbeat
    await redis.heartbeat(id)
    
    // Update metrics if provided
    if (metrics) {
      const existingNode = await redis.getNode(id)
      if (existingNode) {
        const updatedNode = {
          ...existingNode,
          ...metrics,
          updatedAt: new Date().toISOString()
        }
        await redis.registerNode(id, updatedNode)
      }
    }
    
    const timestamp = new Date().toISOString()
    
    return c.json({
      message: 'Heartbeat received',
      timestamp
    })
  } catch (error) {
    console.error('Heartbeat error:', error)
    return c.json({ error: 'Failed to process heartbeat' }, 500)
  }
})

// GET /api/v1/nodes/:id/context - Get node context
const getContextRoute = createRoute({
  method: 'get',
  path: '/{id}/context',
  summary: 'Get node context',
  description: 'Retrieve the current context of a CAG node from IPFS',
  request: {
    params: z.object({
      id: z.string().uuid()
    })
  },
  responses: {
    200: {
      description: 'Node context',
      content: {
        'application/json': {
          schema: z.object({
            contextHashes: z.array(z.string()),
            contexts: z.array(z.any())
          })
        }
      }
    }
  }
})

nodesRouter.openapi(getContextRoute, async (c) => {
  try {
    const { id } = c.req.valid('param')
    
    const node = await redis.getNode(id)
    if (!node) {
      return c.json({ error: 'Node not found' }, 404)
    }
    
    // Load contexts from IPFS
    const contexts = []
    for (const hash of node.contextHashes || []) {
      try {
        const context = await ipfs.loadContext(hash)
        contexts.push(context)
      } catch (error) {
        console.warn(`Failed to load context ${hash}:`, error)
      }
    }
    
    return c.json({
      contextHashes: node.contextHashes || [],
      contexts
    })
  } catch (error) {
    console.error('Get context error:', error)
    return c.json({ error: 'Failed to get context' }, 500)
  }
})

// ==================== HELPER FUNCTIONS ====================

function getMaxTokensForType(nodeType: string): number {
  const tokenLimits = {
    nano: 4000,
    small: 16000,
    medium: 32000,
    large: 64000,
    xlarge: 128000
  }
  return tokenLimits[nodeType as keyof typeof tokenLimits] || 32000
} 
