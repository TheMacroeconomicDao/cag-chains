import type { NodeState, VisualizationEvent, CommunicationFlow } from './SystemVisualizer.js'
import { systemVisualizer } from './SystemVisualizer.js'

/**
 * Современная терминальная визуализация CAG-Chains
 * Красивые ASCII диаграммы и real-time мониторинг
 */
export class TerminalVisualizer {
  private colors = {
    green: '\x1b[32m',
    yellow: '\x1b[33m', 
    red: '\x1b[31m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m'
  }

  private symbols = {
    nodeActive: '●',
    nodeLocked: '🔒',
    nodeProcessing: '⚡',
    nodeIdle: '○',
    arrow: '→',
    connection: '─',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    info: 'ℹ️',
    guard: '🛡️',
    oracle: '🔮',
    chain: '⛓️',
    cag: '🧠'
  }

  constructor() {
    console.log(`${this.colors.cyan}🎨 TerminalVisualizer initialized${this.colors.reset}`)
  }

  /**
   * Отображение системного дашборда в терминале
   */
  displaySystemDashboard(): void {
    const data = systemVisualizer.generateDashboardData()
    
    this.clearScreen()
    this.printHeader('CAG-CHAINS SYSTEM DASHBOARD')
    
    // Обзор системы
    this.printSystemOverview(data.systemOverview)
    
    // Метрики производительности
    this.printPerformanceMetrics(data.performanceMetrics)
    
    // Состояние нод
    this.printNodeStates(data.nodeMetrics)
    
    // Матрица коммуникаций
    this.printCommunicationMatrix(data.communicationMatrix)
    
    // Последние события
    this.printRecentEvents(data.recentEvents)
    
    console.log()
  }

  /**
   * Отображение сетевой диаграммы в терминале
   */
  displayNetworkDiagram(): void {
    const network = systemVisualizer.generateNetworkDiagram()
    
    this.printHeader('NETWORK TOPOLOGY')
    
    console.log(`${this.colors.bold}Nodes (${network.nodes.length}):${this.colors.reset}`)
    network.nodes.forEach(node => {
      const symbol = this.getNodeSymbol(node.type as any, node.status as any)
      const color = this.getStatusColor(node.status)
      console.log(`  ${color}${symbol} ${node.id}${this.colors.reset} ${this.colors.gray}(${node.type})${this.colors.reset}`)
    })
    
    console.log(`\\n${this.colors.bold}Communication Flows (${network.edges.length}):${this.colors.reset}`)
    network.edges.forEach(edge => {
      const color = this.getFlowColor(edge.type)
      const weight = edge.weight > 1 ? ` ${this.colors.gray}(${edge.weight}x)${this.colors.reset}` : ''
      console.log(`  ${color}${edge.from} ${this.symbols.arrow} ${edge.to}${this.colors.reset}${weight}`)
    })
    
    console.log()
  }

  /**
   * Live мониторинг системы
   */
  startLiveMonitoring(intervalMs: number = 5000): () => void {
    console.log(`${this.colors.cyan}🚀 Starting live monitoring...${this.colors.reset}`)
    
    const interval = setInterval(() => {
      this.displaySystemDashboard()
      console.log(`${this.colors.gray}Updated: ${new Date().toLocaleTimeString()}${this.colors.reset}`)
    }, intervalMs)
    
    return () => {
      clearInterval(interval)
      console.log(`${this.colors.yellow}Live monitoring stopped${this.colors.reset}`)
    }
  }

  /**
   * Визуализация Guard фильтрации
   */
  visualizeGuardDecision(
    nodeId: string, 
    taskDescription: string, 
    decision: { action: string, confidence: number, reasoning: string }
  ): void {
    const actionColor = decision.action === 'allow' ? this.colors.green : 
                      decision.action === 'reject' ? this.colors.red : this.colors.yellow
    const confidenceBar = this.createProgressBar(decision.confidence, 20)
    
    console.log()
    console.log(`${this.colors.bold}${this.symbols.guard} GUARD DECISION${this.colors.reset}`)
    console.log(`${this.colors.gray}${'─'.repeat(50)}${this.colors.reset}`)
    console.log(`Node: ${this.colors.cyan}${nodeId}${this.colors.reset}`)
    console.log(`Task: ${this.colors.white}${taskDescription.substring(0, 60)}...${this.colors.reset}`)
    console.log(`Decision: ${actionColor}${decision.action.toUpperCase()}${this.colors.reset}`)
    console.log(`Confidence: ${confidenceBar} ${Math.round(decision.confidence * 100)}%`)
    console.log(`Reasoning: ${this.colors.gray}${decision.reasoning}${this.colors.reset}`)
    console.log()
  }

  /**
   * Отображение межкомпонентной коммуникации
   */
  visualizeCommunicationFlow(from: string, to: string, type: string, success: boolean): void {
    const statusSymbol = success ? this.symbols.success : this.symbols.error
    const typeColor = this.getFlowColor(type)
    
    console.log(`${typeColor}${from} ${this.symbols.arrow} ${to}${this.colors.reset} ${statusSymbol} ${this.colors.gray}(${type})${this.colors.reset}`)
  }

  // ==================== PRIVATE METHODS ====================

  private clearScreen(): void {
    console.clear()
  }

  private printHeader(title: string): void {
    const width = 70
    const padding = Math.max(0, (width - title.length) / 2)
    
    console.log(`${this.colors.bold}${this.colors.cyan}${'═'.repeat(width)}${this.colors.reset}`)
    console.log(`${this.colors.bold}${this.colors.cyan}${' '.repeat(Math.floor(padding))}${title}${' '.repeat(Math.ceil(padding))}${this.colors.reset}`)
    console.log(`${this.colors.bold}${this.colors.cyan}${'═'.repeat(width)}${this.colors.reset}`)
    console.log()
  }

  private printSystemOverview(overview: any): void {
    console.log(`${this.colors.bold}🎯 SYSTEM OVERVIEW${this.colors.reset}`)
    console.log(`${this.colors.gray}${'─'.repeat(30)}${this.colors.reset}`)
    
    const healthColor = overview.systemHealth > 80 ? this.colors.green : 
                       overview.systemHealth > 60 ? this.colors.yellow : this.colors.red
    
    console.log(`Total Nodes: ${this.colors.white}${overview.totalNodes}${this.colors.reset}`)
    console.log(`Active: ${this.colors.green}${overview.activeNodes}${this.colors.reset} | Locked: ${this.colors.yellow}${overview.lockedNodes}${this.colors.reset}`)
    console.log(`Communications: ${this.colors.cyan}${overview.totalCommunications}${this.colors.reset}`)
    console.log(`System Health: ${healthColor}${overview.systemHealth}%${this.colors.reset}`)
    console.log()
  }

  private printPerformanceMetrics(metrics: any): void {
    console.log(`${this.colors.bold}📊 PERFORMANCE METRICS${this.colors.reset}`)
    console.log(`${this.colors.gray}${'─'.repeat(30)}${this.colors.reset}`)
    
    console.log(`Tasks Processed: ${this.colors.white}${metrics.tasksProcessed}${this.colors.reset}`)
    console.log(`Success Rate: ${this.colors.green}${Math.round(metrics.successRate)}%${this.colors.reset}`)
    console.log(`Avg Response Time: ${this.colors.cyan}${Math.round(metrics.avgResponseTime)}ms${this.colors.reset}`)
    console.log(`Total Cost: ${this.colors.yellow}$${metrics.totalCost.toFixed(4)}${this.colors.reset}`)
    console.log()
  }

  private printNodeStates(nodes: NodeState[]): void {
    console.log(`${this.colors.bold}🧠 NODE STATES${this.colors.reset}`)
    console.log(`${this.colors.gray}${'─'.repeat(30)}${this.colors.reset}`)
    
    nodes.forEach(node => {
      const symbol = this.getNodeSymbol(node.type, node.status)
      const statusColor = this.getStatusColor(node.status)
      const utilization = this.createProgressBar(node.contextInfo.utilization / 100, 10)
      
      console.log(`${statusColor}${symbol} ${node.id}${this.colors.reset}`)
      console.log(`   Status: ${statusColor}${node.status}${this.colors.reset} | Tasks: ${this.colors.white}${node.performance.tasksProcessed}${this.colors.reset}`)
      console.log(`   Domains: ${this.colors.gray}${node.contextInfo.domains.join(', ')}${this.colors.reset}`)
      console.log(`   Utilization: ${utilization}`)
    })
    console.log()
  }

  private printCommunicationMatrix(matrix: Record<string, Record<string, number>>): void {
    console.log(`${this.colors.bold}🔄 COMMUNICATION MATRIX${this.colors.reset}`)
    console.log(`${this.colors.gray}${'─'.repeat(30)}${this.colors.reset}`)
    
    Object.entries(matrix).forEach(([from, destinations]) => {
      console.log(`${this.colors.cyan}${from}:${this.colors.reset}`)
      Object.entries(destinations).forEach(([to, count]) => {
        const intensity = count > 10 ? this.colors.red : count > 5 ? this.colors.yellow : this.colors.white
        console.log(`  ${this.symbols.arrow} ${to}: ${intensity}${count}${this.colors.reset}`)
      })
    })
    console.log()
  }

  private printRecentEvents(events: VisualizationEvent[]): void {
    console.log(`${this.colors.bold}📋 RECENT EVENTS${this.colors.reset}`)
    console.log(`${this.colors.gray}${'─'.repeat(30)}${this.colors.reset}`)
    
    events.slice(-5).forEach(event => {
      const time = event.timestamp.toLocaleTimeString()
      const typeColor = this.getEventColor(event.type)
      const statusSymbol = event.performance.success ? this.symbols.success : this.symbols.error
      
      console.log(`${this.colors.gray}[${time}]${this.colors.reset} ${typeColor}${event.type}${this.colors.reset} ${statusSymbol}`)
      console.log(`  Node: ${this.colors.cyan}${event.nodeId}${this.colors.reset}`)
      console.log(`  Duration: ${this.colors.white}${event.performance.duration}ms${this.colors.reset}`)
    })
    console.log()
  }

  private getNodeSymbol(type: NodeState['type'], status: NodeState['status']): string {
    const typeSymbol = {
      'CAG': this.symbols.cag,
      'Chain': this.symbols.chain,
      'Oracle': this.symbols.oracle,
      'A2A': this.symbols.arrow
    }[type] || this.symbols.nodeActive

    const statusSymbol = {
      'active': this.symbols.nodeActive,
      'locked': this.symbols.nodeLocked,
      'processing': this.symbols.nodeProcessing,
      'idle': this.symbols.nodeIdle
    }[status] || this.symbols.nodeActive

    return `${typeSymbol}${statusSymbol}`
  }

  private getStatusColor(status: string): string {
    return {
      'active': this.colors.green,
      'locked': this.colors.yellow,
      'processing': this.colors.blue,
      'idle': this.colors.gray
    }[status] || this.colors.white
  }

  private getFlowColor(type: string): string {
    return {
      'task_delegation': this.colors.blue,
      'guard_check': this.colors.yellow,
      'response': this.colors.green,
      'redirect': this.colors.red
    }[type] || this.colors.white
  }

  private getEventColor(type: string): string {
    return {
      'node_creation': this.colors.green,
      'guard_check': this.colors.yellow,
      'task_delegation': this.colors.blue,
      'a2a_communication': this.colors.cyan,
      'chain_lock': this.colors.magenta
    }[type] || this.colors.white
  }

  private createProgressBar(value: number, width: number): string {
    const filled = Math.round(value * width)
    const empty = width - filled
    return `${this.colors.green}${'█'.repeat(filled)}${this.colors.gray}${'░'.repeat(empty)}${this.colors.reset}`
  }
}

// Singleton instance
export const terminalVisualizer = new TerminalVisualizer() 