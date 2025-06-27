#!/usr/bin/env bun

/**
 * CAG-Chains A2A Demo - Agent-to-Agent Protocol Integration
 * 
 * Демонстрирует как CAG Nodes и Chain Nodes могут общаться через A2A протокол:
 * 1. Регистрация агентов в A2A
 * 2. Обнаружение агентов по доменам
 * 3. Делегирование задач между агентами
 * 4. Интеграция с Oracle для автоматического выбора агентов
 */

import { CAGNode, QualityController, ChainNode } from '@cag-chains/core/node'
import { A2AService } from '@cag-chains/core/a2a'
import { Oracle } from '@cag-chains/core/oracle'

async function runA2ADemo() {
  console.log('🤝 CAG-Chains A2A Protocol Demo\n')

  try {
    // ==================== 1. СОЗДАНИЕ АГЕНТОВ ====================
    console.log('📦 Step 1: Creating specialized agents...\n')

    const frontendExpert = new CAGNode({
      domain: 'frontend',
      subdomains: ['react', 'typescript', 'css'],
      nodeType: 'medium',
      expertiseLevel: 0.85,
      openaiApiKey: process.env.OPENAI_API_KEY || 'demo-key'
    })

    const backendExpert = new CAGNode({
      domain: 'backend',
      subdomains: ['api', 'database', 'performance'],
      nodeType: 'large',
      expertiseLevel: 0.9,
      openaiApiKey: process.env.OPENAI_API_KEY || 'demo-key'
    })

    const dataExpert = new CAGNode({
      domain: 'data-science',
      subdomains: ['analytics', 'ml', 'visualization'],
      nodeType: 'large',
      expertiseLevel: 0.88,
      openaiApiKey: process.env.OPENAI_API_KEY || 'demo-key'
    })

    console.log('✅ Created CAG Nodes:')
    console.log(`   - Frontend Expert: ${frontendExpert.getState().id}`)
    console.log(`   - Backend Expert: ${backendExpert.getState().id}`)
    console.log(`   - Data Science Expert: ${dataExpert.getState().id}\n`)

    // ==================== 2. A2A REGISTRATION ====================
    console.log('🤝 Step 2: Registering agents with A2A Service...\n')

    const a2aService = A2AService.getInstance()

    const frontendAgentId = await a2aService.registerCAGNode(
      frontendExpert, 
      'http://localhost:3001/api/v1/agents/frontend'
    )

    const backendAgentId = await a2aService.registerCAGNode(
      backendExpert, 
      'http://localhost:3001/api/v1/agents/backend'
    )

    const dataAgentId = await a2aService.registerCAGNode(
      dataExpert, 
      'http://localhost:3001/api/v1/agents/data'
    )

    console.log('✅ A2A Agents registered:')
    console.log(`   - Frontend: ${frontendAgentId}`)
    console.log(`   - Backend: ${backendAgentId}`)
    console.log(`   - Data Science: ${dataAgentId}\n`)

    // ==================== 3. AGENT DISCOVERY ====================
    console.log('🔍 Step 3: Discovering agents by domain...\n')

    const frontendAgents = a2aService.discoverAgentsByDomain('frontend')
    const backendAgents = a2aService.discoverAgentsByDomain('backend')
    const allAgents = a2aService.getAllAgents()

    console.log('🎯 Agent Discovery Results:')
    console.log(`   Frontend agents found: ${frontendAgents.length}`)
    console.log(`   Backend agents found: ${backendAgents.length}`)
    console.log(`   Total registered agents: ${allAgents.length}`)

    allAgents.forEach(({ agentId, card }) => {
      console.log(`   - ${card.name} (${agentId})`)
      console.log(`     Skills: ${card.versions[0]?.skills?.map(s => s.name).join(', ') || 'General'}`)
    })
    console.log()

    // ==================== 4. INTER-AGENT TASK DELEGATION ====================
    console.log('⚡ Step 4: Inter-agent task delegation...\n')

    // Frontend агент просит помощи у backend агента
    console.log('🔄 Frontend → Backend delegation:')
    const apiTask = await a2aService.sendTask(
      backendAgentId,
      'Create a REST API endpoint for user authentication with JWT tokens',
      { delegated_by: frontendAgentId, priority: 'high' }
    )

    console.log(`   Task ID: ${apiTask.task_id}`)
    console.log(`   Status: ${apiTask.status}`)
    console.log(`   Backend response: ${apiTask.messages[1]?.parts[0]?.text || 'Processing...'}`)
    console.log()

    // Backend агент просит помощи у data агента
    console.log('🔄 Backend → Data Science delegation:')
    const analyticsTask = await a2aService.sendTask(
      dataAgentId,
      'Analyze user behavior patterns and generate insights for API optimization',
      { delegated_by: backendAgentId, priority: 'medium' }
    )

    console.log(`   Task ID: ${analyticsTask.task_id}`)
    console.log(`   Status: ${analyticsTask.status}`)
    console.log(`   Data analysis response: ${analyticsTask.messages[1]?.parts[0]?.text || 'Processing...'}`)
    console.log()

    // ==================== 5. ORACLE + A2A INTEGRATION ====================
    console.log('🔮 Step 5: Oracle-powered automatic task delegation...\n')

    const oracle = new Oracle({
      optimizationStrategy: 'balanced',
      maxChainSize: 5,
      maxConcurrentChains: 10
    })

    // Регистрируем агентов в Oracle для автоматического выбора
    oracle.registerNode(frontendExpert)
    oracle.registerNode(backendExpert)
    oracle.registerNode(dataExpert)

    const complexTask = "Build a complete e-commerce dashboard with real-time analytics, user management, and payment processing"

    console.log('📋 Complex Task:', complexTask)
    console.log()

    const oracleResult = await oracle.processRequest(complexTask, {
      framework: 'React',
      backend: 'Node.js',
      database: 'PostgreSQL',
      analytics: 'required'
    })

    console.log('🧠 Oracle Analysis & A2A Delegation Plan:')
    console.log(`   Complexity: ${oracleResult.analysis.complexity}/10`)
    console.log(`   Required Domains: ${oracleResult.analysis.requiredDomains.join(', ')}`)
    console.log(`   Subtasks: ${oracleResult.analysis.decomposition.length}`)
    console.log()

    // Автоматическое делегирование через A2A
    const delegationResults = []
    
    for (const subtask of oracleResult.analysis.decomposition) {
      const requiredDomain = subtask.domain
      console.log(`🎯 Delegating "${subtask.description}" to ${requiredDomain} specialist...`)
      
      const delegationResult = await a2aService.delegateToSpecializedAgent(
        subtask.description,
        requiredDomain
      )
      
      if (delegationResult) {
        delegationResults.push(delegationResult)
        console.log(`   ✅ Delegated to A2A agent (Task: ${delegationResult.task_id})`)
        console.log(`   Response: ${delegationResult.messages[1]?.parts[0]?.text?.substring(0, 100) || 'Processing...'}...`)
      } else {
        console.log(`   ❌ No suitable A2A agent found for ${requiredDomain}`)
      }
      console.log()
    }

    // ==================== 6. CHAIN NODE A2A INTEGRATION ====================
    console.log('🔒 Step 6: Chain Node A2A integration...\n')

    // Создаем Chain Node из качественного CAG Node
    const qualityController = new QualityController()
    const frontendAssessment = await qualityController.assessNodeQuality(frontendExpert)
    
    if (frontendAssessment.isEligible) {
      const frontendChainNode = await qualityController.lockAsChainNode(frontendExpert, {
        reusabilityRights: {
          isPublic: true,
          isCommercial: false,
          licenseType: 'open'
        }
      })

      // Регистрируем Chain Node в A2A
      const chainAgentId = await a2aService.registerChainNode(
        frontendChainNode,
        'http://localhost:3001/api/v1/chain-agents/frontend'
      )

      console.log(`🔒 Chain Node registered as A2A agent: ${chainAgentId}`)
      
      // Тестируем выполнение задачи через A2A с гарантированным качеством
      const chainTask = await a2aService.sendTask(
        chainAgentId,
        'Create a production-ready React component with TypeScript and comprehensive error handling',
        { quality_guaranteed: true, commercial_use: false }
      )

      console.log(`   Chain Node Task: ${chainTask.task_id}`)
      console.log(`   Guaranteed Quality: ${chainTask.status === 'completed' ? '✅' : '⏳'}`)
      console.log(`   Response: ${chainTask.messages[1]?.parts[0]?.text?.substring(0, 100) || 'Processing...'}...`)
      console.log()
    }

    // ==================== 7. A2A MARKETPLACE SIMULATION ====================
    console.log('🏪 Step 7: A2A Agent Marketplace...\n')

    const marketplaceAgents = a2aService.getAllAgents()
    
    console.log('📋 Available A2A Agents in Marketplace:')
    marketplaceAgents.forEach(({ agentId, card }, index) => {
      console.log(`   ${index + 1}. ${card.name}`)
      console.log(`      Agent ID: ${agentId}`)
      console.log(`      Endpoint: ${card.versions[0]?.endpoint}`)
      console.log(`      Auth: ${card.versions[0]?.auth.type}`)
      console.log(`      Skills: ${card.versions[0]?.skills?.length || 0} capabilities`)
      console.log(`      Streaming: ${card.versions[0]?.supports_streaming ? 'Yes' : 'No'}`)
      console.log()
    })

    // ==================== 8. TASK STATUS MONITORING ====================
    console.log('📊 Step 8: Task status monitoring...\n')

    const allTasks = [apiTask, analyticsTask, ...delegationResults].filter(Boolean)
    
    console.log('📈 A2A Task Summary:')
    console.log(`   Total tasks executed: ${allTasks.length}`)
    
    const statusCounts = allTasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    Object.entries(statusCounts).forEach(([status, count]) => {
      const emoji = status === 'completed' ? '✅' : status === 'working' ? '⏳' : status === 'failed' ? '❌' : '🔄'
      console.log(`   ${emoji} ${status}: ${count}`)
    })
    console.log()

    console.log('🎉 A2A Demo completed successfully!')
    console.log('\n🚀 Key Achievements:')
    console.log('   ✅ CAG Nodes registered as A2A-compatible agents')
    console.log('   ✅ Agent discovery by domain and capabilities')
    console.log('   ✅ Inter-agent task delegation and communication')
    console.log('   ✅ Oracle-powered automatic agent selection')
    console.log('   ✅ Chain Node integration with guaranteed quality')
    console.log('   ✅ A2A marketplace for agent discovery')
    console.log('   ✅ Real-time task status monitoring')
    console.log()
    console.log('💡 Next Steps:')
    console.log('   - Implement streaming responses for long-running tasks')
    console.log('   - Add authentication and authorization for commercial agents')
    console.log('   - Create A2A client SDKs for external integration')
    console.log('   - Build visual agent orchestration interface')

  } catch (error) {
    console.error('❌ A2A Demo failed:', error)
    process.exit(1)
  }
}

// Run demo if this file is executed directly
if (import.meta.main) {
  runA2ADemo()
} 