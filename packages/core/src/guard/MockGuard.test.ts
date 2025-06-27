import { describe, it, expect, beforeEach } from 'bun:test'
import { MockGuard } from './MockGuard.js'
import type { Task, A2AHeader } from '../types/index.js'

describe('MockGuard', () => {
  let guard: MockGuard
  let mockHeader: A2AHeader
  let testTask: Task

  beforeEach(() => {
    mockHeader = {
      nodeId: 'test_chain_frontend_001',
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

    guard = new MockGuard(mockHeader)
  })

  describe('Инициализация MockGuard', () => {
    it('должен правильно инициализироваться', () => {
      expect(guard).toBeDefined()
      
      const guardInfo = guard.getGuardInfo()
      expect(guardInfo.nodeId).toBe(mockHeader.nodeId)
      expect(guardInfo.type).toBe('MockGuard')
      expect(guardInfo.expertDomains).toEqual(mockHeader.expertDomains)
    })
  })

  describe('Фильтрация задач на основе доменов', () => {
    it('должен разрешить задачу с подходящими доменами', async () => {
      const decision = await guard.filterIncomingTask(testTask)

      expect(decision.action).toBe('allow')
      expect(decision.confidence).toBeGreaterThan(0.8)
      expect(decision.missingCapabilities).toEqual([])
      expect(decision.contextMatchScore).toBeGreaterThan(80)
    })

    it('должен отклонить задачу с неподходящими доменами', async () => {
      const backendTask: Task = {
        ...testTask,
        description: 'Оптимизируй PostgreSQL базу данных',
        requirements: ['backend', 'database']
      }

      const decision = await guard.filterIncomingTask(backendTask)

      expect(decision.action).toBe('reject')
      expect(decision.confidence).toBeGreaterThan(0.9)
      expect(decision.missingCapabilities).toContain('backend')
      expect(decision.suggestedNodeType).toBe('backend-expert')
    })

    it('должен правильно обрабатывать смешанные домены', async () => {
      const mixedTask: Task = {
        ...testTask,
        description: 'Создай React компонент с подключением к PostgreSQL',
        requirements: ['frontend', 'react', 'database']
      }

      const decision = await guard.filterIncomingTask(mixedTask)

      // Должен перенаправить, так как есть несовместимые домены (database)
      expect(decision.action).toBe('redirect')
      expect(decision.contextMatchScore).toBeGreaterThan(30) // Частичное совпадение
      expect(decision.missingCapabilities).toContain('postgresql')
    })
  })

  describe('Фильтрация по сложности задач', () => {
    it('должен разрешить задачи подходящей сложности', async () => {
      const simpleTask: Task = {
        ...testTask,
        complexity: 3
      }

      const decision = await guard.filterIncomingTask(simpleTask)

      expect(decision.action).toBe('allow')
      expect(decision.confidence).toBeGreaterThan(0.8)
    })

    it('должен перенаправить очень сложные задачи', async () => {
      const complexTask: Task = {
        ...testTask,
        complexity: 10,
        description: 'Спроектируй enterprise архитектуру с микросервисами'
      }

      const decision = await guard.filterIncomingTask(complexTask)

      expect(decision.action).toBe('redirect')
      expect(decision.suggestedNodeType).toBe('oracle')
      expect(decision.reasoning).toContain('complexity')
    })
  })

  describe('Проверка на обучение и изучение', () => {
    it('должен отклонить задачи с требованием обучения', async () => {
      const learningTask: Task = {
        ...testTask,
        description: 'Изучи новый фреймворк Svelte и создай компонент'
      }

      const decision = await guard.filterIncomingTask(learningTask)

      expect(decision.action).toBe('reject')
      expect(decision.confidence).toBeGreaterThan(0.8)
      expect(decision.reasoning).toContain('learning')
      expect(decision.suggestedNodeType).toBe('learning-capable-node')
    })

    it('должен разрешить задачи без требования обучения', async () => {
      const regularTask: Task = {
        ...testTask,
        description: 'Создай React компонент с использованием TypeScript'
      }

      const decision = await guard.filterIncomingTask(regularTask)

      expect(decision.action).toBe('allow')
    })
  })

  describe('Проверка несовместимых технологий', () => {
    it('должен перенаправить задачи с несовместимыми технологиями', async () => {
      const incompatibleTask: Task = {
        ...testTask,
        description: 'Создай мобильное приложение на Flutter'
      }

      const decision = await guard.filterIncomingTask(incompatibleTask)

      expect(decision.action).toBe('redirect')
      expect(decision.missingCapabilities).toContain('flutter')
    })

    it('должен правильно предлагать альтернативные ноды', async () => {
      const aiTask: Task = {
        ...testTask,
        description: 'Создай ML модель с PyTorch',
        requirements: ['ai', 'machine-learning']
      }

      const decision = await guard.filterIncomingTask(aiTask)

      expect(decision.action).toBe('reject')
      expect(decision.suggestedNodeType).toBe('ai-expert')
    })
  })

  describe('Производительность и метрики', () => {
    it('должен измерять время обработки', async () => {
      const decision = await guard.filterIncomingTask(testTask)

      expect(decision.processingTime).toBeGreaterThan(50) // Минимум 100ms delay в Mock
      expect(decision.processingTime).toBeLessThan(200)
    })

    it('должен иметь фиксированную стоимость для Mock', async () => {
      const decision = await guard.filterIncomingTask(testTask)

      expect(decision.cost).toBe(0.001)
    })
  })

  describe('Граничные случаи', () => {
    it('должен обрабатывать пустые требования', async () => {
      const emptyRequirementsTask: Task = {
        ...testTask,
        requirements: []
      }

      const decision = await guard.filterIncomingTask(emptyRequirementsTask)

      expect(decision.action).toBe('allow') // Должен разрешить при отсутствии конфликтов
    })

    it('должен обрабатывать undefined сложность', async () => {
      const noComplexityTask: Task = {
        ...testTask,
        complexity: undefined as any
      }

      const decision = await guard.filterIncomingTask(noComplexityTask)

      expect(decision).toBeDefined()
      expect(decision.action).toBeOneOf(['allow', 'reject', 'redirect'])
    })
  })

  describe('Консистентность решений', () => {
    it('должен принимать одинаковые решения для идентичных задач', async () => {
      const decision1 = await guard.filterIncomingTask(testTask)
      const decision2 = await guard.filterIncomingTask(testTask)

      expect(decision1.action).toBe(decision2.action)
      expect(decision1.confidence).toBeCloseTo(decision2.confidence, 2)
    })
  })

  describe('Информация о Guard', () => {
    it('должен возвращать корректную информацию о себе', () => {
      const info = guard.getGuardInfo()

      expect(info.type).toBe('MockGuard')
      expect(info.nodeId).toBe(mockHeader.nodeId)
      expect(info.expertDomains).toEqual(mockHeader.expertDomains)
      expect(info.capabilities).toEqual(mockHeader.capabilities)
      expect(info.thresholds).toEqual(mockHeader.guardThresholds)
      expect(info.contextHash).toContain('...')
    })
  })
}) 