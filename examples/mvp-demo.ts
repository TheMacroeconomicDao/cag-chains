#!/usr/bin/env bun

/**
 * CAG-Chains MVP Demo - Chain Nodes without IPFS
 * 
 * Демонстрирует полный цикл:
 * 1. Создание CAG Node
 * 2. Качественная оценка
 * 3. Блокировка в Chain Node
 * 4. Выполнение задач
 * 5. Клонирование Chain Node
 */

import { CAGNode, QualityController } from '@cag-chains/core/node'
import { Oracle } from '@cag-chains/core/oracle'

async function runMVPDemo() {
  console.log('🚀 CAG-Chains MVP Demo - Chain Nodes System\n')

  try {
    // ==================== 1. СОЗДАНИЕ CAG NODES ====================
    console.log('📦 Step 1: Creating specialized CAG Nodes...\n')

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

    console.log('✅ Created CAG Nodes:')
    console.log(`   - Frontend Expert: ${frontendExpert.getState().id}`)
    console.log(`   - Backend Expert: ${backendExpert.getState().id}\n`)

    // ==================== 2. QUALITY ASSESSMENT ====================
    console.log('🎯 Step 2: Quality Assessment for Chain Node eligibility...\n')

    const qualityController = new QualityController()

    // Assess frontend expert
    console.log('🔍 Assessing Frontend Expert...')
    const frontendAssessment = await qualityController.assessNodeQuality(frontendExpert)
    
    console.log(`   Score: ${Math.round(frontendAssessment.score * 100)}%`)
    console.log(`   Eligible: ${frontendAssessment.isEligible ? '✅ YES' : '❌ NO'}`)
    if (frontendAssessment.recommendations.length > 0) {
      console.log('   Recommendations:')
      frontendAssessment.recommendations.forEach(rec => console.log(`     - ${rec}`))
    }
    console.log()

    // Assess backend expert
    console.log('🔍 Assessing Backend Expert...')
    const backendAssessment = await qualityController.assessNodeQuality(backendExpert)
    
    console.log(`   Score: ${Math.round(backendAssessment.score * 100)}%`)
    console.log(`   Eligible: ${backendAssessment.isEligible ? '✅ YES' : '❌ NO'}`)
    if (backendAssessment.recommendations.length > 0) {
      console.log('   Recommendations:')
      backendAssessment.recommendations.forEach(rec => console.log(`     - ${rec}`))
    }
    console.log()

    // ==================== 3. CHAIN NODE LOCKING ====================
    console.log('🔒 Step 3: Locking qualified nodes as Chain Nodes...\n')

    let frontendChainNode = null
    let backendChainNode = null

    if (frontendAssessment.isEligible) {
      try {
        frontendChainNode = await qualityController.lockAsChainNode(frontendExpert, {
          reusabilityRights: {
            isPublic: true,
            isCommercial: false,
            licenseType: 'open'
          }
        })
        console.log(`✅ Frontend Chain Node created: ${frontendChainNode.getId()}`)
        console.log(`   Capabilities: ${frontendChainNode.getCapabilities().join(', ')}`)
        console.log()
      } catch (error) {
        console.log(`❌ Frontend locking failed: ${error}`)
      }
    }

    if (backendAssessment.isEligible) {
      try {
        backendChainNode = await qualityController.lockAsChainNode(backendExpert, {
          reusabilityRights: {
            isPublic: true,
            isCommercial: true,
            licenseType: 'commercial',
            pricePerUse: 0.50
          }
        })
        console.log(`✅ Backend Chain Node created: ${backendChainNode.getId()}`)
        console.log(`   Capabilities: ${backendChainNode.getCapabilities().join(', ')}`)
        console.log(`   Commercial: $${backendChainNode.getPrice()}/use`)
        console.log()
      } catch (error) {
        console.log(`❌ Backend locking failed: ${error}`)
      }
    }

    // ==================== 4. ORACLE TASK PLANNING ====================
    console.log('🔮 Step 4: Oracle task analysis and chain planning...\n')

    const oracle = new Oracle({
      optimizationStrategy: 'balanced',
      maxChainSize: 5,
      maxConcurrentChains: 10,
      nodeDiscoveryTimeout: 5000,
      taskTimeout: 60000
    })

    const complexTask = "Build a full-stack React application with user authentication, real-time chat, and PostgreSQL database"

    console.log('📋 Complex Task:', complexTask)
    console.log()

    const oracleResult = await oracle.processRequest(complexTask, {
      framework: 'React',
      backend: 'Node.js',
      database: 'PostgreSQL',
      realtime: true
    })

    console.log('🧠 Oracle Analysis:')
    console.log(`   Complexity: ${oracleResult.analysis.complexity}/10`)
    console.log(`   Required Domains: ${oracleResult.analysis.requiredDomains.join(', ')}`)
    console.log(`   Subtasks: ${oracleResult.analysis.decomposition.length}`)
    console.log(`   Parallelizable: ${oracleResult.analysis.parallelizable ? 'Yes' : 'No'}`)
    console.log()

    console.log('📊 Execution Plan:')
    console.log(`   Topology: ${oracleResult.plan.topology}`)
    console.log(`   Tasks: ${oracleResult.plan.tasks.length}`)
    console.log(`   Estimated Cost: $${oracleResult.plan.estimatedCost}`)
    console.log(`   Estimated Duration: ${Math.round(oracleResult.plan.estimatedDuration / 1000)}s`)
    console.log(`   Confidence: ${Math.round(oracleResult.plan.confidence * 100)}%`)
    console.log()

    if (oracleResult.recommendations.length > 0) {
      console.log('💡 Oracle Recommendations:')
      oracleResult.recommendations.forEach(rec => console.log(`   - ${rec}`))
      console.log()
    }

    // ==================== 5. CHAIN NODE EXECUTION ====================
    if (frontendChainNode) {
      console.log('⚡ Step 5: Testing Chain Node execution...\n')

      const frontendTask = {
        id: crypto.randomUUID(),
        type: 'component_creation',
        description: 'Create a responsive React login component with TypeScript',
        requirements: {
          domains: ['frontend'],
          complexity: 4,
          qualityTarget: 0.8
        },
        dependencies: [],
        context: { framework: 'React', typescript: true },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      console.log('🎯 Testing frontend task compatibility...')
      const compatibility = frontendChainNode.validateTaskCompatibility(frontendTask)
      console.log(`   Compatible: ${compatibility.isCompatible ? '✅ YES' : '❌ NO'}`)
      console.log(`   Confidence: ${Math.round(compatibility.confidence * 100)}%`)
      
      if (compatibility.reason) {
        console.log(`   Reason: ${compatibility.reason}`)
      }
      console.log()

      if (compatibility.isCompatible) {
        console.log('🚀 Executing task on Chain Node...')
        try {
          const result = await frontendChainNode.executeOptimized(frontendTask)
          console.log(`   Success: ${result.success ? '✅' : '❌'}`)
          console.log(`   Quality Score: ${Math.round(result.qualityScore * 100)}%`)
          console.log(`   Response Time: ${result.responseTime}ms`)
          console.log(`   Tokens Used: ${result.tokensUsed}`)
          console.log(`   Context Integrity: ${result.contextIntegrity ? '✅' : '❌'}`)
          console.log(`   Usage Count: ${result.reusabilityTracking.usageCount}`)
          console.log()
        } catch (error) {
          console.log(`❌ Execution failed: ${error}`)
          console.log()
        }
      }
    }

    // ==================== 6. CHAIN NODE CLONING ====================
    if (frontendChainNode) {
      console.log('🔄 Step 6: Chain Node cloning and customization...\n')

      try {
        const clonedNode = await frontendChainNode.clone({
          reusabilityRights: {
            isCommercial: true,
            pricePerUse: 0.25
          }
        })

        console.log(`✅ Cloned Chain Node: ${clonedNode.getId()}`)
        console.log(`   Original: ${frontendChainNode.getId()}`)
        console.log(`   Commercial: ${clonedNode.isCommercial() ? 'Yes' : 'No'}`)
        console.log(`   Price: $${clonedNode.getPrice()}/use`)
        console.log()
      } catch (error) {
        console.log(`❌ Cloning failed: ${error}`)
        console.log()
      }
    }

    // ==================== 7. MARKETPLACE SIMULATION ====================
    console.log('🏪 Step 7: Chain Node Marketplace simulation...\n')

    const marketplace = {
      chainNodes: []
    }

    if (frontendChainNode) {
      marketplace.chainNodes.push({
        id: frontendChainNode.getId(),
        type: 'Frontend Expert',
        domains: frontendChainNode.getMetadata().contextSnapshot.domains,
        expertise: Math.round(frontendChainNode.getMetadata().contextSnapshot.expertiseLevel * 100),
        price: frontendChainNode.getPrice() || 0,
        usage: frontendChainNode.getUsageStats().count,
        public: frontendChainNode.isPublic()
      })
    }

    if (backendChainNode) {
      marketplace.chainNodes.push({
        id: backendChainNode.getId(),
        type: 'Backend Expert',
        domains: backendChainNode.getMetadata().contextSnapshot.domains,
        expertise: Math.round(backendChainNode.getMetadata().contextSnapshot.expertiseLevel * 100),
        price: backendChainNode.getPrice() || 0,
        usage: backendChainNode.getUsageStats().count,
        public: backendChainNode.isPublic()
      })
    }

    console.log('📋 Available Chain Nodes in Marketplace:')
    marketplace.chainNodes.forEach((node, i) => {
      console.log(`   ${i + 1}. ${node.type}`)
      console.log(`      ID: ${node.id.substring(0, 8)}...`)
      console.log(`      Domains: ${node.domains.join(', ')}`)
      console.log(`      Expertise: ${node.expertise}%`)
      console.log(`      Price: ${node.price > 0 ? `$${node.price}/use` : 'Free'}`)
      console.log(`      Usage: ${node.usage} times`)
      console.log(`      Access: ${node.public ? 'Public' : 'Private'}`)
      console.log()
    })

    console.log('🎉 MVP Demo completed successfully!')
    console.log('\n📈 Key Achievements:')
    console.log('   ✅ CAG Node creation and specialization')
    console.log('   ✅ Quality-based Chain Node locking')
    console.log('   ✅ Oracle task analysis and planning')
    console.log('   ✅ Chain Node task execution')
    console.log('   ✅ Chain Node cloning and customization')
    console.log('   ✅ Marketplace-ready AI components')

  } catch (error) {
    console.error('❌ Demo failed:', error)
    process.exit(1)
  }
}

// Run demo if this file is executed directly
if (import.meta.main) {
  runMVPDemo()
} 