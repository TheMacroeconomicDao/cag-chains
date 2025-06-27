/**
 * A2A Service - Agent-to-Agent Protocol Integration for CAG-Chains
 * Обеспечивает межагентское взаимодействие между CAG Nodes и Chain Nodes
 */

import type { CAGNode } from '../node/CAGNode.js'
import type { ChainNode } from '../node/ChainNode.js'
import type { Task, TaskResult } from '../types/index.js'
import { generateId, getCurrentTimestamp } from '../utils/index.js'

// ==================== A2A TYPES ====================

export interface A2AAgentCard {
  schema_version: string
  name: string
  description: string
  versions: A2AVersion[]
  contact_email?: string
  provider?: {
    organization: string
    url?: string
  }
}

export interface A2AVersion {
  version: string
  endpoint: string
  supports_streaming: boolean
  supports_push_notifications?: boolean
  auth: A2AAuth
  skills?: A2ASkill[]
}

export interface A2AAuth {
  type: 'none' | 'bearer' | 'basic' | 'oauth2' | 'custom'
  schemes?: string[]
}

export interface A2ASkill {
  id: string
  name: string
  description: string
  input_modes: string[]
  output_modes: string[]
  examples?: string[]
  tags?: string[]
}

export interface A2ATask {
  task_id: string
  status: 'submitted' | 'working' | 'input-required' | 'completed' | 'failed' | 'canceled'
  created_time: string
  updated_time: string
  messages: A2AMessage[]
  artifacts?: A2AArtifact[]
  metadata?: Record<string, unknown>
}

export interface A2AMessage {
  role: 'user' | 'agent'
  parts: A2APart[]
  timestamp?: string
}

export interface A2APart {
  type: 'text' | 'file' | 'data'
  text?: string
  file_name?: string
  mime_type?: string
  data?: unknown
}

export interface A2AArtifact {
  id: string
  name: string
  description?: string
  parts: A2APart[]
  metadata?: Record<string, unknown>
}

// ==================== A2A SERVICE ====================

export class A2AService {
  private static instance: A2AService
  private registeredAgents: Map<string, CAGNode | ChainNode> = new Map()
  private agentCards: Map<string, A2AAgentCard> = new Map()
  private activeTasks: Map<string, A2ATask> = new Map()

  private constructor() {
    console.log('🤝 A2A Service initialized for CAG-Chains')
  }

  public static getInstance(): A2AService {
    if (!A2AService.instance) {
      A2AService.instance = new A2AService()
    }
    return A2AService.instance
  }

  // ==================== AGENT REGISTRATION ====================

  /**
   * Регистрирует любой агент (CAGNode или ChainNode)
   */
  async registerAgent(agent: CAGNode | ChainNode): Promise<string> {
    if (this.isCAGNode(agent)) {
      return await this.registerCAGNode(agent, '/api/a2a/cag')
    } else {
      return await this.registerChainNode(agent, '/api/a2a/chain')
    }
  }

  /**
   * Регистрирует CAG Node как A2A-совместимый агент
   */
  private async registerCAGNode(node: CAGNode, endpoint: string): Promise<string> {
    const nodeState = node.getState()
    const agentId = `cag_${nodeState.id}`
    
    const agentCard: A2AAgentCard = {
      schema_version: '1.0.0',
      name: `CAG Node - ${nodeState.domain}`,
      description: `Specialized AI agent for ${nodeState.domain} domain`,
      versions: [{
        version: '1.0.0',
        endpoint,
        supports_streaming: true,
        auth: { type: 'none' },
        skills: this.createCAGNodeSkills(nodeState)
      }]
    }

    this.registeredAgents.set(agentId, node)
    this.agentCards.set(agentId, agentCard)

    console.log(`🔗 Registered CAG Node as A2A agent: ${agentId}`)
    return agentId
  }

  /**
   * Регистрирует Chain Node как A2A-совместимый агент
   */
  private async registerChainNode(node: ChainNode, endpoint: string): Promise<string> {
    const metadata = node.getMetadata()
    const agentId = `chain_${node.getId()}`
    
    const agentCard: A2AAgentCard = {
      schema_version: '1.0.0',
      name: `Chain Node - ${metadata.contextSnapshot.domains.join('/')}`,
      description: `Immutable AI component with guaranteed quality`,
      versions: [{
        version: metadata.version,
        endpoint,
        supports_streaming: true,
        auth: node.isPublic() ? { type: 'none' } : { type: 'bearer' },
        skills: this.createChainNodeSkills(node)
      }]
    }

    this.registeredAgents.set(agentId, node)
    this.agentCards.set(agentId, agentCard)

    console.log(`🔒 Registered Chain Node as A2A agent: ${agentId}`)
    return agentId
  }

  // ==================== AGENT DISCOVERY ====================

  /**
   * Discover agents by query
   */
  async discoverAgents(query: { domains?: string[]; minQuality?: number }): Promise<Array<{ id: string; name: string; domains: string[]; quality: number }>> {
    const result = []
    
    for (const [agentId, agent] of this.registeredAgents) {
      let domains: string[]
      let quality: number
      
      if (this.isCAGNode(agent)) {
        const state = agent.getState()
        domains = [state.domain, ...state.subdomains]
        quality = state.performanceStats.successRate
      } else {
        const metadata = agent.getMetadata()
        const qualityProfile = agent.getQualityProfile()
        domains = metadata.contextSnapshot.domains
        quality = qualityProfile.get('successRate') || 0.9
      }
      
      // Filter by domains
      if (query.domains && !query.domains.some(d => domains.includes(d))) {
        continue
      }
      
      // Filter by quality
      if (query.minQuality && quality < query.minQuality) {
        continue
      }
      
      result.push({
        id: agentId,
        name: this.agentCards.get(agentId)?.name || agentId,
        domains,
        quality
      })
    }
    
    return result
  }

  /**
   * Delegate task to best agent
   */
  async delegateTask(agentId: string, task: Task): Promise<TaskResult> {
    const agent = this.registeredAgents.get(agentId)
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`)
    }

    if (this.isCAGNode(agent)) {
      const result = await agent.processTask(task)
      return { ...result, createdAt: result.createdAt || new Date() }
    } else {
      return await agent.executeOptimized(task)
    }
  }

  // ==================== HELPER METHODS ====================

  private createCAGNodeSkills(nodeState: any): A2ASkill[] {
    return [{
      id: 'task_processing',
      name: 'General Task Processing',
      description: `Process tasks in ${nodeState.domain} domain`,
      input_modes: ['text', 'data'],
      output_modes: ['text', 'data'],
      tags: [nodeState.domain, ...nodeState.subdomains]
    }]
  }

  private createChainNodeSkills(node: ChainNode): A2ASkill[] {
    const capabilities = node.getCapabilities()
    const metadata = node.getMetadata()
    
    return capabilities.map(capability => ({
      id: capability.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      name: capability,
      description: `Guaranteed quality execution of ${capability}`,
      input_modes: ['text', 'data'],
      output_modes: ['text', 'data'],
      tags: [...metadata.contextSnapshot.domains, 'guaranteed']
    }))
  }

  private isCAGNode(agent: CAGNode | ChainNode): agent is CAGNode {
    return 'getState' in agent && 'processTask' in agent
  }

  private isChainNode(agent: CAGNode | ChainNode): agent is ChainNode {
    return 'getMetadata' in agent && 'executeOptimized' in agent
  }
} 