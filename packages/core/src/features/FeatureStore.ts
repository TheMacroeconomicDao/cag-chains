/**
 * Feature Store - Composable AI Components Management
 * 
 * Современная система управления переиспользуемыми AI компонентами:
 * - Feature versioning и dependency management
 * - Model registry с automated deployment
 * - Component discovery и compatibility checking
 * - Performance tracking и optimization
 * - A2A integration для seamless interoperability
 */

import type { CAGNode } from '../node/CAGNode.js'
import type { ChainNode } from '../node/ChainNode.js'
import type { Task, TaskResult } from '../types/index.js'
import { generateId, getCurrentTimestamp } from '../utils/index.js'
import { CAGCache } from '../cache/index.js'

// ==================== FEATURE STORE TYPES ====================

export interface AIFeature {
  id: string
  name: string
  description: string
  version: string
  
  // Metadata
  category: 'preprocessing' | 'inference' | 'postprocessing' | 'validation' | 'optimization'
  domains: string[]           // Предметные области
  capabilities: string[]      // Конкретные возможности
  tags: string[]             // Произвольные теги
  
  // Implementation
  implementation: FeatureImplementation
  dependencies: string[]      // IDs других features
  interfaces: FeatureInterface[]
  
  // Performance & Quality
  performance: FeaturePerformance
  qualityMetrics: QualityMetrics
  compatibilityMatrix: CompatibilityMatrix
  
  // Lifecycle
  status: 'development' | 'testing' | 'production' | 'deprecated'
  maintainer: string
  license: string
  documentation: string
  
  createdAt: Date
  updatedAt: Date
  lastUsed?: Date
}

export interface FeatureImplementation {
  type: 'chain_node' | 'cag_node' | 'function' | 'service' | 'workflow'
  nodeId?: string            // Если это Node
  codeLocation?: string      // Путь к коду
  containerImage?: string    // Docker образ
  apiEndpoint?: string       // REST API endpoint
  a2aEndpoint?: string       // A2A Agent endpoint
  
  // Runtime requirements
  runtime: {
    memory: number           // MB
    cpu: number             // cores
    gpu?: number            // VRAM in MB
    storage: number         // MB
    networkBandwidth?: number // Mbps
  }
  
  // Configuration
  parameters: FeatureParameter[]
  environment: Record<string, string>
}

export interface FeatureInterface {
  name: string
  type: 'input' | 'output' | 'configuration'
  dataType: 'text' | 'json' | 'binary' | 'stream' | 'tensor'
  schema?: any               // JSON Schema для валидации
  required: boolean
  description: string
  examples: any[]
}

export interface FeatureParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  defaultValue?: any
  constraints?: {
    min?: number
    max?: number
    enum?: any[]
    pattern?: string
  }
  description: string
}

export interface FeaturePerformance {
  latency: {
    average: number         // ms
    p50: number
    p95: number
    p99: number
  }
  throughput: {
    requests_per_second: number
    tokens_per_second?: number
  }
  resourceUsage: {
    cpuUtilization: number  // %
    memoryUsage: number     // %
    gpuUtilization?: number // %
  }
  scalability: {
    maxConcurrentRequests: number
    horizontalScaleFactor: number
  }
}

export interface QualityMetrics {
  accuracy: number           // 0-1
  precision: number         // 0-1
  recall: number           // 0-1
  f1Score: number          // 0-1
  
  // Custom metrics
  domainSpecificMetrics: Record<string, number>
  userSatisfactionScore: number
  errorRate: number
  
  // Test coverage
  testCoverage: {
    unitTests: number       // %
    integrationTests: number // %
    e2eTests: number       // %
  }
}

export interface CompatibilityMatrix {
  compatibleFeatures: string[]     // Feature IDs
  incompatibleFeatures: string[]   // Feature IDs с причинами
  recommendedCombinations: {
    features: string[]
    synergy: number         // Множитель производительности
    description: string
  }[]
  
  // Version compatibility
  supportedVersions: {
    feature: string
    versions: string[]
  }[]
}

export interface FeatureSearchQuery {
  domains?: string[]
  capabilities?: string[]
  categories?: AIFeature['category'][]
  tags?: string[]
  
  // Performance requirements
  maxLatency?: number
  minThroughput?: number
  maxResourceUsage?: {
    memory?: number
    cpu?: number
    gpu?: number
  }
  
  // Quality requirements
  minAccuracy?: number
  minQuality?: number
  
  // Compatibility
  mustBeCompatibleWith?: string[]  // Feature IDs
  mustNotConflictWith?: string[]   // Feature IDs
}

export interface FeatureMatch {
  feature: AIFeature
  score: number              // 0-1 relevance score
  compatibilityScore: number // 0-1 compatibility score
  reason: string
  potentialIssues: string[]
  recommendedConfiguration?: Record<string, any>
}

export interface FeatureComposition {
  id: string
  name: string
  description: string
  features: {
    featureId: string
    configuration: Record<string, any>
    order: number           // Execution order
  }[]
  
  // Predicted performance
  estimatedPerformance: FeaturePerformance
  estimatedQuality: QualityMetrics
  
  // Validation
  isValid: boolean
  validationIssues: string[]
  
  createdAt: Date
}

// ==================== FEATURE STORE ====================

/**
 * Feature Store - Система управления AI компонентами
 */
export class FeatureStore {
  private static instance: FeatureStore
  private features: Map<string, AIFeature> = new Map()
  private compositions: Map<string, FeatureComposition> = new Map()
  private cache: CAGCache
  private usageStats: Map<string, FeatureUsageStats> = new Map()

  private constructor() {
    this.cache = CAGCache.getInstance()
  }

  public static getInstance(): FeatureStore {
    if (!FeatureStore.instance) {
      FeatureStore.instance = new FeatureStore()
    }
    return FeatureStore.instance
  }

  // ==================== FEATURE REGISTRATION ====================

  /**
   * Зарегистрировать новый AI feature
   */
  async registerFeature(feature: Omit<AIFeature, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = generateId('feature')
    
    const fullFeature: AIFeature = {
      ...feature,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Валидация
    await this.validateFeature(fullFeature)
    
    // Проверка совместимости с существующими features
    await this.updateCompatibilityMatrix(fullFeature)
    
    this.features.set(id, fullFeature)
    
    console.log(`📦 Feature Store: Registered feature "${feature.name}" v${feature.version}`)
    
    return id
  }

  /**
   * Автоматическая регистрация Chain Node как feature
   */
  async registerChainNodeAsFeature(chainNode: ChainNode): Promise<string> {
    const metadata = chainNode.getMetadata()
    const qualityProfile = chainNode.getQualityProfile()
    const capabilities = chainNode.getCapabilities()
    
    const feature: Omit<AIFeature, 'id' | 'createdAt' | 'updatedAt'> = {
      name: `ChainNode-${metadata.contextSnapshot.domains[0]}`,
      description: `Locked Chain Node for ${metadata.contextSnapshot.domains[0]} domain`,
      version: metadata.version,
      category: 'inference',
      domains: metadata.contextSnapshot.domains,
      capabilities: capabilities,
      tags: ['chain_node', 'locked', 'immutable'],
      
      implementation: {
        type: 'chain_node',
        nodeId: chainNode.getId(),
        runtime: {
          memory: 512,
          cpu: 1,
          storage: 100
        },
        parameters: [],
        environment: {}
      },
      
      dependencies: [],
      interfaces: [
        {
          name: 'task_input',
          type: 'input',
          dataType: 'json',
          required: true,
          description: 'Task to execute',
          examples: []
        },
        {
          name: 'result_output',
          type: 'output', 
          dataType: 'json',
          required: true,
          description: 'Task execution result',
          examples: []
        }
      ],
      
      performance: {
        latency: {
          average: qualityProfile.get('avgResponseTime') || 1000,
          p50: 800,
          p95: 1500,
          p99: 2000
        },
        throughput: {
          requests_per_second: 10
        },
        resourceUsage: {
          cpuUtilization: 50,
          memoryUsage: 60
        },
        scalability: {
          maxConcurrentRequests: 5,
          horizontalScaleFactor: 1.0
        }
      },
      
      qualityMetrics: {
        accuracy: qualityProfile.get('successRate') || 0.9,
        precision: qualityProfile.get('expertiseLevel') || 0.85,
        recall: 0.85,
        f1Score: 0.85,
        domainSpecificMetrics: {},
        userSatisfactionScore: 0.9,
        errorRate: 1 - (qualityProfile.get('successRate') || 0.9),
        testCoverage: {
          unitTests: 80,
          integrationTests: 70,
          e2eTests: 60
        }
      },
      
      compatibilityMatrix: {
        compatibleFeatures: [],
        incompatibleFeatures: [],
        recommendedCombinations: [],
        supportedVersions: []
      },
      
      status: 'production',
      maintainer: 'cag-chains-system',
      license: 'BSL-1.1',
      documentation: `Chain Node for ${metadata.contextSnapshot.domains[0]} domain processing`
    }

    return await this.registerFeature(feature)
  }

  // ==================== FEATURE DISCOVERY ====================

  /**
   * Поиск features по запросу
   */
  async searchFeatures(query: FeatureSearchQuery): Promise<FeatureMatch[]> {
    const matches: FeatureMatch[] = []
    
    for (const feature of this.features.values()) {
      const match = await this.evaluateFeatureMatch(feature, query)
      if (match.score > 0.3) { // Порог релевантности
        matches.push(match)
      }
    }
    
    // Сортировка по убывающему score × compatibility
    return matches.sort((a, b) => 
      (b.score * b.compatibilityScore) - (a.score * a.compatibilityScore)
    )
  }

  /**
   * Получить рекомендации для задачи
   */
  async getRecommendationsForTask(task: Task): Promise<FeatureMatch[]> {
    const query: FeatureSearchQuery = {
      domains: task.requirements.domains,
      maxLatency: task.requirements.timeConstraint,
      minQuality: task.requirements.qualityTarget || 0.8
    }
    
    return await this.searchFeatures(query)
  }

  // ==================== FEATURE COMPOSITION ====================

  /**
   * Создать композицию из нескольких features
   */
  async createComposition(
    name: string,
    description: string,
    featureConfigs: { featureId: string; configuration: Record<string, any> }[]
  ): Promise<FeatureComposition> {
    const id = generateId('composition')
    
    // Валидация совместимости
    const features = featureConfigs.map(config => this.features.get(config.featureId)!)
    const isCompatible = await this.validateFeatureCompatibility(features)
    
    if (!isCompatible) {
      throw new Error('Features are not compatible for composition')
    }
    
    // Создание композиции
    const composition: FeatureComposition = {
      id,
      name,
      description,
      features: featureConfigs.map((config, index) => ({
        ...config,
        order: index
      })),
      estimatedPerformance: await this.estimateCompositionPerformance(features),
      estimatedQuality: await this.estimateCompositionQuality(features),
      isValid: true,
      validationIssues: [],
      createdAt: new Date()
    }
    
    this.compositions.set(id, composition)
    
    console.log(`🔗 Feature Store: Created composition "${name}" with ${features.length} features`)
    
    return composition
  }

  // ==================== HELPER METHODS ====================

  private async validateFeature(feature: AIFeature): Promise<void> {
    // Валидация feature структуры
    if (!feature.name || !feature.version) {
      throw new Error('Feature must have name and version')
    }
    
    if (feature.dependencies.length > 0) {
      // Проверка существования зависимостей
      for (const depId of feature.dependencies) {
        if (!this.features.has(depId)) {
          throw new Error(`Dependency ${depId} not found`)
        }
      }
    }
  }

  private async updateCompatibilityMatrix(feature: AIFeature): Promise<void> {
    // Автоматическое обновление матрицы совместимости
    for (const existingFeature of this.features.values()) {
      const compatibility = await this.checkCompatibility(feature, existingFeature)
      
      if (compatibility.compatible) {
        feature.compatibilityMatrix.compatibleFeatures.push(existingFeature.id)
        existingFeature.compatibilityMatrix.compatibleFeatures.push(feature.id)
      } else {
        feature.compatibilityMatrix.incompatibleFeatures.push(existingFeature.id)
        existingFeature.compatibilityMatrix.incompatibleFeatures.push(feature.id)
      }
    }
  }

  private async evaluateFeatureMatch(feature: AIFeature, query: FeatureSearchQuery): Promise<FeatureMatch> {
    let score = 0
    let compatibilityScore = 1
    const reasons: string[] = []
    const issues: string[] = []
    
    // Domain match
    if (query.domains) {
      const domainMatch = query.domains.some(d => feature.domains.includes(d))
      if (domainMatch) {
        score += 0.4
        reasons.push('Domain match')
      }
    }
    
    // Capability match
    if (query.capabilities) {
      const capabilityMatch = query.capabilities.some(c => feature.capabilities.includes(c))
      if (capabilityMatch) {
        score += 0.3
        reasons.push('Capability match')
      }
    }
    
    // Category match
    if (query.categories && query.categories.includes(feature.category)) {
      score += 0.2
      reasons.push('Category match')
    }
    
    // Performance requirements
    if (query.maxLatency && feature.performance.latency.average > query.maxLatency) {
      compatibilityScore *= 0.5
      issues.push('Latency too high')
    }
    
    // Quality requirements
    if (query.minQuality && feature.qualityMetrics.accuracy < query.minQuality) {
      compatibilityScore *= 0.7
      issues.push('Quality below threshold')
    }
    
    return {
      feature,
      score: Math.min(score, 1),
      compatibilityScore,
      reason: reasons.join(', ') || 'No specific match',
      potentialIssues: issues
    }
  }

  private async checkCompatibility(feature1: AIFeature, feature2: AIFeature): Promise<{ compatible: boolean; reason: string }> {
    // Упрощенная проверка совместимости
    const domainOverlap = feature1.domains.some(d => feature2.domains.includes(d))
    const categoryConflict = feature1.category === feature2.category && 
                           ['inference', 'validation'].includes(feature1.category)
    
    if (categoryConflict && domainOverlap) {
      return { compatible: false, reason: 'Same category in same domain' }
    }
    
    return { compatible: true, reason: 'No conflicts detected' }
  }

  private async validateFeatureCompatibility(features: AIFeature[]): Promise<boolean> {
    for (let i = 0; i < features.length; i++) {
      for (let j = i + 1; j < features.length; j++) {
        const compatibility = await this.checkCompatibility(features[i], features[j])
        if (!compatibility.compatible) {
          return false
        }
      }
    }
    return true
  }

  private async estimateCompositionPerformance(features: AIFeature[]): Promise<FeaturePerformance> {
    // Упрощенная оценка производительности композиции
    const totalLatency = features.reduce((sum, f) => sum + f.performance.latency.average, 0)
    const minThroughput = Math.min(...features.map(f => f.performance.throughput.requests_per_second))
    
    return {
      latency: {
        average: totalLatency,
        p50: totalLatency * 0.8,
        p95: totalLatency * 1.5,
        p99: totalLatency * 2.0
      },
      throughput: {
        requests_per_second: minThroughput
      },
      resourceUsage: {
        cpuUtilization: Math.min(100, features.reduce((sum, f) => sum + f.performance.resourceUsage.cpuUtilization, 0)),
        memoryUsage: Math.min(100, features.reduce((sum, f) => sum + f.performance.resourceUsage.memoryUsage, 0))
      },
      scalability: {
        maxConcurrentRequests: Math.min(...features.map(f => f.performance.scalability.maxConcurrentRequests)),
        horizontalScaleFactor: features.reduce((product, f) => product * f.performance.scalability.horizontalScaleFactor, 1)
      }
    }
  }

  private async estimateCompositionQuality(features: AIFeature[]): Promise<QualityMetrics> {
    // Упрощенная оценка качества композиции
    const avgAccuracy = features.reduce((sum, f) => sum + f.qualityMetrics.accuracy, 0) / features.length
    
    return {
      accuracy: avgAccuracy * 0.95, // Небольшое снижение из-за композиции
      precision: avgAccuracy * 0.93,
      recall: avgAccuracy * 0.93,
      f1Score: avgAccuracy * 0.93,
      domainSpecificMetrics: {},
      userSatisfactionScore: avgAccuracy * 0.95,
      errorRate: 1 - (avgAccuracy * 0.95),
      testCoverage: {
        unitTests: 70,
        integrationTests: 60,
        e2eTests: 50
      }
    }
  }

  // ==================== PUBLIC API ====================

  /**
   * Получить feature по ID
   */
  getFeature(id: string): AIFeature | undefined {
    return this.features.get(id)
  }

  /**
   * Получить все features
   */
  getAllFeatures(): AIFeature[] {
    return Array.from(this.features.values())
  }

  /**
   * Получить статистику Feature Store
   */
  getStats() {
    return {
      totalFeatures: this.features.size,
      totalCompositions: this.compositions.size,
      featuresPerCategory: this.getFeaturesPerCategory(),
      avgQualityScore: this.getAverageQualityScore()
    }
  }

  private getFeaturesPerCategory() {
    const categories: Record<string, number> = {}
    for (const feature of this.features.values()) {
      categories[feature.category] = (categories[feature.category] || 0) + 1
    }
    return categories
  }

  private getAverageQualityScore(): number {
    const features = Array.from(this.features.values())
    if (features.length === 0) return 0
    
    return features.reduce((sum, f) => sum + f.qualityMetrics.accuracy, 0) / features.length
  }
}

// ==================== USAGE TRACKING ====================

interface FeatureUsageStats {
  featureId: string
  totalUsage: number
  lastUsed: Date
  avgExecutionTime: number
  successRate: number
  userFeedback: number[] // Rating scores
} 