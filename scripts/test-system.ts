#!/usr/bin/env bun
import { demonstrateCAGChain } from '../examples/demo.js'

console.log('🔬 CAG-Chain System Test Runner')
console.log('===============================\n')

// Проверка environment variables
const requiredEnvVars = ['OPENAI_API_KEY', 'DATABASE_URL', 'REDIS_URL']
const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

if (missingVars.length > 0) {
  console.error('❌ Отсутствуют необходимые environment variables:')
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`)
  })
  console.error('\nПожалуйста, создайте .env файл на основе env.template')
  process.exit(1)
}

console.log('✅ Environment variables в порядке')
console.log('🚀 Запуск полной демонстрации системы...\n')

try {
  await demonstrateCAGChain()
  console.log('\n✅ Тестирование успешно завершено!')
  process.exit(0)
} catch (error) {
  console.error('\n❌ Ошибка тестирования:', error)
  process.exit(1)
} 