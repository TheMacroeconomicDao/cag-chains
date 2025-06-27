#!/usr/bin/env bun

/**
 * CAG-Chains Visualization Demo
 * Полная демонстрация системы визуализации с современными графиками и мониторингом
 */

import { MockGuard } from '../packages/core/src/guard/MockGuard.js'
import { systemVisualizer } from '../packages/core/src/visualization/SystemVisualizer.js'
import { terminalVisualizer } from '../packages/core/src/visualization/TerminalVisualizer.js'
import type { Task, A2AHeader, VisualizationEvent } from '../packages/core/src/types/index.js'

async function runVisualizationDemo() {
  console.log('🎨 CAG-Chains Visualization System Demo\\n')
  console.log('='.repeat(70))
  console.log('Современная визуализация межкомпонентного взаимодействия')
  console.log('='.repeat(70))
  console.log()

  // ==================== 1. ИНИЦИАЛИЗАЦИЯ СИСТЕМЫ ====================
  console.log('🚀 Этап 1: Инициализация системы визуализации...\\n')

  // Создаем несколько различных нод для демонстрации
  const nodeHeaders: A2AHeader[] = [
    {
      nodeId: 'chain_frontend_expert_001',
      expertDomains: ['frontend', 'react', 'typescript'],
      competenceMap: { 'frontend': 0.92, 'react': 0.95, 'typescript': 0.88 },
      capabilities: ['component-creation', 'state-management', 'ui-design'],
      contextHash: 'sha256:frontend_context_hash',
      guardThresholds: { minConfidence: 0.8, rejectBelow: 0.3 },
      blockedAt: new Date(),
      version: '1.0.0'
    },
    {
      nodeId: 'chain_backend_expert_002',
      expertDomains: ['backend', 'nodejs', 'database'],
      competenceMap: { 'backend': 0.89, 'nodejs': 0.91, 'database': 0.87 },
      capabilities: ['api-development', 'database-optimization', 'server-architecture'],
      contextHash: 'sha256:backend_context_hash',
      guardThresholds: { minConfidence: 0.8, rejectBelow: 0.3 },
      blockedAt: new Date(),
      version: '1.0.0'
    },
    {
      nodeId: 'oracle_task_distributor',
      expertDomains: ['orchestration', 'planning', 'routing'],
      competenceMap: { 'orchestration': 0.95, 'planning': 0.93, 'routing': 0.90 },
      capabilities: ['task-analysis', 'chain-planning', 'load-balancing'],
      contextHash: 'sha256:oracle_context_hash',
      guardThresholds: { minConfidence: 0.7, rejectBelow: 0.2 },
      blockedAt: new Date(),
      version: '1.0.0'
    }
  ]

  // Создаем Guards для каждой ноды
  const guards = nodeHeaders.map(header => ({
    header,
    guard: new MockGuard(header)
  }))

  console.log(`✅ Создано ${guards.length} Guard'ов для демонстрации`)
  console.log(`✅ SystemVisualizer инициализирован`)
  console.log(`✅ TerminalVisualizer готов к отображению\\n`)

  // ==================== 2. СИМУЛЯЦИЯ СОЗДАНИЯ НОД ====================
  console.log('🧠 Этап 2: Регистрация событий создания нод...\\n')

  guards.forEach(({ header }) => {
    systemVisualizer.logEvent({
      type: 'node_creation',
      nodeId: header.nodeId,
      details: {
        domains: header.expertDomains,
        capabilities: header.capabilities,
        competenceMap: header.competenceMap
      },
      performance: {
        duration: Math.random() * 50 + 10, // 10-60ms
        cost: 0.0001,
        success: true
      }
    })
  })

  // Логируем блокировку Chain нод
  guards.filter(g => g.header.nodeId.includes('chain_')).forEach(({ header }) => {
    systemVisualizer.logEvent({
      type: 'chain_lock',
      nodeId: header.nodeId,
      details: {
        lockingReason: 'Context filled to 65%',
        contextHash: header.contextHash,
        guardThresholds: header.guardThresholds
      },
      performance: {
        duration: 5,
        cost: 0,
        success: true
      }
    })
  })

  console.log('✅ События создания нод зарегистрированы\\n')

  // ==================== 3. СИМУЛЯЦИЯ ЗАДАЧ И GUARD ФИЛЬТРАЦИИ ====================
  console.log('🛡️ Этап 3: Симуляция Guard фильтрации и межкомпонентной коммуникации...\\n')

  const testTasks: Task[] = [
    {
      id: 'task_001',
      description: 'Создай React компонент для отображения пользовательских данных',
      complexity: 4,
      requirements: ['frontend', 'react'],
      createdAt: new Date(),
      status: 'pending'
    },
    {
      id: 'task_002', 
      description: 'Оптимизируй PostgreSQL запросы для аналитики',
      complexity: 7,
      requirements: ['backend', 'database'],
      createdAt: new Date(),
      status: 'pending'
    },
    {
      id: 'task_003',
      description: 'Спроектируй микросервисную архитектуру для enterprise системы',
      complexity: 10,
      requirements: ['architecture', 'microservices'],
      createdAt: new Date(),
      status: 'pending'
    },
    {
      id: 'task_004',
      description: 'Создай адаптивную CSS сетку для dashboard',
      complexity: 3,
      requirements: ['frontend', 'css'],
      createdAt: new Date(),
      status: 'pending'
    }
  ]

  // Симулируем обработку задач каждым Guard'ом
  for (const task of testTasks) {
    console.log(`📋 Обрабатываем задачу: "${task.description.substring(0, 40)}..."`)
    
    // Oracle отправляет задачу
    systemVisualizer.logCommunication({
      from: 'oracle_task_distributor',
      to: 'a2a_protocol',
      type: 'task_delegation',
      payload: {
        taskId: task.id,
        success: true,
        metadata: { complexity: task.complexity, requirements: task.requirements }
      }
    })

    for (const { header, guard } of guards) {
      if (header.nodeId.includes('chain_')) {
        // Симулируем A2A коммуникацию к Chain Node
        systemVisualizer.logCommunication({
          from: 'a2a_protocol',
          to: header.nodeId,
          type: 'task_delegation',
          payload: {
            taskId: task.id,
            success: true,
            metadata: { routed_to: header.nodeId }
          }
        })

        // Guard проверка
        const decision = await guard.filterIncomingTask(task)
        
        // Логируем Guard событие
        systemVisualizer.logEvent({
          type: 'guard_check',
          nodeId: header.nodeId,
          details: {
            taskId: task.id,
            decision: decision.action,
            confidence: decision.confidence,
            reasoning: decision.reasoning
          },
          performance: {
            duration: decision.processingTime,
            cost: decision.cost,
            success: decision.action !== 'reject'
          }
        })

        // Визуализируем Guard решение
        terminalVisualizer.visualizeGuardDecision(
          header.nodeId,
          task.description,
          decision
        )

        // Логируем коммуникационный поток от Guard'а
        if (decision.action === 'allow') {
          systemVisualizer.logCommunication({
            from: header.nodeId,
            to: 'task_executor',
            type: 'response',
            payload: {
              taskId: task.id,
              decision,
              success: true,
              metadata: { executed: true }
            }
          })
          terminalVisualizer.visualizeCommunicationFlow(
            header.nodeId, 'task_executor', 'response', true
          )
        } else if (decision.action === 'redirect') {
          systemVisualizer.logCommunication({
            from: header.nodeId,
            to: decision.suggestedNodeType || 'oracle_task_distributor',
            type: 'redirect',
            payload: {
              taskId: task.id,
              decision,
              success: true,
              metadata: { redirected: true }
            }
          })
          terminalVisualizer.visualizeCommunicationFlow(
            header.nodeId, decision.suggestedNodeType || 'oracle', 'redirect', true
          )
        }

        // Добавляем небольшую задержку для демонстрации
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    console.log('─'.repeat(50))
  }

  // ==================== 4. ОТОБРАЖЕНИЕ DASHBOARD ====================
  console.log('\\n📊 Этап 4: Отображение System Dashboard...\\n')
  
  // Отображаем полный dashboard
  terminalVisualizer.displaySystemDashboard()
  
  // Ждем немного для просмотра
  await new Promise(resolve => setTimeout(resolve, 3000))

  // ==================== 5. NETWORK DIAGRAM ====================
  console.log('\\n🌐 Этап 5: Отображение Network Topology...\\n')
  
  terminalVisualizer.displayNetworkDiagram()

  // ==================== 6. ЭКСПОРТ АНАЛИТИЧЕСКИХ ДАННЫХ ====================
  console.log('\\n📈 Этап 6: Экспорт аналитических данных...\\n')
  
  const analyticsData = systemVisualizer.exportAnalyticsData()
  
  console.log('🔍 Аналитическая сводка:')
  console.log(`   События: ${analyticsData.events.length}`)
  console.log(`   Ноды: ${analyticsData.nodeStates.length}`) 
  console.log(`   Коммуникации: ${analyticsData.communications.length}`)
  console.log(`   Здоровье системы: ${analyticsData.summary.systemOverview.systemHealth}%`)
  console.log(`   Обработано задач: ${analyticsData.summary.performanceMetrics.tasksProcessed}`)
  console.log(`   Средняя стоимость: $${analyticsData.summary.performanceMetrics.totalCost.toFixed(4)}`)

  // ==================== 7. LIVE MONITORING DEMO ====================
  console.log('\\n🚀 Этап 7: Демонстрация Live Monitoring (5 секунд)...\\n')
  
  // Запускаем live мониторинг на короткое время
  const stopMonitoring = terminalVisualizer.startLiveMonitoring(2000)
  
  // Симулируем дополнительную активность
  setTimeout(() => {
    systemVisualizer.logEvent({
      type: 'a2a_communication',
      nodeId: 'a2a_protocol',
      details: { message: 'System health check' },
      performance: { duration: 15, cost: 0.0001, success: true }
    })
  }, 1000)
  
  setTimeout(() => {
    systemVisualizer.logEvent({
      type: 'guard_check',
      nodeId: 'chain_frontend_expert_001',
      details: { message: 'Periodic validation' },
      performance: { duration: 25, cost: 0.001, success: true }
    })
  }, 3000)

  // Останавливаем мониторинг через 5 секунд
  setTimeout(() => {
    stopMonitoring()
    console.log('\\n🎉 Демонстрация завершена успешно!\\n')
    
    console.log('📋 Ключевые возможности визуализации:')
    console.log('   ✅ Real-time система мониторинг')
    console.log('   ✅ Красивые терминальные дашборды')
    console.log('   ✅ Network topology диаграммы')
    console.log('   ✅ Guard решения с детальной информацией')
    console.log('   ✅ Межкомпонентная коммуникация')
    console.log('   ✅ Performance метрики и аналитика')
    console.log('   ✅ Экспорт данных для внешнего анализа')
    console.log('   ✅ Live обновления системы')
    
    console.log('\\n💡 Система готова для продакшн мониторинга!')
    
    process.exit(0)
  }, 5000)
}

// Запуск демо
runVisualizationDemo().catch(console.error) 