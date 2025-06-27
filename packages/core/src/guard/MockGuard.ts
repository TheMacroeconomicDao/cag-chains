import type { Task, A2AHeader, GuardDecision } from '../types/index.js'

/**
 * MockGuard - версия для тестирования без OpenAI API
 * Имитирует логику PrecisionGuard на основе правил
 */
export class MockGuard {
  private header: A2AHeader
  
  constructor(nodeHeader: A2AHeader) {
    this.header = nodeHeader
    console.log(`🛡️ MockGuard initialized for node ${nodeHeader.nodeId}`)
  }

  /**
   * Mock фильтрация на основе логических правил
   */
  async filterIncomingTask(task: Task): Promise<GuardDecision> {
    const startTime = Date.now()
    
    // Проверка на null или undefined задачу
    if (!task || !task.description) {
      return {
        action: 'reject',
        confidence: 1.0,
        reasoning: 'Task validation failed: null, undefined or missing description',
        contextMatchScore: 0,
        missingCapabilities: ['valid-task'],
        processingTime: Date.now() - startTime,
        cost: 0.001
      }
    }
    
    console.log(`🔍 MockGuard checking task: "${task.description.substring(0, 50)}..."`)
    
    // Simulated processing delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const decision = this.mockAIDecision(task)
    const processingTime = Date.now() - startTime
    
    const guardDecision: GuardDecision = {
      ...decision,
      processingTime,
      cost: 0.001 // Simulated cost
    }
    
    console.log(`🛡️ MockGuard decision: ${decision.action} (confidence: ${decision.confidence.toFixed(2)})`)
    return guardDecision
  }

  /**
   * Имитирует AI логику принятия решений
   */
  private mockAIDecision(task: Task): Omit<GuardDecision, 'processingTime' | 'cost'> {
    const requiredDomains = task.requirements || []
    const nodeDomains = this.header.expertDomains
    const nodeCompetencies = this.header.competenceMap
    const taskComplexity = task.complexity || task.requirements?.complexity || 1
    
    // 1. Если нет требований - разрешаем (задача может быть общей)
    if (requiredDomains.length === 0) {
      return {
        action: 'allow',
        confidence: 0.8,
        reasoning: 'Task has no specific domain requirements - general task accepted',
        contextMatchScore: 80,
        missingCapabilities: [],
        suggestedNodeType: undefined
      }
    }
    
    // 2. Проверка доменов
    const domainMatches = requiredDomains.filter(domain => 
      nodeDomains.some(nodeDomain => 
        nodeDomain.toLowerCase().includes(domain.toLowerCase()) ||
        domain.toLowerCase().includes(nodeDomain.toLowerCase())
      )
    )
    
    // Если есть хотя бы одно совпадение доменов, считаем что задача может быть выполнена
    const domainCoverage = domainMatches.length / requiredDomains.length
    
    if (domainMatches.length === 0) {
      return {
        action: 'reject',
        confidence: 0.95,
        reasoning: `Task domains [${requiredDomains.join(', ')}] completely outside node expertise [${nodeDomains.join(', ')}]`,
        contextMatchScore: 0,
        missingCapabilities: requiredDomains,
        suggestedNodeType: this.suggestAlternativeNodeType(requiredDomains)
      }
    }
    
    // 3. Проверка сложности
    const maxNodeComplexity = Math.max(...Object.values(nodeCompetencies)) * 10
    if (taskComplexity > maxNodeComplexity) {
      return {
        action: 'redirect',
        confidence: 0.8,
        reasoning: `Task complexity ${taskComplexity} exceeds node maximum ${maxNodeComplexity.toFixed(1)}`,
        contextMatchScore: 30,
        missingCapabilities: ['higher-complexity-handling'],
        suggestedNodeType: 'oracle'
      }
    }
    
    // 4. Проверка запрещенных слов (обучение, изучение)
    const learningKeywords = ['изучи', 'выучи', 'освой', 'learn', 'study', 'research new']
    const hasLearningRequirement = learningKeywords.some(keyword => 
      task.description.toLowerCase().includes(keyword.toLowerCase())
    )
    
    if (hasLearningRequirement) {
      return {
        action: 'reject',
        confidence: 0.9,
        reasoning: 'Task requires learning new information - locked context cannot adapt',
        contextMatchScore: 20,
        missingCapabilities: ['learning-capability'],
        suggestedNodeType: 'learning-capable-node'
      }
    }
    
    // 5. Проверка несовместимых технологий
    const incompatibleTechs = this.findIncompatibleTechnologies(task.description, nodeDomains)
    if (incompatibleTechs.length > 0) {
      return {
        action: 'redirect',
        confidence: 0.7,
        reasoning: `Task mentions technologies outside expertise: ${incompatibleTechs.join(', ')}`,
        contextMatchScore: 40,
        missingCapabilities: incompatibleTechs,
        suggestedNodeType: this.suggestNodeForTech(incompatibleTechs[0])
      }
    }
    
    // 6. Позитивное решение - если есть частичное совпадение, разрешаем
    if (domainCoverage >= 0.5) { // Если покрыто хотя бы 50% доменов
      const complexityFit = 1 - (taskComplexity / maxNodeComplexity)
      const confidence = Math.max(0.8, (domainCoverage * 0.7) + (complexityFit * 0.3))
      
      return {
        action: 'allow',
        confidence,
        reasoning: `Task partially matches locked context: domains ${domainMatches.join(', ')}, complexity ${taskComplexity}/${maxNodeComplexity.toFixed(1)}`,
        contextMatchScore: confidence * 100,
        missingCapabilities: [],
        suggestedNodeType: undefined
      }
    } else {
      // Частичное совпадение, но недостаточно - перенаправляем
      return {
        action: 'redirect',
        confidence: 0.7,
        reasoning: `Task has partial domain match but insufficient coverage: ${(domainCoverage * 100).toFixed(1)}%`,
        contextMatchScore: domainCoverage * 100,
        missingCapabilities: requiredDomains.filter(d => !domainMatches.includes(d)),
        suggestedNodeType: 'oracle'
      }
    }
  }

  /**
   * Находит несовместимые технологии в описании задачи
   */
  private findIncompatibleTechnologies(description: string, nodeDomains: string[]): string[] {
    const techKeywords = {
      'backend': ['postgresql', 'mysql', 'mongodb', 'redis', 'docker', 'kubernetes'],
      'frontend': ['vue', 'angular', 'svelte'],
      'mobile': ['ios', 'android', 'flutter', 'react-native'],
      'ai': ['pytorch', 'tensorflow', 'machine learning', 'neural network'],
      'devops': ['aws', 'azure', 'gcp', 'terraform', 'ansible']
    }
    
    const incompatible: string[] = []
    const desc = description.toLowerCase()
    
    // Ищем технологии, которые не покрыты доменами ноды
    for (const [domain, techs] of Object.entries(techKeywords)) {
      if (!nodeDomains.some(nodeDomain => nodeDomain.toLowerCase().includes(domain))) {
        for (const tech of techs) {
          if (desc.includes(tech)) {
            incompatible.push(tech)
          }
        }
      }
    }
    
    return incompatible
  }

  /**
   * Предлагает альтернативный тип ноды
   */
  private suggestAlternativeNodeType(requiredDomains: string[]): string {
    if (requiredDomains.some(d => d.includes('backend') || d.includes('database'))) {
      return 'backend-expert'
    }
    if (requiredDomains.some(d => d.includes('ai') || d.includes('ml'))) {
      return 'ai-expert'
    }
    if (requiredDomains.some(d => d.includes('devops'))) {
      return 'devops-expert'
    }
    return 'oracle'
  }

  /**
   * Предлагает ноду для конкретной технологии
   */
  private suggestNodeForTech(tech: string): string {
    const techToNode: Record<string, string> = {
      'postgresql': 'database-expert',
      'docker': 'devops-expert',
      'vue': 'vue-frontend-expert',
      'angular': 'angular-frontend-expert',
      'pytorch': 'ai-expert'
    }
    return techToNode[tech] || 'oracle'
  }

  /**
   * Получить информацию о MockGuard
   */
  getGuardInfo() {
    return {
      type: 'MockGuard',
      nodeId: this.header.nodeId,
      expertDomains: this.header.expertDomains,
      capabilities: this.header.capabilities,
      thresholds: this.header.guardThresholds,
      contextHash: this.header.contextHash.substring(0, 16) + '...'
    }
  }
} 