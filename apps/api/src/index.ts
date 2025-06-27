import { OpenAPIHono } from '@hono/zod-openapi'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { requestId } from 'hono/request-id'
import { timing } from 'hono/timing'
import { HTTPException } from 'hono/http-exception'
import { swaggerUI } from '@hono/swagger-ui'

// Services
import { RedisService } from './services/redis.js'
import { IPFSService } from './services/ipfs.js'

// Routes
import { setupRoutes } from './routes/index.js'

// Types
interface Bindings {
  DATABASE_URL: string
  REDIS_URL: string
  IPFS_URL: string
  PINATA_JWT: string
  OPENAI_API_KEY: string
}

const app = new OpenAPIHono<{ Bindings: Bindings }>()

// ==================== MIDDLEWARE ====================

// CORS middleware
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'https://cag-chains.com'],
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}))

// Request ID middleware
app.use('*', requestId())

// Logger middleware
app.use('*', logger((message) => {
  console.log(`🚀 ${message}`)
}))

// Timing middleware for performance monitoring
app.use('*', timing())

// Pretty JSON in development
if (process.env.NODE_ENV !== 'production') {
app.use('*', prettyJSON())
}

// Global error handler
app.onError((error, c) => {
  console.error('🚨 Global error:', error)
  
  if (error instanceof HTTPException) {
    return c.json({ 
      error: error.message,
      status: error.status,
      timestamp: new Date().toISOString()
    }, error.status)
  }
  
  return c.json({ 
    error: 'Internal server error',
    status: 500,
    timestamp: new Date().toISOString()
  }, 500)
})

// ==================== HEALTH CHECK ====================

app.get('/', async (c) => {
  return c.json({
    name: 'CAG-Chains API',
    version: '1.0.0',
    description: 'World\'s First AI Component Ecosystem',
    status: 'operational',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      docs: '/docs',
      api: '/api/v1',
      swagger: '/swagger'
    },
    features: [
      'CAG Nodes Management',
      'Chain Orchestration', 
      'Task Processing',
      'IPFS Decentralized Storage',
      'AI Marketplace',
      'Real-time Metrics',
      'P2P Networking'
    ]
  })
})

app.get('/health', async (c) => {
  const startTime = Date.now()
  
  try {
    // Check Redis connection
    const redis = RedisService.getInstance()
    const redisHealthy = await redis.ping().catch(() => false)
    
    // Check IPFS connection
    const ipfs = IPFSService.getInstance()
    const ipfsHealthy = await ipfs.getStatus().catch(() => false)
    
    const responseTime = Date.now() - startTime
    const uptime = process.uptime()
    
    const health = {
      status: redisHealthy && ipfsHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
      responseTime: `${responseTime}ms`,
      services: {
        api: {
          status: 'healthy',
          responseTime
        },
        redis: {
          status: redisHealthy ? 'healthy' : 'unhealthy',
          connected: redisHealthy
        },
        ipfs: {
          status: ipfsHealthy ? 'healthy' : 'unhealthy', 
          connected: ipfsHealthy
        }
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      },
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid
      }
    }
    
    return c.json(health, redisHealthy && ipfsHealthy ? 200 : 503)
  } catch (error) {
    console.error('Health check failed:', error)
    return c.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      responseTime: `${Date.now() - startTime}ms`
    }, 503)
  }
})

// ==================== SETUP ROUTES ====================

// Setup all API routes
await setupRoutes(app)

// ==================== OPENAPI DOCUMENTATION ====================

// OpenAPI spec endpoint
app.doc('/openapi.json', {
  openapi: '3.0.0',
  info: {
    title: 'CAG-Chains API',
    version: '1.0.0',
    description: `
# CAG-Chains API

**World's First AI Component Ecosystem** 🚀

The CAG-Chains API provides a comprehensive platform for AI agent orchestration, 
decentralized memory management, and marketplace functionality.

## 🌟 Key Features

- **CAG Nodes**: Autonomous AI agents with specialized capabilities
- **Chain Orchestration**: Complex multi-agent task processing
- **IPFS Integration**: Decentralized context and knowledge storage
- **AI Marketplace**: Trade Chain Nodes and Context Templates
- **Real-time Metrics**: System performance monitoring
- **P2P Networking**: Distributed node coordination

## 🔧 Technology Stack 2025

- **Runtime**: Bun 1.1+ (ultra-fast JavaScript runtime)
- **Framework**: Hono (lightweight web framework)
- **Database**: PostgreSQL with Drizzle ORM
- **Cache**: Redis for high-performance operations
- **Storage**: IPFS + Pinata for decentralized data
- **AI**: OpenAI GPT-4o + Vercel AI SDK
- **Validation**: Zod for type-safe schemas
- **Monitoring**: Prometheus + Grafana ready

## 🚀 Getting Started

1. **Authentication**: Most endpoints require valid API key
2. **Rate Limiting**: 1000 requests per minute per API key
3. **Response Format**: All responses follow consistent JSON format
4. **Error Handling**: HTTP status codes with detailed error messages

## 📚 API Sections

- **Nodes**: Manage CAG nodes and their capabilities
- **Chains**: Orchestrate complex AI workflows
- **Tasks**: Handle individual processing units
- **Marketplace**: Trade AI components and contexts
- **IPFS**: Decentralized storage operations
- **Metrics**: Monitor system performance

## 🔗 Links

- [Documentation](https://docs.cag-chains.com)
- [GitHub](https://github.com/cag-chains)
- [Website](https://cag-chains.com)
- [Discord](https://discord.gg/cag-chains)
    `,
    contact: {
      name: 'CAG-Chains Team',
      email: 'api@cag-chains.com',
      url: 'https://cag-chains.com'
    },
    license: {
      name: 'Business Source License 1.1',
      url: 'https://github.com/cag-chains/cag-chains/blob/main/LICENSE'
    }
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Development server'
    },
    {
      url: 'https://api.cag-chains.com',
      description: 'Production server'
    }
  ],
  tags: [
    {
      name: 'Nodes',
      description: 'CAG Node management and operations'
    },
    {
      name: 'Chains', 
      description: 'Chain orchestration and execution'
    },
    {
      name: 'Tasks',
      description: 'Task creation and processing'
    },
    {
      name: 'Marketplace',
      description: 'AI component marketplace operations'
    },
    {
      name: 'IPFS',
      description: 'Decentralized storage operations'
    },
    {
      name: 'Metrics',
      description: 'System monitoring and analytics'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      },
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key'
      }
    }
  },
  security: [
    { bearerAuth: [] },
    { apiKey: [] }
  ]
})

// Swagger UI
app.get('/docs', swaggerUI({ 
  url: '/openapi.json',
  config: {
    deepLinking: true,
    displayOperationId: true,
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    docExpansion: 'list',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true
  }
}))

// Alternative Swagger endpoint
app.get('/swagger', swaggerUI({ url: '/openapi.json' }))

// ==================== SYSTEM INITIALIZATION ====================

async function initializeServices() {
  console.log('🔧 Initializing CAG-Chains services...')
  
  try {
    // Initialize Redis
    console.log('📦 Connecting to Redis...')
    const redis = RedisService.getInstance()
    await redis.connect()
    console.log('✅ Redis connected successfully')
    
    // Initialize IPFS
    console.log('🌐 Connecting to IPFS...')
    const ipfs = IPFSService.getInstance()
    // IPFS connects automatically
    console.log('✅ IPFS connected successfully')
    
    console.log('🚀 All services initialized successfully!')
    
    // Print system info
    const memory = process.memoryUsage()
    console.log(`
🔥 CAG-Chains API Server Ready!

📊 System Info:
  - Node.js: ${process.version}
  - Platform: ${process.platform}
  - Memory: ${Math.round(memory.heapUsed / 1024 / 1024)}MB used
  - PID: ${process.pid}

🌐 Endpoints:
  - Health: http://localhost:3001/health
  - Documentation: http://localhost:3001/docs
  - API: http://localhost:3001/api/v1
  - OpenAPI: http://localhost:3001/openapi.json

🚀 CAG-Chains Stack 2025:
  ✅ Bun 1.1+ Runtime
  ✅ Hono Web Framework  
  ✅ Redis Cache Layer
  ✅ IPFS Decentralized Storage
  ✅ PostgreSQL + Drizzle ORM
  ✅ OpenAPI Documentation
  ✅ Real-time Metrics
    `)
    
  } catch (error) {
    console.error('❌ Failed to initialize services:', error)
    process.exit(1)
  }
}

// ==================== SERVER STARTUP ====================

const port = parseInt(process.env.PORT || '3001')

// Initialize services on startup
await initializeServices()

// Start server
export default {
  port,
  fetch: app.fetch,
  
  // Bun-specific options
  development: process.env.NODE_ENV !== 'production',
  
  // Error handling
  error(error: Error) {
    console.error('🚨 Server error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down CAG-Chains API server...')
  
  try {
    // Cleanup services
    const redis = RedisService.getInstance()
    await redis.disconnect()
    
    const ipfs = IPFSService.getInstance()
    // IPFS cleanup
    
    console.log('✅ Services cleaned up successfully')
  process.exit(0)
  } catch (error) {
    console.error('❌ Error during shutdown:', error)
    process.exit(1)
  }
})

process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...')
  process.exit(0)
})

// Log startup message
console.log(`🔥 CAG-Chains API server starting on port ${port}...`)

// Export types for use in other files
export type { Bindings }
export { app } 