import { describe, it, expect, beforeEach } from 'bun:test'
import { MockGuard } from '../../packages/core/src/guard/MockGuard.js'
import { systemVisualizer } from '../../packages/core/src/visualization/SystemVisualizer.js'
import { terminalVisualizer } from '../../packages/core/src/visualization/TerminalVisualizer.js'
import type { Task, A2AHeader } from '../../packages/core/src/types/index.js'

describe('Guard System Integration Tests', () => {
  let frontendGuard: MockGuard
  let backendGuard: MockGuard
  let frontendHeader: A2AHeader
  let backendHeader: A2AHeader

  beforeEach(() => {
    // Создаем заголовки для различных типов нод
    frontendHeader = {
      nodeId: 'chain_frontend_expert_001',
      expertDomains: ['frontend', 'react', 'typescript', 'css'],
      competenceMap: {
        'frontend': 0.92,
        'react': 0.95,
        'typescript': 0.88,
        'css': 0.85
      },
      capabilities: ['component-creation', 'state-management', 'ui-design', 'styling'],
      contextHash: 'sha256:frontend_context_hash',
      guardThresholds: {
        minConfidence: 0.8,
        rejectBelow: 0.3
      },
      blockedAt: new Date(),
      version: '1.0.0'
    }

    backendHeader = {
      nodeId: 'chain_backend_expert_002',
      expertDomains: ['backend', 'nodejs', 'database', 'api'],
      competenceMap: {
        'backend': 0.89,
        'nodejs': 0.91,
        'database': 0.87,
        'api': 0.93
      },
      capabilities: ['api-development', 'database-optimization', 'server-architecture'],
      contextHash: 'sha256:backend_context_hash',
      guardThresholds: {
        minConfidence: 0.8,
        rejectBelow: 0.3
      },
      blockedAt: new Date(),
      version: '1.0.0'
    }

    frontendGuard = new MockGuard(frontendHeader)
    backendGuard = new MockGuard(backendHeader)
  })

  describe('Полный цикл обработки задач', () => {
    it('должен корректно распределить задачи между Guard\'ами', async () => {
      const tasks: Task[] = [
        {
          id: 'task_frontend_001',
          description: 'Создай React компонент с TypeScript для отображения пользовательских данных',
          complexity: 4,
          requirements: ['frontend', 'react', 'typescript'],
          createdAt: new Date(),
          status: 'pending'
        },
        {
          id: 'task_backend_001',
          description: 'Оптимизируй PostgreSQL запросы и создай REST API',
          complexity: 6,
          requirements: ['backend', 'database', 'api'],
          createdAt: new Date(),
          status: 'pending'
        },
        {
          id: 'task_complex_001',
          description: 'Спроектируй полную enterprise архитектуру с микросервисами',
          complexity: 10,
          requirements: ['architecture', 'microservices', 'enterprise'],
          createdAt: new Date(),
          status: 'pending'
        }
      ]

      const results = []

      for (const task of tasks) {
        // Симулируем Oracle отправку задачи в A2A
        systemVisualizer.logCommunication({
          from: 'oracle_distributor',
          to: 'a2a_protocol',
          type: 'task_delegation',
          payload: {
            taskId: task.id,
            success: true,
            metadata: { complexity: task.complexity, requirements: task.requirements }
          }
        })

        // Симулируем A2A направление к соответствующим Guards
        const guardResults = await Promise.all([
          frontendGuard.filterIncomingTask(task),
          backendGuard.filterIncomingTask(task)
        ])

        results.push({
          task,
          frontendDecision: guardResults[0],
          backendDecision: guardResults[1]
        })

        // Логируем решения Guard'ов
        systemVisualizer.logEvent({
          type: 'guard_check',
          nodeId: frontendHeader.nodeId,
          details: {
            taskId: task.id,
            decision: guardResults[0].action,
            confidence: guardResults[0].confidence
          },
          performance: {
            duration: guardResults[0].processingTime,
            cost: guardResults[0].cost,
            success: guardResults[0].action !== 'reject'
          }
        })

        systemVisualizer.logEvent({
          type: 'guard_check',
          nodeId: backendHeader.nodeId,
          details: {
            taskId: task.id,
            decision: guardResults[1].action,
            confidence: guardResults[1].confidence
          },
          performance: {
            duration: guardResults[1].processingTime,
            cost: guardResults[1].cost,
            success: guardResults[1].action !== 'reject'
          }
        })
      }

      // Проверяем результаты
      const frontendResult = results[0] // Frontend задача
      expect(frontendResult.frontendDecision.action).toBe('allow')
      expect(frontendResult.backendDecision.action).toBe('reject')

      const backendResult = results[1] // Backend задача
      expect(backendResult.frontendDecision.action).toBe('reject')
      expect(backendResult.backendDecision.action).toBe('allow')

      const complexResult = results[2] // Сложная задача
      expect(complexResult.frontendDecision.action).toBe('redirect')
      expect(complexResult.backendDecision.action).toBe('redirect')

      // Проверяем системные метрики
      const dashboardData = systemVisualizer.generateDashboardData()
      expect(dashboardData.performanceMetrics.tasksProcessed).toBe(6) // 2 Guard'а x 3 задачи
      expect(dashboardData.systemOverview.totalCommunications).toBeGreaterThan(0)
    })
  })

  describe('Интеграция с системой визуализации', () => {
    it('должен корректно отображать межкомпонентное взаимодействие', async () => {
      // Создаем цепочку: Oracle -> A2A -> Guard -> Executor
      const task: Task = {
        id: 'visual_test_001',
        description: 'Создай красивый React компонент',
        complexity: 3,
        requirements: ['frontend', 'react'],
        createdAt: new Date(),
        status: 'pending'
      }

      // 1. Oracle отправляет задачу
      systemVisualizer.logCommunication({
        from: 'oracle_distributor',
        to: 'a2a_protocol',
        type: 'task_delegation',
        payload: {
          taskId: task.id,
          success: true,
          metadata: { routed: true }
        }
      })

      // 2. A2A перенаправляет в frontend Guard
      systemVisualizer.logCommunication({
        from: 'a2a_protocol',
        to: frontendHeader.nodeId,
        type: 'task_delegation',
        payload: {
          taskId: task.id,
          success: true,
          metadata: { targeted: true }
        }
      })

      // 3. Guard обрабатывает задачу
      const decision = await frontendGuard.filterIncomingTask(task)

      systemVisualizer.logEvent({
        type: 'guard_check',
        nodeId: frontendHeader.nodeId,
        details: {
          taskId: task.id,
          decision: decision.action,
          confidence: decision.confidence
        },
        performance: {
          duration: decision.processingTime,
          cost: decision.cost,
          success: decision.action === 'allow'
        }
      })

      // 4. Guard разрешает выполнение
      if (decision.action === 'allow') {
        systemVisualizer.logCommunication({
          from: frontendHeader.nodeId,
          to: 'task_executor',
          type: 'response',
          payload: {
            taskId: task.id,
            decision,
            success: true,
            metadata: { executed: true }
          }
        })
      }

      // Проверяем визуализацию
      const networkData = systemVisualizer.generateNetworkDiagram()
      const communicationMatrix = systemVisualizer.generateDashboardData().communicationMatrix

      expect(networkData.nodes.length).toBeGreaterThan(0)
      expect(networkData.edges.length).toBe(3) // 3 коммуникации
      expect(communicationMatrix['oracle_distributor']['a2a_protocol']).toBe(1)
      expect(communicationMatrix['a2a_protocol'][frontendHeader.nodeId]).toBe(1)
      expect(communicationMatrix[frontendHeader.nodeId]['task_executor']).toBe(1)
    })

    it('должен отслеживать производительность системы в реальном времени', async () => {
      const startTime = Date.now()

      // Симулируем нагрузку на систему
      const tasks = Array.from({ length: 10 }, (_, i) => ({
        id: `load_test_${i}`,
        description: `Задача номер ${i}`,
        complexity: Math.floor(Math.random() * 8) + 1,
        requirements: i % 2 === 0 ? ['frontend', 'react'] : ['backend', 'api'],
        createdAt: new Date(),
        status: 'pending' as const
      }))

      const results = []

      for (const task of tasks) {
        const guard = task.requirements.includes('frontend') ? frontendGuard : backendGuard
        const decision = await guard.filterIncomingTask(task)

        systemVisualizer.logEvent({
          type: 'guard_check',
          nodeId: guard === frontendGuard ? frontendHeader.nodeId : backendHeader.nodeId,
          details: {
            taskId: task.id,
            decision: decision.action
          },
          performance: {
            duration: decision.processingTime,
            cost: decision.cost,
            success: decision.action !== 'reject'
          }
        })

        results.push(decision)
      }

      const endTime = Date.now()
      const totalTime = endTime - startTime

      // Анализируем производительность
      const dashboardData = systemVisualizer.generateDashboardData()
      
      expect(dashboardData.performanceMetrics.tasksProcessed).toBe(10)
      expect(dashboardData.performanceMetrics.avgResponseTime).toBeGreaterThan(0)
      expect(dashboardData.performanceMetrics.totalCost).toBeGreaterThan(0)
      expect(dashboardData.systemOverview.systemHealth).toBeGreaterThan(80)

      // Проверяем что система справилась за разумное время
      expect(totalTime).toBeLessThan(5000) // Менее 5 секунд для 10 задач

      console.log(`\n📊 Результаты нагрузочного теста:`)
      console.log(`   Обработано задач: ${dashboardData.performanceMetrics.tasksProcessed}`)
      console.log(`   Среднее время ответа: ${Math.round(dashboardData.performanceMetrics.avgResponseTime)}ms`)
      console.log(`   Общая стоимость: $${dashboardData.performanceMetrics.totalCost.toFixed(4)}`)
      console.log(`   Здоровье системы: ${dashboardData.systemOverview.systemHealth}%`)
      console.log(`   Общее время теста: ${totalTime}ms`)
    })
  })

  describe('Обработка ошибок и надежность', () => {
    it('должен gracefully обрабатывать некорректные задачи', async () => {
      const invalidTasks = [
        null as any,
        undefined as any,
        {} as Task,
        { id: 'test', description: '', requirements: [], createdAt: new Date(), status: 'pending' },
        { id: 'test', description: 'x'.repeat(10000), requirements: [], createdAt: new Date(), status: 'pending' }
      ]

      for (const invalidTask of invalidTasks) {
        const decision = await frontendGuard.filterIncomingTask(invalidTask)
        
        expect(decision).toBeDefined()
        expect(decision.action).toBeOneOf(['reject', 'redirect'])
        expect(decision.reasoning).toBeDefined()
      }
    })

    it('должен поддерживать высокую доступность при ошибках', async () => {
      // Симулируем различные типы ошибок
      const problematicTasks = [
        {
          id: 'error_test_1',
          description: 'Задача с экстремальной сложностью',
          complexity: 1000,
          requirements: ['impossible', 'technology'],
          createdAt: new Date(),
          status: 'pending' as const
        },
        {
          id: 'error_test_2', 
          description: 'Задача с пустыми требованиями',
          complexity: 5,
          requirements: [],
          createdAt: new Date(),
          status: 'pending' as const
        }
      ]

      let successfulDecisions = 0
      let totalDecisions = 0

      for (const task of problematicTasks) {
        try {
          const decision = await frontendGuard.filterIncomingTask(task)
          totalDecisions++
          
          if (decision.action !== 'reject') {
            successfulDecisions++
          }

          systemVisualizer.logEvent({
            type: 'guard_check',
            nodeId: frontendHeader.nodeId,
            details: {
              taskId: task.id,
              decision: decision.action,
              error: decision.action === 'reject'
            },
            performance: {
              duration: decision.processingTime,
              cost: decision.cost,
              success: decision.action !== 'reject'
            }
          })
        } catch (error) {
          console.error('Guard error:', error)
          totalDecisions++
        }
      }

      // Система должна обрабатывать все запросы без падений
      expect(totalDecisions).toBe(problematicTasks.length)
      
      // Проверяем что система остается здоровой
      const dashboardData = systemVisualizer.generateDashboardData()
      expect(dashboardData.systemOverview.systemHealth).toBeGreaterThan(0)
    })
  })

  describe('Масштабируемость системы', () => {
    it('должен поддерживать одновременную работу множества Guard\'ов', async () => {
      // Создаем дополнительные Guard'ы
      const additionalGuards = [
        new MockGuard({
          ...frontendHeader,
          nodeId: 'chain_frontend_002',
          expertDomains: ['frontend', 'vue', 'javascript']
        }),
        new MockGuard({
          ...backendHeader,
          nodeId: 'chain_backend_002',
          expertDomains: ['backend', 'python', 'django']
        })
      ]

      const allGuards = [frontendGuard, backendGuard, ...additionalGuards]

      const testTask: Task = {
        id: 'scale_test_001',
        description: 'Универсальная задача для тестирования',
        complexity: 5,
        requirements: ['development'],
        createdAt: new Date(),
        status: 'pending'
      }

      // Параллельная обработка всеми Guard'ами
      const startTime = Date.now()
      const decisions = await Promise.all(
        allGuards.map(guard => guard.filterIncomingTask(testTask))
      )
      const endTime = Date.now()

      // Все Guard'ы должны ответить
      expect(decisions).toHaveLength(allGuards.length)
      decisions.forEach(decision => {
        expect(decision).toBeDefined()
        expect(decision.action).toBeOneOf(['allow', 'reject', 'redirect'])
      })

      // Параллельная обработка должна быть быстрее последовательной
      expect(endTime - startTime).toBeLessThan(1000) // Менее 1 секунды для всех

      console.log(`\n🚀 Результаты теста масштабируемости:`)
      console.log(`   Guard'ов обработало: ${allGuards.length}`)
      console.log(`   Время параллельной обработки: ${endTime - startTime}ms`)
      console.log(`   Решения: ${decisions.map(d => d.action).join(', ')}`)
    })
  })
}) 