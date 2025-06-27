import { OpenAPIHono } from '@hono/zod-openapi'
import { nodesRouter } from './nodes.js'
import { chainNodesRouter } from './chain-nodes.js'
import { oracleRouter } from './oracle.js'
import { chainsRouter } from './chains.js'
import { tasksRouter } from './tasks.js'
import { marketplaceRouter } from './marketplace.js'
import { metricsRouter } from './metrics.js'
import { ipfsRouter } from './ipfs.js'
import { a2aRouter } from './a2a.js'

export async function setupRoutes(app: OpenAPIHono) {
  // ==================== API V1 ROUTES ====================
  
  // CAG Nodes management
  app.route('/api/v1/nodes', nodesRouter)
  
  // Chain Nodes - locked immutable AI components
  app.route('/api/v1/chain-nodes', chainNodesRouter)
  
  // Oracle - intelligent task planning and chain optimization
  app.route('/api/v1/oracle', oracleRouter)
  
  // A2A - Agent-to-Agent protocol for inter-agent communication
  app.route('/api/v1/a2a', a2aRouter)
  
  // CAG Chains orchestration
  app.route('/api/v1/chains', chainsRouter)
  
  // Task management
  app.route('/api/v1/tasks', tasksRouter)
  
  // Marketplace for Chain Nodes and Context Templates
  app.route('/api/v1/marketplace', marketplaceRouter)
  
  // System metrics and monitoring
  app.route('/api/v1/metrics', metricsRouter)
  
  // IPFS decentralized storage operations
  app.route('/api/v1/ipfs', ipfsRouter)
  
  console.log('✅ All API routes configured:')
  console.log('   📦 /api/v1/nodes - CAG Nodes Management')
  console.log('   🔒 /api/v1/chain-nodes - Chain Nodes (MVP)')
  console.log('   🔮 /api/v1/oracle - Task Planning & Optimization')
  console.log('   🤝 /api/v1/a2a - Agent-to-Agent Protocol')
  console.log('   🔗 /api/v1/chains - Chain Orchestration')
  console.log('   ✅ /api/v1/tasks - Task Processing')
  console.log('   🏪 /api/v1/marketplace - AI Marketplace')
  console.log('   📊 /api/v1/metrics - System Monitoring')
  console.log('   🌐 /api/v1/ipfs - Decentralized Storage')
}
