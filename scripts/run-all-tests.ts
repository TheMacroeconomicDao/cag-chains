#!/usr/bin/env bun

/**
 * CAG-Chains Test Runner
 * Запуск всех тестов системы с детальной отчетностью
 */

import { $ } from 'bun'

console.log('🧪 CAG-Chains Comprehensive Test Suite')
console.log('='.repeat(60))
console.log()

async function runTests() {
  try {
    console.log('🔍 Поиск тестовых файлов...')
    
    // Проверяем существование тестовых файлов
    const testFiles = [
      'packages/core/src/guard/PrecisionGuard.test.ts',
      'packages/core/src/visualization/SystemVisualizer.test.ts',
    ]

    const existingTests = []
    for (const testFile of testFiles) {
      try {
        await Bun.file(testFile).text()
        existingTests.push(testFile)
        console.log(`  ✅ ${testFile}`)
      } catch {
        console.log(`  ❌ ${testFile} - не найден`)
      }
    }

    console.log(`\n📊 Найдено тестов: ${existingTests.length}/${testFiles.length}`)
    
    if (existingTests.length === 0) {
      console.log('❌ Тестовые файлы не найдены!')
      process.exit(1)
    }

    console.log('\n🚀 Запуск тестов...')
    console.log('='.repeat(60))
    
    // Запускаем все тесты
    const result = await $`bun test --timeout 30000 --verbose`.text()
    
    console.log(result)
    
    // Анализируем результаты
    const lines = result.split('\n')
    const testResults = {
      passed: 0,
      failed: 0,
      total: 0
    }

    lines.forEach(line => {
      if (line.includes('✓') || line.includes('PASS')) {
        testResults.passed++
      } else if (line.includes('✗') || line.includes('FAIL')) {
        testResults.failed++
      }
    })

    testResults.total = testResults.passed + testResults.failed

    console.log('\n📋 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ')
    console.log('='.repeat(60))
    console.log(`✅ Пройдено: ${testResults.passed}`)
    console.log(`❌ Провалено: ${testResults.failed}`)
    console.log(`📊 Всего: ${testResults.total}`)
    
    if (testResults.total > 0) {
      const successRate = (testResults.passed / testResults.total) * 100
      console.log(`📈 Успешность: ${successRate.toFixed(1)}%`)
      
      if (successRate >= 90) {
        console.log('\n🎉 ОТЛИЧНО! Система готова к продакшену!')
      } else if (successRate >= 80) {
        console.log('\n✅ ХОРОШО! Система в целом стабильна.')
      } else if (successRate >= 70) {
        console.log('\n⚠️ УДОВЛЕТВОРИТЕЛЬНО. Есть проблемы для исправления.')
      } else {
        console.log('\n🚨 КРИТИЧНО! Система требует серьезных исправлений.')
      }
    }

    // Дополнительные проверки
    console.log('\n🔍 ДОПОЛНИТЕЛЬНЫЕ ПРОВЕРКИ')
    console.log('='.repeat(60))
    
    // Проверка типов
    try {
      console.log('📝 Проверка TypeScript типов...')
      await $`bun run type-check`.quiet()
      console.log('  ✅ Типы корректны')
    } catch {
      console.log('  ⚠️ Ошибки в типах')
    }

    // Проверка линтера
    try {
      console.log('🧹 Проверка кода (linting)...')
      await $`bun run check`.quiet()
      console.log('  ✅ Код соответствует стандартам')
    } catch {
      console.log('  ⚠️ Найдены проблемы в коде')
    }

    // Проверка основных компонентов
    console.log('🧠 Проверка основных компонентов...')
    try {
      await import('../packages/core/src/guard/PrecisionGuard.js')
      console.log('  ✅ PrecisionGuard импортируется')
    } catch (e) {
      console.log(`  ❌ PrecisionGuard: ${e}`)
    }

    try {
      await import('../packages/core/src/visualization/SystemVisualizer.js') 
      console.log('  ✅ SystemVisualizer импортируется')
    } catch (e) {
      console.log(`  ❌ SystemVisualizer: ${e}`)
    }

    try {
      await import('../packages/core/src/visualization/TerminalVisualizer.js')
      console.log('  ✅ TerminalVisualizer импортируется')
    } catch (e) {
      console.log(`  ❌ TerminalVisualizer: ${e}`)
    }

    console.log('\n🎯 ПОКРЫТИЕ ТЕСТАМИ')
    console.log('='.repeat(60))
    
    const components = [
      { name: 'PrecisionGuard', hasTests: existingTests.some(f => f.includes('PrecisionGuard.test')) },
      { name: 'SystemVisualizer', hasTests: existingTests.some(f => f.includes('SystemVisualizer.test')) },
      { name: 'TerminalVisualizer', hasTests: false }
    ]

    components.forEach(component => {
      const status = component.hasTests ? '✅' : '❌'
      console.log(`  ${status} ${component.name}`)
    })

    const coverage = (components.filter(c => c.hasTests).length / components.length) * 100
    console.log(`\n📊 Покрытие тестами: ${coverage.toFixed(1)}%`)

    if (testResults.failed === 0 && coverage >= 80) {
      console.log('\n🚀 СИСТЕМА ГОТОВА К ПРОДАКШЕНУ!')
      console.log('  ✅ Все тесты пройдены')
      console.log('  ✅ Покрытие достаточное')
      console.log('  ✅ Компоненты работают корректно')
      process.exit(0)
    } else {
      console.log('\n⚠️ СИСТЕМА ТРЕБУЕТ ДОРАБОТКИ')
      if (testResults.failed > 0) {
        console.log(`  ❌ ${testResults.failed} провалившихся тестов`)
      }
      if (coverage < 80) {
        console.log(`  ❌ Недостаточное покрытие тестами (${coverage.toFixed(1)}%)`)
      }
      process.exit(1)
    }

  } catch (error) {
    console.error('🚨 Критическая ошибка при запуске тестов:', error)
    process.exit(1)
  }
}

// Запуск тестов
runTests().catch(console.error) 