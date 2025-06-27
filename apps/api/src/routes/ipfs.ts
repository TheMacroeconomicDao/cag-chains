import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { IPFSService } from '../services/ipfs.js'
import { RedisService } from '../services/redis.js'

const ipfs = IPFSService.getInstance()
const redis = RedisService.getInstance()

export const ipfsRouter = new OpenAPIHono()

// ==================== SCHEMAS ====================

const IPFSContentSchema = z.object({
  hash: z.string(),
  size: z.number(),
  contentType: z.string(),
  domain: z.string().optional(),
  tags: z.array(z.string()),
  quality: z.number(),
  popularity: z.number(),
  pinned: z.boolean(),
  nodeId: z.string().uuid().optional(),
  createdAt: z.string().datetime()
})

// ==================== ROUTES ====================

// GET /api/v1/ipfs/stats - IPFS statistics
const getIPFSStatsRoute = createRoute({
  method: 'get',
  path: '/stats',
  summary: 'Get IPFS statistics',
  description: 'Retrieve IPFS network and storage statistics',
  responses: {
    200: {
      description: 'IPFS statistics',
      content: {
        'application/json': {
          schema: z.object({
            totalContent: z.number(),
            totalSize: z.number(),
            pinnedContent: z.number(),
            storageUsed: z.number(),
            connected: z.boolean(),
            domainDistribution: z.record(z.string(), z.number())
          })
        }
      }
    }
  }
})

ipfsRouter.openapi(getIPFSStatsRoute, async (c) => {
  try {
    const stats = await ipfs.getStats()
    
    return c.json({
      totalContent: stats.totalContent,
      totalSize: stats.totalSize,
      pinnedContent: stats.pinnedContent,
      storageUsed: stats.storageUsed,
      connected: stats.connected,
      domainDistribution: stats.domainDistribution
    })
  } catch (error) {
    console.error('Get IPFS stats error:', error)
    return c.json({ error: 'Failed to get IPFS statistics' }, 500)
  }
})

// POST /api/v1/ipfs/upload - Upload content to IPFS
const uploadContentRoute = createRoute({
  method: 'post',
  path: '/upload',
  summary: 'Upload content to IPFS',
  description: 'Upload arbitrary content to IPFS with metadata',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            content: z.any(),
            contentType: z.string().optional(),
            domain: z.string().optional(),
            tags: z.array(z.string()).optional(),
            pin: z.boolean().optional()
          })
        }
      }
    }
  },
  responses: {
    201: {
      description: 'Content uploaded successfully',
      content: {
        'application/json': {
          schema: z.object({
            hash: z.string(),
            size: z.number(),
            url: z.string(),
            message: z.string()
          })
        }
      }
    }
  }
})

ipfsRouter.openapi(uploadContentRoute, async (c) => {
  try {
    const { content, contentType = 'application/json', domain, tags = [], pin = false } = c.req.valid('json')
    
    // Upload to IPFS
    const result = await ipfs.uploadContent(content, {
      contentType,
      domain,
      tags,
      pin
    })
    
    // Store metadata in cache
    const ipfsContent = {
      hash: result.hash,
      size: result.size,
      contentType,
      domain,
      tags,
      quality: 0.8,
      popularity: 0,
      pinned: pin,
      nodeId: undefined,
      createdAt: new Date().toISOString()
    }
    
    await redis.addToIndex('ipfs_content', result.hash, ipfsContent)
    
    return c.json({
      hash: result.hash,
      size: result.size,
      url: result.url,
      message: 'Content uploaded successfully (mock mode)'
    }, 201)
  } catch (error) {
    console.error('Upload content error:', error)
    return c.json({ 
      error: 'Failed to upload content',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// GET /api/v1/ipfs/content/:hash - Get content by hash
const getContentRoute = createRoute({
  method: 'get',
  path: '/content/{hash}',
  summary: 'Get content by hash',
  description: 'Retrieve content from IPFS by hash',
  request: {
    params: z.object({
      hash: z.string()
    })
  },
  responses: {
    200: {
      description: 'Content retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({
            content: z.any(),
            metadata: z.record(z.unknown())
          })
        }
      }
    },
    404: {
      description: 'Content not found'
    }
  }
})

ipfsRouter.openapi(getContentRoute, async (c) => {
  try {
    const { hash } = c.req.valid('param')
    
    const content = await ipfs.getContent(hash)
    
    if (!content) {
      return c.json({ error: 'Content not found' }, 404)
    }
    
    return c.json({
      content,
      metadata: {
        hash,
        retrieved_at: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Get content error:', error)
    return c.json({ error: 'Failed to retrieve content' }, 500)
  }
})

// POST /api/v1/ipfs/pin/:hash - Pin content
const pinContentRoute = createRoute({
  method: 'post',
  path: '/pin/{hash}',
  summary: 'Pin content',
  description: 'Pin content to prevent garbage collection',
  request: {
    params: z.object({
      hash: z.string()
    })
  },
  responses: {
    200: {
      description: 'Content pinned successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            hash: z.string()
          })
        }
      }
    }
  }
})

ipfsRouter.openapi(pinContentRoute, async (c) => {
  try {
    const { hash } = c.req.valid('param')
    
    const success = await ipfs.pinContent(hash)
    
    if (success) {
      return c.json({
        message: 'Content pinned successfully',
        hash
      })
    } else {
      return c.json({ error: 'Content not found or already pinned' }, 404)
    }
  } catch (error) {
    console.error('Pin content error:', error)
    return c.json({ error: 'Failed to pin content' }, 500)
  }
}) 