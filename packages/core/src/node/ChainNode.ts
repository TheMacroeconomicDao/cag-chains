import type { CAGNode } from './CAGNode.js'
import type { Task, TaskResult, A2AHeader } from '../types/index.js'
import { generateId, generateHash, getCurrentTimestamp } from '../utils/index.js'
import { PrecisionGuard } from '../guard/PrecisionGuard.js'

export interface ChainNodeMetadata {
  originalNodeId: string
  lockingTimestamp: number
  lockingConditions: QualityRequirement[]
  contextSnapshot: ContextSnapshot
  performanceGuarantees: PerformanceGuarantee[]
  reusabilityRights: ReusabilityRights
  version: string
}

export interface QualityRequirement {
  metric: 'successRate' | 'responseTime' | 'tokenEfficiency' | 'qualityScore'
  threshold: number
  evaluationPeriod: number // in milliseconds
  testCases?: number
}

export interface ContextSnapshot {
  contextHash: string
  contextSize: number
  domains: string[]
  expertiseLevel: number
  trainingData: Record<string, unknown>
  capabilities: string[]
  limitations: string[]
}

export interface PerformanceGuarantee {
  metric: string
  minValue?: number
  maxValue?: number
  confidence: number
  basedOnSamples: number
}

export interface ReusabilityRights {
  isPublic: boolean
  isCommercial: boolean
  licenseType: 'open' | 'commercial' | 'restricted'
  pricePerUse?: number
  maxUses?: number
  restrictions: string[]
}

export interface ChainNodeExecutionResult extends TaskResult {
  guaranteedMetrics: Record<string, number>
  contextIntegrity: boolean
  reusabilityTracking: {
    usageCount: number
    lastUsed: Date
    totalRevenue?: number
  }
}

/**
 * Chain Node - Immutable, high-quality AI component
 * Locked CAG Node with guaranteed performance and reusable context
 */
export class ChainNode {
  private readonly metadata: ChainNodeMetadata
  private readonly immutableContext: string
  private readonly qualityProfile: Map<string, number>
  private readonly guard: PrecisionGuard
  private usageCount: number = 0
  private revenue: number = 0

  constructor(
    private readonly originalNode: CAGNode,
    private readonly lockingConfig: {
      qualityRequirements: QualityRequirement[]
      performanceGuarantees: PerformanceGuarantee[]
      reusabilityRights: ReusabilityRights
    }
  ) {
    // Create immutable snapshot of the node
    this.metadata = this.createMetadata()
    this.immutableContext = this.captureContext()
    this.qualityProfile = this.captureQualityProfile()
    
    // Initialize Guard with A2A header
    this.guard = new PrecisionGuard(this.createA2AHeader())
    
    console.log(`🔒 Chain Node created with Guard: ${this.metadata.originalNodeId} -> ${this.getId()}`)
  }

  private createMetadata(): ChainNodeMetadata {
    const nodeState = this.originalNode.getState()
    
    return {
      originalNodeId: nodeState.id,
      lockingTimestamp: getCurrentTimestamp(),
      lockingConditions: this.lockingConfig.qualityRequirements,
      contextSnapshot: {
        contextHash: generateHash(JSON.stringify(nodeState)),
        contextSize: nodeState.contextWindow.currentUsage,
        domains: [nodeState.domain, ...nodeState.subdomains],
        expertiseLevel: nodeState.expertiseLevel,
        trainingData: {}, // Would contain training data snapshot
        capabilities: this.extractCapabilities(nodeState),
        limitations: this.extractLimitations(nodeState)
      },
      performanceGuarantees: this.lockingConfig.performanceGuarantees,
      reusabilityRights: this.lockingConfig.reusabilityRights,
      version: '1.0.0'
    }
  }

  /**
   * Создает A2A заголовок для Guard системы
   */
  private createA2AHeader(): A2AHeader {
    // Создаем карту компетенций из доменов
    const competenceMap: Record<string, number> = {}
    this.metadata.contextSnapshot.domains.forEach(domain => {
      competenceMap[domain] = this.metadata.contextSnapshot.expertiseLevel
    })
    
    return {
      nodeId: this.getId(),
      expertDomains: this.metadata.contextSnapshot.domains,
      competenceMap,
      capabilities: this.metadata.contextSnapshot.capabilities,
      contextHash: this.metadata.contextSnapshot.contextHash,
      guardThresholds: {
        minConfidence: 0.8,  // 80% минимум для пропуска
        rejectBelow: 0.3     // Ниже 30% - четкий отказ
      },
      blockedAt: new Date(this.metadata.lockingTimestamp),
      version: this.metadata.version
    }
  }

  private captureContext(): string {
    // In a real implementation, this would capture the full context
    // For MVP, we'll create a simplified immutable context
    const nodeState = this.originalNode.getState()
    
    const contextData = {
      systemPrompt: `Locked Chain Node - Domain: ${nodeState.domain}`,
      domain: nodeState.domain,
      subdomains: nodeState.subdomains,
      expertiseLevel: nodeState.expertiseLevel,
      capabilities: this.extractCapabilities(nodeState),
      lockingTimestamp: this.metadata.lockingTimestamp,
      version: this.metadata.version
    }
    
    return JSON.stringify(contextData)
  }

  private captureQualityProfile(): Map<string, number> {
    const nodeState = this.originalNode.getState()
    const performance = nodeState.performanceStats
    
    return new Map([
      ['successRate', performance.successRate],
      ['avgResponseTime', performance.avgResponseTime],
      ['tokenEfficiency', performance.tokenEfficiency],
      ['expertiseLevel', nodeState.expertiseLevel],
      ['contextUtilization', nodeState.contextWindow.currentUsage / nodeState.contextWindow.maxTokens]
    ])
  }

  private extractCapabilities(nodeState: any): string[] {
    return [
      `${nodeState.domain}-expert`,
      `${nodeState.domain}-analysis`,
      'problem-solving',
      'context-optimization',
      ...nodeState.subdomains.map((sub: string) => `${sub}-specialist`)
    ]
  }

  private extractLimitations(nodeState: any): string[] {
    const limitations: string[] = []
    
    if (nodeState.expertiseLevel < 0.8) {
      limitations.push('Limited expertise - use for basic tasks only')
    }
    
    if (nodeState.contextWindow.currentUsage > nodeState.contextWindow.maxTokens * 0.9) {
      limitations.push('High context usage - may have reduced performance')
    }
    
    limitations.push(`Domain-specific: optimized for ${nodeState.domain} only`)
    limitations.push('Immutable context - cannot learn new information')
    
    return limitations
  }

  /**
   * Execute task with guaranteed performance
   */
  async executeOptimized(task: Task): Promise<ChainNodeExecutionResult> {
    const startTime = getCurrentTimestamp()
    
    console.log(`🛡️ Chain Node ${this.getId()} - Guard filtering task...`)
    
    // Guard проверка ПЕРЕД выполнением
    const guardDecision = await this.guard.filterIncomingTask(task)
    
    if (guardDecision.action === 'reject') {
      console.log(`🚫 Guard rejected task: ${guardDecision.reasoning}`)
      return {
        id: generateId(),
        success: false,
        tokensUsed: 0,
        responseTime: guardDecision.processingTime,
        qualityScore: 0,
        createdAt: new Date(),
        error: `Guard rejected: ${guardDecision.reasoning}`,
        guaranteedMetrics: {},
        contextIntegrity: true,
        reusabilityTracking: {
          usageCount: this.usageCount,
          lastUsed: new Date()
        }
      }
    }

    if (guardDecision.action === 'redirect') {
      console.log(`🔄 Guard redirected task: ${guardDecision.reasoning}`)
      // В реальном проекте здесь был бы A2A redirect
      return {
        id: generateId(),
        success: false,
        tokensUsed: 0,
        responseTime: guardDecision.processingTime,
        qualityScore: 0,
        createdAt: new Date(),
        error: `Redirected: ${guardDecision.reasoning}. Suggested: ${guardDecision.suggestedNodeType}`,
        guaranteedMetrics: {},
        contextIntegrity: true,
        reusabilityTracking: {
          usageCount: this.usageCount,
          lastUsed: new Date()
        }
      }
    }

    // Guard разрешил - выполняем с замороженным контекстом
    console.log(`✅ Guard approved (confidence: ${guardDecision.confidence.toFixed(2)}, match: ${guardDecision.contextMatchScore.toFixed(2)})`)
    
    try {
      // Execute using original node but with locked context
      let result = await this.originalNode.processTask(task)
      
      // Ensure result has createdAt
      if (!result.createdAt) {
        result = { ...result, createdAt: new Date() }
      }
      
      const endTime = getCurrentTimestamp()
      const responseTime = endTime - startTime
      
      // Verify guarantees are met
      const guaranteesMet = this.verifyPerformanceGuarantees(result, responseTime)
      
      if (!guaranteesMet.allMet) {
        console.warn(`⚠️ Performance guarantees not met: ${guaranteesMet.violations.join(', ')}`)
      }
      
      // Update usage tracking
      this.updateUsageTracking()
      
      return {
        ...result,
        guaranteedMetrics: this.getGuaranteedMetrics(),
        contextIntegrity: this.verifyContextIntegrity(),
        reusabilityTracking: {
          usageCount: this.usageCount,
          lastUsed: new Date(),
          totalRevenue: this.revenue
        }
      }
    } catch (error) {
      console.error(`❌ Chain Node execution failed:`, error)
      throw error
    }
  }

  /**
   * Clone Chain Node with optional customization
   */
  async clone(customization?: {
    reusabilityRights?: Partial<ReusabilityRights>
    additionalCapabilities?: string[]
    restrictions?: string[]
  }): Promise<ChainNode> {
    // Check cloning rights
    if (!this.metadata.reusabilityRights.isPublic && !customization) {
      throw new Error('Chain Node cloning not permitted - commercial license required')
    }

    // Create new instance with customization
    const clonedConfig = {
      qualityRequirements: [...this.lockingConfig.qualityRequirements],
      performanceGuarantees: [...this.lockingConfig.performanceGuarantees],
      reusabilityRights: {
        ...this.lockingConfig.reusabilityRights,
        ...customization?.reusabilityRights
      }
    }

    const clonedNode = new ChainNode(this.originalNode, clonedConfig)
    
    console.log(`🔄 Chain Node cloned: ${this.getId()} -> ${clonedNode.getId()}`)
    
    return clonedNode
  }

  /**
   * Validate if task is compatible with this Chain Node
   */
  validateTaskCompatibility(task: Task): { isCompatible: boolean; reason?: string; confidence: number } {
    const requiredDomains = task.requirements.domains
    const nodeDomains = this.metadata.contextSnapshot.domains
    
    // Check domain compatibility
    const domainMatch = requiredDomains.some(domain => 
      nodeDomains.some(nodeDomain => 
        nodeDomain.toLowerCase().includes(domain.toLowerCase()) ||
        domain.toLowerCase().includes(nodeDomain.toLowerCase())
      )
    )
    
    if (!domainMatch) {
      return {
        isCompatible: false,
        reason: `Required domains [${requiredDomains.join(', ')}] not covered by node domains [${nodeDomains.join(', ')}]`,
        confidence: 0
      }
    }
    
    // Check complexity compatibility
    const maxComplexity = Math.floor(this.metadata.contextSnapshot.expertiseLevel * 10)
    if (task.requirements.complexity > maxComplexity) {
      return {
        isCompatible: false,
        reason: `Task complexity ${task.requirements.complexity} exceeds node capability ${maxComplexity}`,
        confidence: 0
      }
    }
    
    // Calculate confidence based on expertise match
    const domainMatchRatio = requiredDomains.filter(domain => 
      nodeDomains.some(nodeDomain => nodeDomain.toLowerCase() === domain.toLowerCase())
    ).length / requiredDomains.length
    
    const complexityMatch = 1 - (task.requirements.complexity / maxComplexity)
    const confidence = (domainMatchRatio * 0.7) + (complexityMatch * 0.3)
    
    return {
      isCompatible: true,
      confidence
    }
  }

  private verifyPerformanceGuarantees(result: TaskResult, responseTime: number): { allMet: boolean; violations: string[] } {
    const violations: string[] = []
    
    for (const guarantee of this.metadata.performanceGuarantees) {
      let actualValue: number | undefined
      
      switch (guarantee.metric) {
        case 'responseTime':
          actualValue = responseTime
          break
        case 'qualityScore':
          actualValue = result.qualityScore
          break
        case 'successRate':
          actualValue = result.success ? 1 : 0
          break
        default:
          continue
      }
      
      if (actualValue === undefined) {
        violations.push(`${guarantee.metric} not available in result`)
        continue
      }
      
      if (guarantee.minValue && actualValue < guarantee.minValue) {
        violations.push(`${guarantee.metric} below minimum: ${actualValue} < ${guarantee.minValue}`)
      }
      
      if (guarantee.maxValue && actualValue > guarantee.maxValue) {
        violations.push(`${guarantee.metric} above maximum: ${actualValue} > ${guarantee.maxValue}`)
      }
    }
    
    return {
      allMet: violations.length === 0,
      violations
    }
  }

  private verifyContextIntegrity(): boolean {
    // In a real implementation, this would verify the context hasn't been tampered with
    const currentContextHash = generateHash(this.immutableContext)
    return currentContextHash === this.metadata.contextSnapshot.contextHash
  }

  private getGuaranteedMetrics(): Record<string, number> {
    const metrics: Record<string, number> = {}
    
    for (const guarantee of this.metadata.performanceGuarantees) {
      if (guarantee.minValue) {
        metrics[`min_${guarantee.metric}`] = guarantee.minValue
      }
      if (guarantee.maxValue) {
        metrics[`max_${guarantee.metric}`] = guarantee.maxValue
      }
      metrics[`${guarantee.metric}_confidence`] = guarantee.confidence
    }
    
    return metrics
  }

  private updateUsageTracking(): void {
    this.usageCount++
    
    if (this.metadata.reusabilityRights.pricePerUse) {
      this.revenue += this.metadata.reusabilityRights.pricePerUse
    }
    
    // Check usage limits
    if (this.metadata.reusabilityRights.maxUses && 
        this.usageCount >= this.metadata.reusabilityRights.maxUses) {
      console.warn(`⚠️ Chain Node usage limit reached: ${this.usageCount}/${this.metadata.reusabilityRights.maxUses}`)
    }
  }

  // Public getters
  getId(): string {
    return generateId(`chain_${this.metadata.originalNodeId}_${this.metadata.lockingTimestamp}`)
  }

  getMetadata(): ChainNodeMetadata {
    return { ...this.metadata }
  }

  getQualityProfile(): Map<string, number> {
    return new Map(this.qualityProfile)
  }

  getUsageStats(): { count: number; revenue: number; lastUsed?: Date } {
    return {
      count: this.usageCount,
      revenue: this.revenue,
      lastUsed: this.usageCount > 0 ? new Date() : undefined
    }
  }

  getCapabilities(): string[] {
    return [...this.metadata.contextSnapshot.capabilities]
  }

  getLimitations(): string[] {
    return [...this.metadata.contextSnapshot.limitations]
  }

  isPublic(): boolean {
    return this.metadata.reusabilityRights.isPublic
  }

  isCommercial(): boolean {
    return this.metadata.reusabilityRights.isCommercial
  }

  getPrice(): number | undefined {
    return this.metadata.reusabilityRights.pricePerUse
  }
} 