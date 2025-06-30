import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'
import type { Task, A2AHeader, GuardDecision } from '../types/index.js'
import { generateId } from '../utils/index.js'

/**
 * PrecisionGuard - защита заблокированных Chain Nodes
 * Проверяет точное соответствие задач узкому заблокированному контексту
 */
export class PrecisionGuard {
  private header: A2AHeader
  
  constructor(nodeHeader: A2AHeader) {
    if (!nodeHeader || !nodeHeader.nodeId || !nodeHeader.expertDomains) {
      throw new Error('Invalid A2A header: missing required fields')
    }
    
    this.header = nodeHeader
    console.log(`🛡️ PrecisionGuard initialized for node ${nodeHeader.nodeId}`)
  }

  /**
   * Основная функция фильтрации входящих задач
   */
  async filterIncomingTask(task: Task): Promise<GuardDecision> {
    const startTime = Date.now()
    
    try {
      // Валидация входящей задачи
      const validationResult = this.validateTask(task)
      if (validationResult) {
        this.updateStats('rejected', 0, Date.now() - startTime)
        return validationResult
      }

      console.log(`🔍 PrecisionGuard checking task: "${task.description.substring(0, 50)}..."`)
      
      const nanoPrompt = this.buildGuardPrompt(task)
      
      const result = await generateText({
        model: openai('gpt-4o-mini'),
        prompt: nanoPrompt,
        temperature: 0.1,
        maxTokens: 500
      })

      const decision = this.parseAIResponse(result.text)
      const processingTime = Date.now() - startTime
      const cost = this.calculateCost(result.usage?.totalTokens || 100)

      const guardDecision: GuardDecision = {
        ...decision,
        processingTime,
        cost
      }

      this.updateStats(decision.action, cost, processingTime)
      
      console.log(`🛡️ PrecisionGuard decision: ${decision.action} (confidence: ${decision.confidence.toFixed(2)})`)
      
      return guardDecision
    } catch (error) {
      console.error('🚨 PrecisionGuard error:', error)
      
      // Безопасный fallback
      const fallbackDecision: GuardDecision = {
        action: 'redirect',
        confidence: 0.5,
        reasoning: `Guard error fallback: ${error instanceof Error ? error.message : 'Unknown error'}`,
        contextMatchScore: 0,
        missingCapabilities: ['error-recovery'],
        suggestedNodeType: 'oracle',
        processingTime: Date.now() - startTime,
        cost: 0
      }

      this.updateStats('redirected', 0, fallbackDecision.processingTime)
      return fallbackDecision
    }
  }

  /**
   * Валидация входящей задачи
   */
  private validateTask(task: Task): GuardDecision | null {
    if (!task) {
      return {
        action: 'reject',
        confidence: 1.0,
        reasoning: 'Task validation failed: null or undefined task',
        contextMatchScore: 0,
        missingCapabilities: ['valid-task'],
        processingTime: 0,
        cost: 0
      }
    }

    if (!task.description || task.description.trim().length === 0) {
      return {
        action: 'reject',
        confidence: 1.0,
        reasoning: 'Task validation failed: empty or missing description',
        contextMatchScore: 0,
        missingCapabilities: ['task-description'],
        processingTime: 0,
        cost: 0
      }
    }

    // Ограничение длины описания
    if (task.description.length > 5000) {
      task.description = task.description.substring(0, 5000) + '...'
    }

    return null
  }

  /**
   * Обновление статистики использования
   */
  private updateStats(action: string, cost: number, processingTime: number): void {
    this.usageStats.totalRequests++
    this.usageStats.totalCost += cost
    this.usageStats.totalProcessingTime += processingTime

    switch (action) {
      case 'allow':
        this.usageStats.allowedRequests++
        break
      case 'reject':
        this.usageStats.rejectedRequests++
        break
      case 'redirect':
        this.usageStats.redirectedRequests++
        break
    }
  }

  /**
   * Построение промпта для Guard AI модели
   */
  private buildGuardPrompt(task: Task): string {
    const { expertDomains, competenceMap, capabilities, guardThresholds } = this.header
    const maxCompetence = Math.max(...Object.values(competenceMap))

    // Безопасное получение доменов из requirements
    const taskDomains = task.requirements?.domains || []
    
    return `
Ты Guard для ЗАБЛОКИРОВАННОЙ экспертной AI ноды. 

КРИТИЧЕСКИ ВАЖНО: Эта нода была заблокирована при 65% заполнения контекста и ее экспертиза сжата в узкий A2A заголовок. Она может качественно выполнять ТОЛЬКО те задачи, которые точно соответствуют ее заблокированному контексту.

КОНТЕКСТ НОДЫ:
ID: ${this.header.nodeId}
Экспертные домены: ${expertDomains.join(', ')}
Возможности: ${capabilities.join(', ')}
Карта компетенций: ${JSON.stringify(competenceMap)}
Контекст заморожен: ${this.header.contextHash.substring(0, 16)}...
Уровень экспертизы: ${maxCompetence.toFixed(2)}

ВХОДЯЩАЯ ЗАДАЧА:
Описание: "${task.description}"
Требуемые домены: ${taskDomains.join(', ')}
Сложность: ${task.requirements?.complexity || 'не указана'}

ИНСТРУКЦИИ:
1. Если задача НЕ точно соответствует заблокированному контексту → REJECT
2. Если задача требует обучения/изучения новых технологий → REJECT
3. Если сложность превышает возможности ноды → REDIRECT to oracle
4. Если технологии не в competenceMap → REDIRECT
5. Если точное соответствие контексту → ALLOW

Минимальная уверенность для ALLOW: ${guardThresholds.minConfidence}
Автоматический REJECT если уверенность < ${guardThresholds.rejectBelow}

Ответь СТРОГО в JSON формате:
{
  "action": "allow" | "reject" | "redirect",
  "confidence": 0.0-1.0,
  "reasoning": "детальное объяснение",
  "contextMatchScore": 0-100,
  "missingCapabilities": ["список", "недостающих", "возможностей"],
  "suggestedNodeType": "тип ноды для redirect или null"
}
`
  }

  /**
   * Проверяет валидность действия Guard
   */
  private validateAction(action: string): 'allow' | 'reject' | 'redirect' {
    if (action === 'allow' || action === 'reject' || action === 'redirect') {
      return action as 'allow' | 'reject' | 'redirect'
    }
    console.warn(`Invalid guard action: ${action}, defaulting to redirect`)
    return 'redirect'
  }

  /**
   * Получить информацию о Guard
   */
  getGuardInfo() {
    return {
      nodeId: this.header.nodeId,
      expertDomains: this.header.expertDomains,
      capabilities: this.header.capabilities,
      thresholds: this.header.guardThresholds,
      contextHash: this.header.contextHash.substring(0, 16) + '...'
    }
  }

  /**
   * Быстрая проверка совместимости без AI (для оптимизации)
   */
  quickCompatibilityCheck(task: Task): { compatible: boolean; confidence: number; reason: string } {
    const requiredDomains = task.requirements?.domains || []
    const nodeDomains = this.header.expertDomains
    
    // Проверка доменов
    const domainMatches = requiredDomains.filter(domain => 
      nodeDomains.some(nodeDomain => 
        nodeDomain.toLowerCase().includes(domain.toLowerCase()) ||
        domain.toLowerCase().includes(nodeDomain.toLowerCase())
      )
    )
    
    if (domainMatches.length === 0) {
      return {
        compatible: false,
        confidence: 0,
        reason: `No domain overlap: required [${requiredDomains.join(', ')}], available [${nodeDomains.join(', ')}]`
      }
    }
    
    // Проверка сложности
    const maxNodeComplexity = Math.max(...Object.values(this.header.competenceMap)) * 10
    const taskComplexity = task.requirements?.complexity || 1
    if (taskComplexity > maxNodeComplexity) {
      return {
        compatible: false,
        confidence: 0,
        reason: `Task complexity ${taskComplexity} > node capability ${maxNodeComplexity.toFixed(1)}`
      }
    }
    
    // Расчет уверенности
    const domainCoverage = domainMatches.length / requiredDomains.length
    const complexityFit = 1 - (taskComplexity / maxNodeComplexity)
    const confidence = (domainCoverage * 0.7) + (complexityFit * 0.3)
    
    return {
      compatible: true,
      confidence,
      reason: `Domain coverage: ${(domainCoverage * 100).toFixed(1)}%, complexity fit: ${(complexityFit * 100).toFixed(1)}%`
    }
  }

  /**
   * Получить A2A заголовок ноды
   */
  getHeader(): A2AHeader {
    return this.header
  }

  /**
   * Получить статистику использования Guard
   */
  getUsageStats(): {
    totalRequests: number
    allowedRequests: number
    rejectedRequests: number
    redirectedRequests: number
    totalCost: number
    avgProcessingTime: number
    successRate: number
  } {
    if (this.usageStats.totalRequests === 0) {
      return {
        totalRequests: 0,
        allowedRequests: 0,
        rejectedRequests: 0,
        redirectedRequests: 0,
        totalCost: 0,
        avgProcessingTime: 0,
        successRate: 100
      }
    }

    return {
      ...this.usageStats,
      avgProcessingTime: this.usageStats.totalProcessingTime / this.usageStats.totalRequests,
      successRate: (this.usageStats.allowedRequests / this.usageStats.totalRequests) * 100
    }
  }

  /**
   * Сброс статистики использования
   */
  resetUsageStats(): void {
    this.usageStats = {
      totalRequests: 0,
      allowedRequests: 0,
      rejectedRequests: 0,
      redirectedRequests: 0,
      totalCost: 0,
      totalProcessingTime: 0
    }
  }

  private usageStats = {
    totalRequests: 0,
    allowedRequests: 0,
    rejectedRequests: 0,
    redirectedRequests: 0,
    totalCost: 0,
    totalProcessingTime: 0
  }

  /**
   * Парсинг ответа от AI модели
   */
  private parseAIResponse(text: string): Omit<GuardDecision, 'processingTime' | 'cost'> {
    try {
      const result = JSON.parse(text)
      
      return {
        action: this.validateAction(result.action || result.decision),
        confidence: Math.max(0, Math.min(1, result.confidence || 0)),
        reasoning: result.reasoning || 'No reasoning provided',
        contextMatchScore: Math.max(0, Math.min(100, result.contextMatchScore || result.context_match_score || 0)),
        missingCapabilities: Array.isArray(result.missingCapabilities || result.missing_capabilities) ? 
                           (result.missingCapabilities || result.missing_capabilities) : [],
        suggestedNodeType: result.suggestedNodeType || result.suggested_node_type
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error)
      return {
        action: 'redirect',
        confidence: 0.1,
        reasoning: 'Failed to parse AI response',
        contextMatchScore: 0,
        missingCapabilities: ['parsing-error'],
        suggestedNodeType: 'oracle'
      }
    }
  }

  /**
   * Расчет стоимости обработки
   */
  private calculateCost(tokens: number): number {
    // GPT-4o-mini pricing: $0.00015 / 1K input tokens, $0.0006 / 1K output tokens
    // Приблизительный расчет
    return (tokens / 1000) * 0.0003
  }
} 