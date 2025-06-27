import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { PrecisionGuard } from './PrecisionGuard.js'
import type { Task, A2AHeader, GuardDecision } from '../types/index.js'

// Mock AI SDK
const mockGenerateText = mock(() => Promise.resolve({
  text: JSON.stringify({
    action: 'allow',
    confidence: 0.9,
    reasoning: 'Task matches node expertise',
    contextMatchScore: 85,
    missingCapabilities: [],
    suggestedNodeType: undefined
  })
}))

mock.module('ai', () => ({
  generateText: mockGenerateText
}))

describe('PrecisionGuard', () => {
  let guard: PrecisionGuard
  let mockHeader: A2AHeader
  let testTask: Task

  beforeEach(() => {
    mockHeader = {
      nodeId: 'test_chain_node_001',
      expertDomains: ['frontend', 'react', 'typescript'],
      competenceMap: {
        'frontend': 0.92,
        'react': 0.95,
        'typescript': 0.88
      },
      capabilities: ['component-creation', 'state-management', 'ui-design'],
      contextHash: 'sha256:test_context_hash',
      guardThresholds: {
        minConfidence: 0.8,
        rejectBelow: 0.3
      },
      blockedAt: new Date(),
      version: '1.0.0'
    }

    testTask = {
      id: 'test_task_001',
      description: 'Создай React компонент для отображения данных',
      complexity: 5,
      requirements: ['frontend', 'react'],
      createdAt: new Date(),
      status: 'pending'
    }

    guard = new PrecisionGuard(mockHeader)
  })

  describe('Инициализация Guard', () => {
    it('должен правильно инициализироваться с A2A заголовком', () => {
      expect(guard).toBeDefined()
      expect(guard.getHeader()).toEqual(mockHeader)
    })

    it('должен выбросить ошибку при некорректном заголовке', () => {
      expect(() => {
        new PrecisionGuard({} as A2AHeader)
      }).toThrow()
    })
  })

  describe('Фильтрация задач', () => {
    it('должен разрешить подходящую задачу', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: JSON.stringify({
          action: 'allow',
          confidence: 0.9,
          reasoning: 'Task perfectly matches node expertise',
          contextMatchScore: 90,
          missingCapabilities: [],
          suggestedNodeType: undefined
        })
      })

      const decision = await guard.filterIncomingTask(testTask)

      expect(decision.action).toBe('allow')
      expect(decision.confidence).toBeGreaterThan(0.8)
      expect(decision.missingCapabilities).toEqual([])
    })

    it('должен отклонить неподходящую задачу', async () => {
      const backendTask: Task = {
        ...testTask,
        description: 'Оптимизируй PostgreSQL базу данных',
        requirements: ['backend', 'database']
      }

      mockGenerateText.mockResolvedValueOnce({
        text: JSON.stringify({
          action: 'reject',
          confidence: 0.95,
          reasoning: 'Task domains completely outside node expertise',
          contextMatchScore: 0,
          missingCapabilities: ['backend', 'database'],
          suggestedNodeType: 'backend-expert'
        })
      })

      const decision = await guard.filterIncomingTask(backendTask)

      expect(decision.action).toBe('reject')
      expect(decision.confidence).toBeGreaterThan(0.9)
      expect(decision.missingCapabilities).toContain('backend')
      expect(decision.suggestedNodeType).toBe('backend-expert')
    })

    it('должен перенаправить слишком сложную задачу', async () => {
      const complexTask: Task = {
        ...testTask,
        complexity: 10,
        description: 'Спроектируй enterprise архитектуру'
      }

      mockGenerateText.mockResolvedValueOnce({
        text: JSON.stringify({
          action: 'redirect',
          confidence: 0.8,
          reasoning: 'Task complexity exceeds node capabilities',
          contextMatchScore: 30,
          missingCapabilities: ['enterprise-architecture'],
          suggestedNodeType: 'oracle'
        })
      })

      const decision = await guard.filterIncomingTask(complexTask)

      expect(decision.action).toBe('redirect')
      expect(decision.suggestedNodeType).toBe('oracle')
      expect(decision.contextMatchScore).toBeLessThan(50)
    })

    it('должен корректно обрабатывать ошибки AI', async () => {
      mockGenerateText.mockRejectedValueOnce(new Error('OpenAI API error'))

      const decision = await guard.filterIncomingTask(testTask)

      expect(decision.action).toBe('redirect')
      expect(decision.reasoning).toContain('fallback')
    })
  })

  describe('Производительность и метрики', () => {
    it('должен отслеживать время обработки', async () => {
      const decision = await guard.filterIncomingTask(testTask)

      expect(decision.processingTime).toBeGreaterThan(0)
      expect(decision.cost).toBeGreaterThan(0)
    })

    it('должен обновлять статистику использования', async () => {
      const stats1 = guard.getUsageStats()
      
      await guard.filterIncomingTask(testTask)
      
      const stats2 = guard.getUsageStats()

      expect(stats2.totalRequests).toBe(stats1.totalRequests + 1)
      expect(stats2.totalCost).toBeGreaterThan(stats1.totalCost)
    })
  })

  describe('Безопасность и валидация', () => {
    it('должен валидировать входящую задачу', async () => {
      const invalidTask = {} as Task

      const decision = await guard.filterIncomingTask(invalidTask)

      expect(decision.action).toBe('reject')
      expect(decision.reasoning).toContain('validation')
    })

    it('должен ограничивать размер описания задачи', async () => {
      const longTask: Task = {
        ...testTask,
        description: 'x'.repeat(10000) // Очень длинное описание
      }

      const decision = await guard.filterIncomingTask(longTask)

      expect(decision).toBeDefined()
      // Должен обработать, но с ограничением
    })
  })

  describe('Интеграция с A2A', () => {
    it('должен возвращать корректные рекомендации для A2A', async () => {
      const decision = await guard.filterIncomingTask(testTask)

      if (decision.action === 'redirect') {
        expect(decision.suggestedNodeType).toBeDefined()
        expect(typeof decision.suggestedNodeType).toBe('string')
      }
    })
  })
}) 