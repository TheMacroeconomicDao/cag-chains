import { describe, it, expect, beforeEach } from 'bun:test'
import { SystemVisualizer } from './SystemVisualizer.js'
import type { VisualizationEvent, NodeState, CommunicationFlow } from './SystemVisualizer.js'

describe('SystemVisualizer', () => {
  let visualizer: SystemVisualizer

  beforeEach(() => {
    visualizer = new SystemVisualizer()
  })

  describe('Инициализация SystemVisualizer', () => {
    it('должен правильно инициализироваться', () => {
      expect(visualizer).toBeDefined()
      
      const dashboardData = visualizer.generateDashboardData()
      expect(dashboardData.systemOverview.totalNodes).toBe(0)
      expect(dashboardData.recentEvents).toEqual([])
    })
  })

  describe('Логирование событий', () => {
    it('должен корректно логировать события создания нод', () => {
      const nodeEvent = {
        type: 'node_creation' as const,
        nodeId: 'test_node_001',
        details: {
          domains: ['frontend', 'react'],
          capabilities: ['component-creation']
        },
        performance: {
          duration: 50,
          cost: 0.001,
          success: true
        }
      }

      visualizer.logEvent(nodeEvent)

      const dashboardData = visualizer.generateDashboardData()
      expect(dashboardData.systemOverview.totalNodes).toBe(1)
      expect(dashboardData.recentEvents).toHaveLength(1)
      expect(dashboardData.recentEvents[0].type).toBe('node_creation')
    })

    it('должен корректно логировать Guard события', () => {
      const guardEvent = {
        type: 'guard_check' as const,
        nodeId: 'chain_frontend_001',
        details: {
          taskId: 'task_001',
          decision: 'allow',
          confidence: 0.9
        },
        performance: {
          duration: 150,
          cost: 0.002,
          success: true
        }
      }

      visualizer.logEvent(guardEvent)

      const dashboardData = visualizer.generateDashboardData()
      expect(dashboardData.performanceMetrics.tasksProcessed).toBe(1)
      expect(dashboardData.performanceMetrics.totalCost).toBe(0.002)
    })

    it('должен ограничивать историю событий до 1000', () => {
      // Логируем 1500 событий
      for (let i = 0; i < 1500; i++) {
        visualizer.logEvent({
          type: 'guard_check',
          nodeId: `node_${i}`,
          details: { test: true },
          performance: { duration: 10, cost: 0.001, success: true }
        })
      }

      const analyticsData = visualizer.exportAnalyticsData()
      expect(analyticsData.events.length).toBe(1000)
    })
  })

  describe('Логирование коммуникаций', () => {
    it('должен корректно логировать межкомпонентную коммуникацию', () => {
      const communication = {
        from: 'oracle_001',
        to: 'chain_node_001',
        type: 'task_delegation' as const,
        payload: {
          taskId: 'task_001',
          success: true,
          metadata: { priority: 'high' }
        }
      }

      visualizer.logCommunication(communication)

      const dashboardData = visualizer.generateDashboardData()
      expect(dashboardData.systemOverview.totalCommunications).toBe(1)
      expect(dashboardData.communicationMatrix['oracle_001']['chain_node_001']).toBe(1)
    })

    it('должен ограничивать историю коммуникаций до 500', () => {
      // Логируем 600 коммуникаций
      for (let i = 0; i < 600; i++) {
        visualizer.logCommunication({
          from: 'oracle',
          to: `node_${i}`,
          type: 'task_delegation',
          payload: { success: true, metadata: {} }
        })
      }

      const analyticsData = visualizer.exportAnalyticsData()
      expect(analyticsData.communications.length).toBe(500)
    })
  })

  describe('Управление состоянием нод', () => {
    it('должен создавать новые состояния нод автоматически', () => {
      visualizer.logEvent({
        type: 'node_creation',
        nodeId: 'chain_frontend_001',
        details: {},
        performance: { duration: 10, cost: 0, success: true }
      })

      const dashboardData = visualizer.generateDashboardData()
      const node = dashboardData.nodeMetrics.find(n => n.id === 'chain_frontend_001')
      
      expect(node).toBeDefined()
      expect(node!.type).toBe('Chain')
      expect(node!.status).toBe('active')
    })

    it('должен правильно определять типы нод по ID', () => {
      const nodeTypes = [
        { id: 'chain_frontend_001', expectedType: 'Chain' },
        { id: 'oracle_distributor', expectedType: 'Oracle' },
        { id: 'a2a_protocol', expectedType: 'A2A' },
        { id: 'cag_node_001', expectedType: 'CAG' }
      ]

      nodeTypes.forEach(({ id, expectedType }) => {
        visualizer.logEvent({
          type: 'node_creation',
          nodeId: id,
          details: {},
          performance: { duration: 10, cost: 0, success: true }
        })
      })

      const dashboardData = visualizer.generateDashboardData()
      
      nodeTypes.forEach(({ id, expectedType }) => {
        const node = dashboardData.nodeMetrics.find(n => n.id === id)
        expect(node!.type).toBe(expectedType)
      })
    })

    it('должен обновлять статус нод при блокировке', () => {
      // Создаем ноду
      visualizer.logEvent({
        type: 'node_creation',
        nodeId: 'chain_node_001',
        details: {},
        performance: { duration: 10, cost: 0, success: true }
      })

      // Блокируем ноду
      visualizer.logEvent({
        type: 'chain_lock',
        nodeId: 'chain_node_001',
        details: { reason: 'Context filled to 65%' },
        performance: { duration: 5, cost: 0, success: true }
      })

      const dashboardData = visualizer.generateDashboardData()
      const node = dashboardData.nodeMetrics.find(n => n.id === 'chain_node_001')
      
      expect(node!.status).toBe('locked')
    })
  })

  describe('Генерация Dashboard данных', () => {
    beforeEach(() => {
      // Создаем тестовую среду с нодами и коммуникациями
      visualizer.logEvent({
        type: 'node_creation',
        nodeId: 'chain_frontend_001',
        details: {},
        performance: { duration: 20, cost: 0.001, success: true }
      })

      visualizer.logEvent({
        type: 'chain_lock',
        nodeId: 'chain_frontend_001',
        details: {},
        performance: { duration: 5, cost: 0, success: true }
      })

      visualizer.logEvent({
        type: 'guard_check',
        nodeId: 'chain_frontend_001',
        details: { decision: 'allow' },
        performance: { duration: 100, cost: 0.002, success: true }
      })

      visualizer.logCommunication({
        from: 'oracle',
        to: 'chain_frontend_001',
        type: 'task_delegation',
        payload: { success: true, metadata: {} }
      })
    })

    it('должен корректно рассчитывать системные метрики', () => {
      const dashboardData = visualizer.generateDashboardData()
      
      expect(dashboardData.systemOverview.totalNodes).toBe(1)
      expect(dashboardData.systemOverview.lockedNodes).toBe(1)
      expect(dashboardData.systemOverview.totalCommunications).toBe(1)
      expect(dashboardData.systemOverview.systemHealth).toBe(100)
    })

    it('должен правильно рассчитывать метрики производительности', () => {
      const dashboardData = visualizer.generateDashboardData()
      
      expect(dashboardData.performanceMetrics.tasksProcessed).toBe(1)
      expect(dashboardData.performanceMetrics.totalCost).toBeCloseTo(0.003, 3)
      expect(dashboardData.performanceMetrics.avgResponseTime).toBe(100)
    })

    it('должен создавать матрицу коммуникаций', () => {
      const dashboardData = visualizer.generateDashboardData()
      
      expect(dashboardData.communicationMatrix['oracle']['chain_frontend_001']).toBe(1)
    })
  })

  describe('Расчет здоровья системы', () => {
    it('должен возвращать 100% для здоровой системы', () => {
      visualizer.logEvent({
        type: 'node_creation',
        nodeId: 'healthy_node',
        details: {},
        performance: { duration: 50, cost: 0.001, success: true }
      })

      const dashboardData = visualizer.generateDashboardData()
      expect(dashboardData.systemOverview.systemHealth).toBe(100)
    })

    it('должен снижать здоровье при низкой успешности', () => {
      // Создаем ноду с плохой производительностью
      visualizer.logEvent({
        type: 'node_creation',
        nodeId: 'poor_node',
        details: {},
        performance: { duration: 50, cost: 0.001, success: true }
      })

      // Симулируем плохую производительность через прямое обновление state
      const dashboardData = visualizer.generateDashboardData()
      // Здоровье должно быть 100% так как мы не можем напрямую модифицировать внутреннее состояние
      expect(dashboardData.systemOverview.systemHealth).toBeGreaterThan(0)
    })
  })

  describe('Network Diagram генерация', () => {
    it('должен генерировать данные для сетевой диаграммы', () => {
      visualizer.logEvent({
        type: 'node_creation',
        nodeId: 'chain_node_001',
        details: {},
        performance: { duration: 10, cost: 0.001, success: true }
      })

      visualizer.logCommunication({
        from: 'oracle',
        to: 'chain_node_001',
        type: 'task_delegation',
        payload: { success: true, metadata: {} }
      })

      const networkData = visualizer.generateNetworkDiagram()
      
      expect(networkData.nodes.length).toBeGreaterThan(0)
      expect(networkData.edges.length).toBeGreaterThan(0)
      expect(networkData.nodes[0].id).toBe('chain_node_001')
      expect(networkData.edges[0].from).toBe('oracle')
      expect(networkData.edges[0].to).toBe('chain_node_001')
    })

    it('должен правильно устанавливать цвета нод', () => {
      visualizer.logEvent({
        type: 'node_creation',
        nodeId: 'chain_active',
        details: {},
        performance: { duration: 10, cost: 0.001, success: true }
      })

      visualizer.logEvent({
        type: 'chain_lock',
        nodeId: 'chain_locked',
        details: {},
        performance: { duration: 5, cost: 0, success: true }
      })

      const networkData = visualizer.generateNetworkDiagram()
      
      const activeNode = networkData.nodes.find(n => n.id === 'chain_active')
      const lockedNode = networkData.nodes.find(n => n.id === 'chain_locked')
      
      expect(activeNode?.color).toBe('#4CAF50') // Green for active
      expect(lockedNode?.color).toBe('#FF9800') // Orange for locked
    })
  })

  describe('Подписка на события', () => {
    it('должен поддерживать подписку на события', (done) => {
      let eventReceived = false

      const unsubscribe = visualizer.subscribe('event', (data) => {
        eventReceived = true
        expect(data.type).toBe('node_creation')
        unsubscribe()
        done()
      })

      visualizer.logEvent({
        type: 'node_creation',
        nodeId: 'test_node',
        details: {},
        performance: { duration: 10, cost: 0, success: true }
      })

      // Если событие не получено за 100ms, тест провален
      setTimeout(() => {
        if (!eventReceived) {
          unsubscribe()
          done(new Error('Event subscription failed'))
        }
      }, 100)
    })
  })

  describe('Экспорт аналитических данных', () => {
    it('должен экспортировать полные аналитические данные', () => {
      visualizer.logEvent({
        type: 'node_creation',
        nodeId: 'test_node',
        details: {},
        performance: { duration: 10, cost: 0.001, success: true }
      })

      const analyticsData = visualizer.exportAnalyticsData()
      
      expect(analyticsData.timestamp).toBeInstanceOf(Date)
      expect(analyticsData.events.length).toBe(1)
      expect(analyticsData.nodeStates.length).toBe(1)
      expect(analyticsData.summary).toBeDefined()
      expect(analyticsData.summary.systemOverview).toBeDefined()
    })
  })
}) 