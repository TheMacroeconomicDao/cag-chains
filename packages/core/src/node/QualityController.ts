import type { CAGNode } from './CAGNode.js'
import type { ChainNode, QualityRequirement, PerformanceGuarantee, ReusabilityRights } from './ChainNode.js'
import type { Task, TaskResult } from '../types/index.js'
import { generateId } from '../utils/index.js'

export interface QualityAssessment {
  nodeId: string
  isEligible: boolean
  score: number
  requirements: QualityRequirementResult[]
  recommendations: string[]
  lockingConfig?: {
    qualityRequirements: QualityRequirement[]
    performanceGuarantees: PerformanceGuarantee[]
    reusabilityRights: ReusabilityRights
  }
}

export interface QualityRequirementResult {
  requirement: QualityRequirement
  currentValue: number
  passed: boolean
  gap?: number
}

export interface TestSuite {
  domain: string
  testCases: TestCase[]
}

export interface TestCase {
  id: string
  description: string
  task: Task
  expectedQuality: number
  weight: number
}

/**
 * Quality Controller - Validates nodes before Chain Node locking
 * Ensures only high-quality, proven nodes become reusable Chain Nodes
 */
export class QualityController {
  private testSuites: Map<string, TestSuite> = new Map()
  private assessmentHistory: Map<string, QualityAssessment[]> = new Map()

  constructor() {
    this.initializeTestSuites()
    console.log('🎯 Quality Controller initialized with domain test suites')
  }

  /**
   * Comprehensive quality assessment for Chain Node eligibility
   */
  async assessNodeQuality(node: CAGNode, customRequirements?: QualityRequirement[]): Promise<QualityAssessment> {
    console.log(`🔍 Assessing quality for node: ${node.getState().id}`)
    
    const nodeState = node.getState()
    const requirements = customRequirements || this.getDefaultRequirements(nodeState.domain)
    
    const requirementResults: QualityRequirementResult[] = []
    let totalScore = 0
    let passedCount = 0

    // Test each quality requirement
    for (const requirement of requirements) {
      const result = await this.testRequirement(node, requirement)
      requirementResults.push(result)
      
      if (result.passed) {
        passedCount++
        totalScore += this.calculateRequirementScore(result)
      }
    }

    // Calculate overall score
    const overallScore = totalScore / requirements.length
    const isEligible = passedCount === requirements.length && overallScore >= 0.8

    // Generate recommendations
    const recommendations = this.generateRecommendations(requirementResults, nodeState)

    // Create locking configuration if eligible
    let lockingConfig = undefined
    if (isEligible) {
      lockingConfig = this.createLockingConfig(requirementResults, nodeState)
    }

    const assessment: QualityAssessment = {
      nodeId: nodeState.id,
      isEligible,
      score: overallScore,
      requirements: requirementResults,
      recommendations,
      lockingConfig
    }

    // Store assessment in history
    const history = this.assessmentHistory.get(nodeState.id) || []
    history.push(assessment)
    this.assessmentHistory.set(nodeState.id, history)

    console.log(`✅ Quality assessment completed: ${Math.round(overallScore * 100)}% (${isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'})`)

    return assessment
  }

  /**
   * Lock CAG Node as Chain Node after quality validation
   */
  async lockAsChainNode(node: CAGNode, customConfig?: {
    qualityRequirements?: QualityRequirement[]
    reusabilityRights?: Partial<ReusabilityRights>
  }): Promise<ChainNode> {
    // First assess quality
    const assessment = await this.assessNodeQuality(node, customConfig?.qualityRequirements)
    
    if (!assessment.isEligible) {
      throw new Error(`Node quality insufficient for Chain Node locking. Score: ${Math.round(assessment.score * 100)}%. Requirements: ${assessment.recommendations.join('; ')}`)
    }

    if (!assessment.lockingConfig) {
      throw new Error('Locking configuration not generated - internal error')
    }

    // Apply custom reusability rights if provided
    if (customConfig?.reusabilityRights) {
      assessment.lockingConfig.reusabilityRights = {
        ...assessment.lockingConfig.reusabilityRights,
        ...customConfig.reusabilityRights
      }
    }

    // Create Chain Node
    const { ChainNode } = await import('./ChainNode.js')
    const chainNode = new ChainNode(node, assessment.lockingConfig)

    console.log(`🔒 Node successfully locked as Chain Node: ${chainNode.getId()}`)

    return chainNode
  }

  /**
   * Run domain-specific tests to validate expertise
   */
  async runDomainTests(node: CAGNode, domain?: string): Promise<{ passed: number; total: number; results: TaskResult[] }> {
    const targetDomain = domain || node.getState().domain
    const testSuite = this.testSuites.get(targetDomain.toLowerCase())
    
    if (!testSuite) {
      console.warn(`⚠️ No test suite found for domain: ${targetDomain}`)
      return { passed: 0, total: 0, results: [] }
    }

    console.log(`🧪 Running domain tests for ${targetDomain}: ${testSuite.testCases.length} test cases`)

    const results: TaskResult[] = []
    let passedCount = 0

    for (const testCase of testSuite.testCases) {
      try {
        const result = await node.processTask(testCase.task)
        results.push({
          ...result,
          createdAt: new Date()
        })

        if (result.success && (result.qualityScore ?? 0) >= testCase.expectedQuality) {
          passedCount++
        }
      } catch (error) {
        console.error(`❌ Test case failed: ${testCase.id}`, error)
        results.push({
          id: testCase.id,
          success: false,
          tokensUsed: 0,
          responseTime: 0,
          qualityScore: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
          createdAt: new Date()
        })
      }
    }

    const passRate = passedCount / testSuite.testCases.length
    console.log(`📊 Domain tests completed: ${passedCount}/${testSuite.testCases.length} passed (${Math.round(passRate * 100)}%)`)

    return {
      passed: passedCount,
      total: testSuite.testCases.length,
      results
    }
  }

  private async testRequirement(node: CAGNode, requirement: QualityRequirement): Promise<QualityRequirementResult> {
    const nodeState = node.getState()
    let currentValue: number

    switch (requirement.metric) {
      case 'successRate':
        currentValue = nodeState.performanceStats.successRate
        break
      case 'responseTime':
        currentValue = nodeState.performanceStats.avgResponseTime
        break
      case 'tokenEfficiency':
        currentValue = nodeState.performanceStats.tokenEfficiency
        break
      case 'qualityScore':
        // Run test cases to calculate quality
        const domainTests = await this.runDomainTests(node)
        currentValue = domainTests.results.reduce((sum, result) => sum + (result.qualityScore ?? 0), 0) / Math.max(domainTests.results.length, 1)
        break
      default:
        currentValue = 0
    }

    const passed = currentValue >= requirement.threshold
    const gap = passed ? 0 : requirement.threshold - currentValue

    return {
      requirement,
      currentValue,
      passed,
      gap
    }
  }

  private calculateRequirementScore(result: QualityRequirementResult): number {
    if (!result.passed) return 0
    
    // Bonus score for exceeding threshold
    const excess = result.currentValue - result.requirement.threshold
    const bonus = Math.min(excess / result.requirement.threshold, 0.5) // Max 50% bonus
    
    return 1 + bonus
  }

  private generateRecommendations(results: QualityRequirementResult[], nodeState: any): string[] {
    const recommendations: string[] = []

    for (const result of results) {
      if (!result.passed) {
        const metric = result.requirement.metric
        const current = Math.round(result.currentValue * 100) / 100
        const threshold = result.requirement.threshold
        
        switch (metric) {
          case 'successRate':
            recommendations.push(`Improve success rate: ${current} < ${threshold}. Train with more diverse scenarios.`)
            break
          case 'responseTime':
            recommendations.push(`Reduce response time: ${current}ms > ${threshold}ms. Optimize context or use larger node type.`)
            break
          case 'tokenEfficiency':
            recommendations.push(`Improve token efficiency: ${current} < ${threshold}. Optimize prompts and context compression.`)
            break
          case 'qualityScore':
            recommendations.push(`Improve quality score: ${current} < ${threshold}. Enhance domain expertise and training.`)
            break
        }
      }
    }

    // Additional domain-specific recommendations
    if (nodeState.expertiseLevel < 0.8) {
      recommendations.push('Increase expertise level through more domain-specific training')
    }

    if (nodeState.contextWindow.currentUsage > nodeState.contextWindow.maxTokens * 0.9) {
      recommendations.push('Optimize context usage - current utilization too high for reliable locking')
    }

    return recommendations
  }

  private createLockingConfig(results: QualityRequirementResult[], nodeState: any): {
    qualityRequirements: QualityRequirement[]
    performanceGuarantees: PerformanceGuarantee[]
    reusabilityRights: ReusabilityRights
  } {
    const qualityRequirements = results.map(r => r.requirement)
    
    const performanceGuarantees: PerformanceGuarantee[] = results.map(result => ({
      metric: result.requirement.metric,
      minValue: result.currentValue * 0.9, // Guarantee 90% of current performance
      confidence: 0.95,
      basedOnSamples: result.requirement.testCases || 10
    }))

    const reusabilityRights: ReusabilityRights = {
      isPublic: true, // Default to public for MVP
      isCommercial: false, // Default to non-commercial
      licenseType: 'open',
      restrictions: ['attribution-required', 'same-domain-use-only']
    }

    return {
      qualityRequirements,
      performanceGuarantees,
      reusabilityRights
    }
  }

  private getDefaultRequirements(domain: string): QualityRequirement[] {
    const baseRequirements: QualityRequirement[] = [
      {
        metric: 'successRate',
        threshold: 0.85,
        evaluationPeriod: 60000, // 1 minute
        testCases: 10
      },
      {
        metric: 'qualityScore',
        threshold: 0.75,
        evaluationPeriod: 60000,
        testCases: 5
      }
    ]

    // Domain-specific requirements
    switch (domain.toLowerCase()) {
      case 'frontend':
        baseRequirements.push({
          metric: 'responseTime',
          threshold: 5000, // 5 seconds for frontend tasks
          evaluationPeriod: 30000,
          testCases: 5
        })
        break
      case 'backend':
        baseRequirements.push({
          metric: 'tokenEfficiency',
          threshold: 0.8,
          evaluationPeriod: 60000,
          testCases: 10
        })
        break
      case 'ai':
        baseRequirements.push({
          metric: 'qualityScore',
          threshold: 0.85, // Higher quality threshold for AI domain
          evaluationPeriod: 120000,
          testCases: 15
        })
        break
    }

    return baseRequirements
  }

  private initializeTestSuites(): void {
    // Frontend test suite
    this.testSuites.set('frontend', {
      domain: 'frontend',
      testCases: [
        {
          id: 'react-component',
          description: 'Create a React component',
          task: {
            id: generateId(),
            type: 'component_creation',
            description: 'Create a responsive React button component with TypeScript',
            requirements: {
              domains: ['frontend'],
              complexity: 4,
              qualityTarget: 0.8
            },
            dependencies: [],
            context: { framework: 'React', typescript: true },
            createdAt: new Date(),
            updatedAt: new Date()
          },
          expectedQuality: 0.8,
          weight: 1.0
        },
        {
          id: 'css-layout',
          description: 'Create CSS layout',
          task: {
            id: generateId(),
            type: 'layout_design',
            description: 'Create a responsive grid layout using CSS Grid and Flexbox',
            requirements: {
              domains: ['frontend'],
              complexity: 3,
              qualityTarget: 0.75
            },
            dependencies: [],
            context: { responsive: true, modern: true },
            createdAt: new Date(),
            updatedAt: new Date()
          },
          expectedQuality: 0.75,
          weight: 0.8
        }
      ]
    })

    // Backend test suite
    this.testSuites.set('backend', {
      domain: 'backend',
      testCases: [
        {
          id: 'api-endpoint',
          description: 'Create REST API endpoint',
          task: {
            id: generateId(),
            type: 'api_development',
            description: 'Create a REST API endpoint for user management with validation',
            requirements: {
              domains: ['backend'],
              complexity: 5,
              qualityTarget: 0.8
            },
            dependencies: [],
            context: { framework: 'Express', database: 'PostgreSQL' },
            createdAt: new Date(),
            updatedAt: new Date()
          },
          expectedQuality: 0.8,
          weight: 1.0
        }
      ]
    })

    // AI test suite
    this.testSuites.set('ai', {
      domain: 'ai',
      testCases: [
        {
          id: 'prompt-optimization',
          description: 'Optimize AI prompt',
          task: {
            id: generateId(),
            type: 'prompt_engineering',
            description: 'Optimize an AI prompt for code generation with better accuracy',
            requirements: {
              domains: ['ai'],
              complexity: 6,
              qualityTarget: 0.85
            },
            dependencies: [],
            context: { model: 'GPT-4', domain: 'code_generation' },
            createdAt: new Date(),
            updatedAt: new Date()
          },
          expectedQuality: 0.85,
          weight: 1.0
        }
      ]
    })

    console.log(`✅ Initialized ${this.testSuites.size} domain test suites`)
  }

  // Public getters for monitoring and debugging
  getAssessmentHistory(nodeId: string): QualityAssessment[] {
    return this.assessmentHistory.get(nodeId) || []
  }

  getTestSuite(domain: string): TestSuite | undefined {
    return this.testSuites.get(domain.toLowerCase())
  }

  getAvailableDomains(): string[] {
    return Array.from(this.testSuites.keys())
  }
} 