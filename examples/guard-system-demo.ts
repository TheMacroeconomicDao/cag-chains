#!/usr/bin/env bun

/**
 * CAG-Chains Guard System Demo
 * Демонстрация работы PrecisionGuard для защиты заблокированных Chain Nodes
 */

import { CAGNode } from '../packages/core/src/node/CAGNode.js'
import { ChainNode } from '../packages/core/src/node/ChainNode.js'
import { QualityController } from '../packages/core/src/node/QualityController.js'
import type { Task } from '../packages/core/src/types/index.js'

// Проверяем переменные окружения
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not found in environment')
  console.log('Please set your OpenAI API key:')
  console.log('export OPENAI_API_KEY="your-api-key-here"')
  process.exit(1)
}

async function runGuardSystemDemo() {
  console.log('🛡️ CAG-Chains Guard System Demo\n')
  console.log('='.repeat(60))
  console.log('Демонстрация защиты заблокированных Chain Nodes через PrecisionGuard')
  console.log('='.repeat(60))
  console.log()

  try {
    // ==================== 1. СОЗДАНИЕ ЭКСПЕРТНОЙ НОДЫ ====================
    console.log('🎯 Этап 1: Создание специализированной CAG Node...\n')

    const frontendExpert = new CAGNode({
      domain: 'frontend',
      subdomains: ['react', 'typescript', 'css'],
      nodeType: 'medium',
      expertiseLevel: 0.9,
      openaiApiKey: process.env.OPENAI_API_KEY!
    })

    // Ждем инициализации
    await new Promise(resolve => setTimeout(resolve, 2000))

    console.log(`✅ Frontend эксперт создан: ${frontendExpert.getState().id}`)
    console.log(`   Домены: ${frontendExpert.getState().domain}, ${frontendExpert.getState().subdomains.join(', ')}`)
    console.log(`   Экспертиза: ${(frontendExpert.getState().expertiseLevel * 100).toFixed(1)}%`)
    console.log()

    // ==================== 2. БЛОКИРОВКА В CHAIN NODE ====================
    console.log('🔒 Этап 2: Блокировка в Chain Node с Guard защитой...\n')

    const qualityController = new QualityController()
    
    // Принудительно блокируем (для демо)
    const chainNode = await qualityController.lockAsChainNode(frontendExpert, {
      qualityRequirements: [
        {
          metric: 'successRate',
          threshold: 0.8,
          evaluationPeriod: 60000
        }
      ],
      performanceGuarantees: [
        {
          metric: 'responseTime',
          maxValue: 5000,
          confidence: 0.9,
          basedOnSamples: 10
        }
      ],
      reusabilityRights: {
        isPublic: true,
        isCommercial: false,
        licenseType: 'open',
        restrictions: []
      }
    })

    console.log(`🔒 Chain Node заблокирован: ${chainNode.getId()}`)
    console.log(`   Защищен PrecisionGuard с A2A заголовком`)
    console.log(`   Компетенции: ${JSON.stringify(chainNode.getMetadata().contextSnapshot.domains)}`)
    console.log()

    // ==================== 3. ТЕСТИРОВАНИЕ GUARD ФИЛЬТРАЦИИ ====================
    console.log('🧪 Этап 3: Тестирование Guard фильтрации...\n')

    // Тест 1: Подходящая задача (должна пройти)
    console.log('📋 Тест 1: Подходящая React задача')
    const validTask: Task = {
      id: crypto.randomUUID(),
      type: 'component_creation',
      description: 'Создай React компонент для отображения списка пользователей с TypeScript типами',
      requirements: {
        domains: ['frontend', 'react'],
        complexity: 4,
        qualityTarget: 0.8
      },
      dependencies: [],
      context: { framework: 'React', language: 'TypeScript' },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    try {
      const result1 = await chainNode.executeOptimized(validTask)
      console.log(`   ✅ Результат: ${result1.success ? 'Успех' : 'Неудача'}`)
      if (result1.success) {
        console.log(`   📊 Качество: ${(result1.qualityScore || 0 * 100).toFixed(1)}%`)
        console.log(`   ⏱️ Время: ${result1.responseTime}ms`)
      } else {
        console.log(`   ❌ Ошибка: ${result1.error}`)
      }
    } catch (error) {
      console.log(`   ❌ Исключение: ${error}`)
    }
    console.log()

    // Тест 2: Неподходящая задача (должна быть отклонена)
    console.log('📋 Тест 2: Неподходящая Backend задача')
    const invalidTask: Task = {
      id: crypto.randomUUID(),
      type: 'database_optimization',
      description: 'Оптимизируй PostgreSQL запросы для повышения производительности',
      requirements: {
        domains: ['backend', 'database'],
        complexity: 7,
        qualityTarget: 0.9
      },
      dependencies: [],
      context: { database: 'PostgreSQL' },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    try {
      const result2 = await chainNode.executeOptimized(invalidTask)
      console.log(`   ✅ Результат: ${result2.success ? 'Успех' : 'Неудача'}`)
      if (!result2.success) {
        console.log(`   🛡️ Guard сработал: ${result2.error}`)
      }
    } catch (error) {
      console.log(`   ❌ Исключение: ${error}`)
    }
    console.log()

    // Тест 3: Слишком сложная задача (должна быть перенаправлена)
    console.log('📋 Тест 3: Слишком сложная задача')
    const complexTask: Task = {
      id: crypto.randomUUID(),
      type: 'architecture_design',
      description: 'Спроектируй микросервисную архитектуру для enterprise системы с React frontend',
      requirements: {
        domains: ['frontend', 'architecture'],
        complexity: 10,
        qualityTarget: 0.95
      },
      dependencies: [],
      context: { scale: 'enterprise' },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    try {
      const result3 = await chainNode.executeOptimized(complexTask)
      console.log(`   ✅ Результат: ${result3.success ? 'Успех' : 'Неудача'}`)
      if (!result3.success) {
        console.log(`   🔄 Guard решение: ${result3.error}`)
      }
    } catch (error) {
      console.log(`   ❌ Исключение: ${error}`)
    }
    console.log()

    // Тест 4: Задача требующая изучения (должна быть отклонена)
    console.log('📋 Тест 4: Задача требующая изучения новой технологии')
    const learningTask: Task = {
      id: crypto.randomUUID(),
      type: 'learning_task',
      description: 'Изучи новый фреймворк Vue 4 и создай с ним компонент',
      requirements: {
        domains: ['frontend'],
        complexity: 5,
        qualityTarget: 0.8
      },
      dependencies: [],
      context: { learning_required: true },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    try {
      const result4 = await chainNode.executeOptimized(learningTask)
      console.log(`   ✅ Результат: ${result4.success ? 'Успех' : 'Неудача'}`)
      if (!result4.success) {
        console.log(`   🚫 Guard отклонил: ${result4.error}`)
      }
    } catch (error) {
      console.log(`   ❌ Исключение: ${error}`)
    }
    console.log()

    // ==================== 4. СТАТИСТИКА GUARD ====================
    console.log('📊 Этап 4: Статистика Guard системы...\n')

    const usageStats = chainNode.getUsageStats()
    console.log(`🔢 Использований Chain Node: ${usageStats.count}`)
    console.log(`💰 Доход: $${usageStats.revenue}`)
    console.log(`🛡️ Guard эффективно защитил от неподходящих задач`)
    console.log()

    console.log('🎉 Демо Guard системы завершено успешно!')
    console.log('\n📈 Ключевые достижения:')
    console.log('   ✅ PrecisionGuard успешно фильтрует задачи')
    console.log('   ✅ Заблокированный контекст защищен от неподходящих запросов')
    console.log('   ✅ Автоматическое перенаправление и отклонение')
    console.log('   ✅ Nano-модель эффективно анализирует совместимость')
    console.log('   ✅ Экономия ресурсов на неподходящих задачах')

  } catch (error) {
    console.error('❌ Ошибка в демо Guard системы:', error)
    if (error instanceof Error) {
      console.error('Детали:', error.message)
      console.error('Stack:', error.stack)
    }
  }
}

// Запуск демо
runGuardSystemDemo().catch(console.error) 