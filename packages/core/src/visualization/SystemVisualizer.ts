import type { Task, GuardDecision, A2AHeader } from '../types/index.js'

export interface VisualizationEvent {
  id: string
  timestamp: Date
  type: 'node_creation' | 'guard_check' | 'task_delegation' | 'a2a_communication' | 'chain_lock'
  nodeId: string
  details: Record<string, any>
  performance: {
    duration: number
    cost: number
    success: boolean
  }
}

export interface NodeState {
  id: string
  type: 'CAG' | 'Chain' | 'Oracle' | 'A2A'
  status: 'active' | 'locked' | 'processing' | 'idle'
  connections: string[]
  performance: {
    tasksProcessed: number
    successRate: number
    avgResponseTime: number
    totalCost: number
  }
  contextInfo: {
    domains: string[]
    competencies: Record<string, number>
    utilization: number
  }
}

export interface CommunicationFlow {
  id: string
  from: string
  to: string
  type: 'task_delegation' | 'guard_check' | 'response' | 'redirect'
  timestamp: Date
  payload: {
    taskId?: string
    decision?: GuardDecision
    success: boolean
    metadata: Record<string, any>
  }
}

/**
 * Современная система визуализации CAG-Chains
 * Анализ межкомпонентного взаимодействия в реальном времени
 */
export class SystemVisualizer {
  private events: VisualizationEvent[] = []
  private nodeStates: Map<string, NodeState> = new Map()
  private communicationFlows: CommunicationFlow[] = []
  private subscribers: Map<string, (data: any) => void> = new Map()
  
  constructor() {
    console.log('🎨 SystemVisualizer initialized')
  }

  /**
   * Регистрация события в системе
   */
  logEvent(event: Omit<VisualizationEvent, 'id' | 'timestamp'>): void {
    const visualEvent: VisualizationEvent = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    }
    
    this.events.push(visualEvent)
    this.updateNodeState(event.nodeId, event)
    this.notifySubscribers('event', visualEvent)
    
    // Ограничиваем историю событий
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000)
    }
  }

  /**
   * Логирование коммуникации между компонентами
   */
  logCommunication(flow: Omit<CommunicationFlow, 'id' | 'timestamp'>): void {
    const communication: CommunicationFlow = {
      ...flow,
      id: `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    }
    
    this.communicationFlows.push(communication)
    this.notifySubscribers('communication', communication)
    
    // Ограничиваем историю коммуникаций
    if (this.communicationFlows.length > 500) {
      this.communicationFlows = this.communicationFlows.slice(-500)
    }
  }

  /**
   * Обновление состояния ноды
   */
  private updateNodeState(nodeId: string, event: Omit<VisualizationEvent, 'id' | 'timestamp'>): void {
    const existing = this.nodeStates.get(nodeId)
    
    if (!existing) {
      // Создаем новое состояние ноды
      const newState: NodeState = {
        id: nodeId,
        type: this.inferNodeType(nodeId),
        status: 'active',
        connections: [],
        performance: {
          tasksProcessed: 0,
          successRate: 100,
          avgResponseTime: 0,
          totalCost: 0
        },
        contextInfo: {
          domains: [],
          competencies: {},
          utilization: 0
        }
      }
      this.nodeStates.set(nodeId, newState)
    }
    
    // Обновляем состояние на основе события
    const state = this.nodeStates.get(nodeId)!
    
    if (event.type === 'guard_check') {
      state.performance.tasksProcessed++
      state.performance.totalCost += event.performance.cost
      state.performance.avgResponseTime = 
        (state.performance.avgResponseTime + event.performance.duration) / 2
    }
    
    if (event.type === 'chain_lock') {
      state.status = 'locked'
    }
    
    this.nodeStates.set(nodeId, state)
    this.notifySubscribers('node_state', state)
  }

  /**
   * Определение типа ноды по ID
   */
  private inferNodeType(nodeId: string): NodeState['type'] {
    if (nodeId.includes('chain_')) return 'Chain'
    if (nodeId.includes('oracle')) return 'Oracle'
    if (nodeId.includes('a2a')) return 'A2A'
    return 'CAG'
  }

  /**
   * Генерация Real-time Dashboard данных
   */
  generateDashboardData(): {
    systemOverview: {
      totalNodes: number
      activeNodes: number
      lockedNodes: number
      totalCommunications: number
      systemHealth: number
    },
    nodeMetrics: NodeState[],
    recentEvents: VisualizationEvent[],
    communicationMatrix: Record<string, Record<string, number>>,
    performanceMetrics: {
      avgResponseTime: number
      successRate: number
      totalCost: number
      tasksProcessed: number
    }
  } {
    const nodes = Array.from(this.nodeStates.values())
    const recentEvents = this.events.slice(-50)
    
    // Матрица коммуникаций
    const communicationMatrix: Record<string, Record<string, number>> = {}
    this.communicationFlows.forEach(flow => {
      if (!communicationMatrix[flow.from]) {
        communicationMatrix[flow.from] = {}
      }
      if (!communicationMatrix[flow.from][flow.to]) {
        communicationMatrix[flow.from][flow.to] = 0
      }
      communicationMatrix[flow.from][flow.to]++
    })

    // Метрики производительности
    const performanceMetrics = nodes.reduce((acc, node) => {
      acc.avgResponseTime = (acc.avgResponseTime + node.performance.avgResponseTime) / 2
      acc.successRate = (acc.successRate + node.performance.successRate) / 2
      acc.totalCost += node.performance.totalCost
      acc.tasksProcessed += node.performance.tasksProcessed
      return acc
    }, { avgResponseTime: 0, successRate: 0, totalCost: 0, tasksProcessed: 0 })

    return {
      systemOverview: {
        totalNodes: nodes.length,
        activeNodes: nodes.filter(n => n.status === 'active').length,
        lockedNodes: nodes.filter(n => n.status === 'locked').length,
        totalCommunications: this.communicationFlows.length,
        systemHealth: this.calculateSystemHealth(nodes)
      },
      nodeMetrics: nodes,
      recentEvents,
      communicationMatrix,
      performanceMetrics
    }
  }

  /**
   * Расчет здоровья системы
   */
  private calculateSystemHealth(nodes: NodeState[]): number {
    if (nodes.length === 0) return 100
    
    const healthScore = nodes.reduce((acc, node) => {
      let nodeHealth = 100
      
      // Снижаем здоровье если успешность низкая
      if (node.performance.successRate < 80) {
        nodeHealth -= (80 - node.performance.successRate)
      }
      
      // Снижаем здоровье если время ответа высокое
      if (node.performance.avgResponseTime > 1000) {
        nodeHealth -= 20
      }
      
      return acc + Math.max(0, nodeHealth)
    }, 0)
    
    return Math.round(healthScore / nodes.length)
  }

  /**
   * Подписка на обновления визуализации
   */
  subscribe(channel: string, callback: (data: any) => void): () => void {
    const subId = `${channel}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.subscribers.set(subId, callback)
    
    return () => {
      this.subscribers.delete(subId)
    }
  }

  /**
   * Уведомление подписчиков
   */
  private notifySubscribers(channel: string, data: any): void {
    this.subscribers.forEach((callback, id) => {
      if (id.startsWith(channel)) {
        callback(data)
      }
    })
  }

  /**
   * Экспорт данных для внешнего анализа
   */
  exportAnalyticsData(): {
    timestamp: Date
    events: VisualizationEvent[]
    nodeStates: NodeState[]
    communications: CommunicationFlow[]
    summary: Record<string, any>
  } {
    return {
      timestamp: new Date(),
      events: this.events,
      nodeStates: Array.from(this.nodeStates.values()),
      communications: this.communicationFlows,
      summary: this.generateDashboardData()
    }
  }

  /**
   * Генерация Network Diagram данных
   */
  generateNetworkDiagram(): {
    nodes: Array<{
      id: string
      label: string
      type: string
      status: string
      size: number
      color: string
      metadata: Record<string, any>
    }>,
    edges: Array<{
      id: string
      from: string
      to: string
      type: string
      weight: number
      color: string
      metadata: Record<string, any>
    }>
  } {
    const nodes = Array.from(this.nodeStates.values()).map(node => ({
      id: node.id,
      label: node.id,
      type: node.type,
      status: node.status,
      size: Math.max(10, node.performance.tasksProcessed * 2),
      color: this.getNodeColor(node),
      metadata: {
        performance: node.performance,
        contextInfo: node.contextInfo
      }
    }))

    const edges = this.communicationFlows
      .reduce((acc, flow) => {
        const edgeId = `${flow.from}-${flow.to}`
        const existing = acc.find(e => e.id === edgeId)
        
        if (existing) {
          existing.weight++
        } else {
          acc.push({
            id: edgeId,
            from: flow.from,
            to: flow.to,
            type: flow.type,
            weight: 1,
            color: this.getEdgeColor(flow.type),
            metadata: { lastCommunication: flow.timestamp }
          })
        }
        
        return acc
      }, [] as any[])

    return { nodes, edges }
  }

  /**
   * Получение цвета ноды
   */
  private getNodeColor(node: NodeState): string {
    switch (node.status) {
      case 'active': return '#4CAF50'
      case 'locked': return '#FF9800'
      case 'processing': return '#2196F3'
      case 'idle': return '#9E9E9E'
      default: return '#607D8B'
    }
  }

  /**
   * Получение цвета связи
   */
  private getEdgeColor(type: string): string {
    switch (type) {
      case 'task_delegation': return '#2196F3'
      case 'guard_check': return '#FF9800'
      case 'response': return '#4CAF50'
      case 'redirect': return '#F44336'
      default: return '#9E9E9E'
    }
  }
}

// Singleton instance
export const systemVisualizer = new SystemVisualizer() 