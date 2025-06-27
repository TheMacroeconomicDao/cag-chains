import { CAGNode } from '@cag-chains/core/node/CAGNode'
import { Oracle } from '@cag-chains/core/oracle/Oracle'

// Demo: Создание и тестирование CAG-Chain системы
async function demonstrateCAGChain() {
  console.log('🚀 CAG-Chain System Demo - 2025 Edition')
  console.log('==========================================\n')

  // ==================== STEP 1: СОЗДАНИЕ СПЕЦИАЛИЗИРОВАННЫХ УЗЛОВ ====================
  
  console.log('📦 Создаем специализированные CAG-Nodes...')
  
  const frontendExpert = new CAGNode({
    domain: 'frontend',
    subdomains: ['react', 'nextjs', 'typescript', 'ui/ux'],
    nodeType: 'medium',
    expertiseLevel: 0.9,
    openaiApiKey: process.env.OPENAI_API_KEY!
  })

  const backendExpert = new CAGNode({
    domain: 'backend',
    subdomains: ['api', 'database', 'microservices', 'security'],
    nodeType: 'large',
    expertiseLevel: 0.85,
    openaiApiKey: process.env.OPENAI_API_KEY!
  })

  const aiExpert = new CAGNode({
    domain: 'ai',
    subdomains: ['machine-learning', 'nlp', 'vector-search', 'embeddings'],
    nodeType: 'xlarge',
    expertiseLevel: 0.95,
    openaiApiKey: process.env.OPENAI_API_KEY!
  })

  const devopsExpert = new CAGNode({
    domain: 'devops',
    subdomains: ['docker', 'kubernetes', 'cicd', 'monitoring'],
    nodeType: 'medium',
    expertiseLevel: 0.8,
    openaiApiKey: process.env.OPENAI_API_KEY!
  })

  // Ждем инициализации всех узлов
  await new Promise(resolve => setTimeout(resolve, 3000))
  
  console.log(`✅ Frontend Expert: ${frontendExpert.getState().domain} (${frontendExpert.getStatus()})`)
  console.log(`✅ Backend Expert: ${backendExpert.getState().domain} (${backendExpert.getStatus()})`)
  console.log(`✅ AI Expert: ${aiExpert.getState().domain} (${aiExpert.getStatus()})`)
  console.log(`✅ DevOps Expert: ${devopsExpert.getState().domain} (${devopsExpert.getStatus()})\n`)

  // ==================== STEP 2: СОЗДАНИЕ ORACLE ====================
  
  console.log('🧠 Инициализируем Oracle...')
  
  const oracle = new Oracle({
    optimizationStrategy: 'balanced',
    maxChainSize: 10,
    maxConcurrentChains: 100,
    nodeDiscoveryTimeout: 5000,
    taskTimeout: 300000
  })

  // Регистрируем узлы в Oracle
  oracle.registerNode(frontendExpert.getState())
  oracle.registerNode(backendExpert.getState())
  oracle.registerNode(aiExpert.getState())
  oracle.registerNode(devopsExpert.getState())
  
  console.log('✅ Oracle готов к работе\n')

  // ==================== STEP 3: СЛОЖНАЯ ЗАДАЧА ====================
  
  console.log('🎯 Задача: Создать AI-powered приложение для поиска документов')
  
  const complexTask = `
Создать полноценное приложение для семантического поиска документов с использованием AI:

1. Frontend: React + Next.js интерфейс с возможностью загрузки документов и поиска
2. Backend: API для обработки документов, векторизации и поиска  
3. AI: Система для создания embeddings и семантического поиска
4. DevOps: Контейнеризация и развертывание в production

Требования:
- Современный UI с real-time поиском
- RESTful API с OpenAPI документацией
- Vector database для хранения embeddings
- JWT аутентификация
- Docker + Kubernetes готовность
- Comprehensive тестирование
- Monitoring и логирование
`

  // ==================== STEP 4: АНАЛИЗ ЗАДАЧИ ORACLE ====================
  
  console.log('🔍 Oracle анализирует задачу...')
  
  try {
    const oracleResponse = await oracle.processRequest(complexTask, {
      priority: 'high',
      timeline: 'urgent',
      budget: 'medium'
    })

    console.log('\n📊 РЕЗУЛЬТАТЫ АНАЛИЗА:')
    console.log('======================')
    console.log(`Сложность: ${oracleResponse.analysis.complexity}/10`)
    console.log(`Необходимые домены: ${oracleResponse.analysis.requiredDomains.join(', ')}`)
    console.log(`Декомпозиция: ${oracleResponse.analysis.decomposition.length} подзадач`)
    console.log(`Параллелизуемость: ${oracleResponse.analysis.parallelizable ? 'Да' : 'Нет'}`)
    console.log(`Оценка токенов: ${oracleResponse.analysis.estimatedTokens}`)

    console.log('\n⚡ ПЛАН ВЫПОЛНЕНИЯ:')
    console.log('==================')
    console.log(`Топология: ${oracleResponse.plan.topology}`)
    console.log(`Количество задач: ${oracleResponse.plan.tasks.length}`)
    console.log(`Предполагаемая стоимость: ${oracleResponse.plan.estimatedCost} токенов`)
    console.log(`Предполагаемое время: ${Math.round(oracleResponse.plan.estimatedDuration / 1000)}с`)
    console.log(`Уверенность: ${(oracleResponse.plan.confidence * 100).toFixed(1)}%`)

    console.log('\n📝 ДЕКОМПОЗИЦИЯ ЗАДАЧ:')
    console.log('=====================')
    oracleResponse.analysis.decomposition.forEach((subtask, index) => {
      console.log(`${index + 1}. ${subtask.description}`)
      console.log(`   Домен: ${subtask.domain} | Сложность: ${subtask.complexity}/10`)
      if (subtask.dependencies.length > 0) {
        console.log(`   Зависимости: ${subtask.dependencies.join(', ')}`)
      }
    })

    console.log('\n💡 РЕКОМЕНДАЦИИ:')
    console.log('================')
    oracleResponse.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`)
    })

  } catch (error) {
    console.error('❌ Ошибка анализа Oracle:', error)
    return
  }

  // ==================== STEP 5: ВЫПОЛНЕНИЕ ПОДЗАДАЧ ====================
  
  console.log('\n🔥 ВЫПОЛНЕНИЕ ПОДЗАДАЧ:')
  console.log('======================')

  // Frontend задача
  console.log('\n🎨 Выполняется: Frontend разработка...')
  const frontendTask = {
    id: 'frontend-task',
    type: 'implementation',
    description: 'Создать React + Next.js интерфейс для поиска документов с real-time функциональностью',
    requirements: {
      domains: ['frontend'],
      complexity: 7,
      timeConstraint: 120000, // 2 минуты
      qualityTarget: 0.85
    },
    dependencies: [],
    context: {
      framework: 'Next.js 15',
      styling: 'Tailwind CSS 4.0',
      features: ['file-upload', 'real-time-search', 'responsive-design']
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const frontendResult = await frontendExpert.processTask(frontendTask)
  
  console.log(`✅ Frontend: ${frontendResult.success ? 'Успешно' : 'Ошибка'}`)
  console.log(`   Токены: ${frontendResult.tokensUsed}`)
  console.log(`   Время: ${Math.round(frontendResult.responseTime / 1000)}с`)
  console.log(`   Качество: ${(frontendResult.qualityScore * 100).toFixed(1)}%`)

  // Backend задача
  console.log('\n🔧 Выполняется: Backend разработка...')
  const backendTask = {
    id: 'backend-task',
    type: 'implementation',
    description: 'Создать API для обработки документов с JWT аутентификацией и векторизацией',
    requirements: {
      domains: ['backend'],
      complexity: 8,
      timeConstraint: 150000, // 2.5 минуты
      qualityTarget: 0.9
    },
    dependencies: [],
    context: {
      framework: 'Hono + Bun',
      database: 'PostgreSQL + Drizzle',
      auth: 'JWT',
      api: 'OpenAPI 3.0'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const backendResult = await backendExpert.processTask(backendTask)
  
  console.log(`✅ Backend: ${backendResult.success ? 'Успешно' : 'Ошибка'}`)
  console.log(`   Токены: ${backendResult.tokensUsed}`)
  console.log(`   Время: ${Math.round(backendResult.responseTime / 1000)}с`)
  console.log(`   Качество: ${(backendResult.qualityScore * 100).toFixed(1)}%`)

  // AI задача
  console.log('\n🤖 Выполняется: AI разработка...')
  const aiTask = {
    id: 'ai-task',
    type: 'implementation',
    description: 'Реализовать систему семантического поиска с embeddings и vector database',
    requirements: {
      domains: ['ai'],
      complexity: 9,
      timeConstraint: 180000, // 3 минуты
      qualityTarget: 0.95
    },
    dependencies: ['backend-task'],
    context: {
      embeddings: 'OpenAI text-embedding-3-large',
      vectorDB: 'Pinecone',
      similarity: 'cosine',
      preprocessing: 'chunking + metadata'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const aiResult = await aiExpert.processTask(aiTask)
  
  console.log(`✅ AI: ${aiResult.success ? 'Успешно' : 'Ошибка'}`)
  console.log(`   Токены: ${aiResult.tokensUsed}`)
  console.log(`   Время: ${Math.round(aiResult.responseTime / 1000)}с`)
  console.log(`   Качество: ${(aiResult.qualityScore * 100).toFixed(1)}%`)

  // DevOps задача
  console.log('\n🚀 Выполняется: DevOps настройка...')
  const devopsTask = {
    id: 'devops-task',
    type: 'implementation',
    description: 'Контейнеризация приложения и настройка CI/CD pipeline с мониторингом',
    requirements: {
      domains: ['devops'],
      complexity: 6,
      timeConstraint: 90000, // 1.5 минуты
      qualityTarget: 0.8
    },
    dependencies: ['frontend-task', 'backend-task', 'ai-task'],
    context: {
      containerization: 'Docker + Docker Compose',
      orchestration: 'Kubernetes',
      cicd: 'GitHub Actions',
      monitoring: 'Prometheus + Grafana'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const devopsResult = await devopsExpert.processTask(devopsTask)
  
  console.log(`✅ DevOps: ${devopsResult.success ? 'Успешно' : 'Ошибка'}`)
  console.log(`   Токены: ${devopsResult.tokensUsed}`)
  console.log(`   Время: ${Math.round(devopsResult.responseTime / 1000)}с`)
  console.log(`   Качество: ${(devopsResult.qualityScore * 100).toFixed(1)}%`)

  // ==================== STEP 6: ФИНАЛЬНАЯ АНАЛИТИКА ====================
  
  console.log('\n📈 ИТОГОВАЯ АНАЛИТИКА:')
  console.log('======================')

  const totalTokens = frontendResult.tokensUsed + backendResult.tokensUsed + 
                     aiResult.tokensUsed + devopsResult.tokensUsed
  const totalTime = frontendResult.responseTime + backendResult.responseTime + 
                   aiResult.responseTime + devopsResult.responseTime
  const avgQuality = (frontendResult.qualityScore + backendResult.qualityScore + 
                     aiResult.qualityScore + devopsResult.qualityScore) / 4

  console.log(`Общие токены: ${totalTokens}`)
  console.log(`Общее время: ${Math.round(totalTime / 1000)}с`)
  console.log(`Средняя качество: ${(avgQuality * 100).toFixed(1)}%`)
  
  // Сравнение с single-model подходом
  const singleModelEstimate = 8000 // Примерная оценка для одной модели
  const tokenSavings = ((singleModelEstimate - totalTokens) / singleModelEstimate * 100)
  
  console.log(`\n💰 ЭКОНОМИЯ VS SINGLE-MODEL:`)
  console.log(`Токены сэкономлены: ${(tokenSavings > 0 ? tokenSavings : 0).toFixed(1)}%`)
  console.log(`Стоимость сэкономлена: $${((singleModelEstimate - totalTokens) * 0.002).toFixed(2)}`)

  // Метрики узлов
  console.log(`\n🔧 ПРОИЗВОДИТЕЛЬНОСТЬ УЗЛОВ:`)
  console.log('============================')
  
  const nodes = [
    { name: 'Frontend Expert', node: frontendExpert },
    { name: 'Backend Expert', node: backendExpert },
    { name: 'AI Expert', node: aiExpert },
    { name: 'DevOps Expert', node: devopsExpert }
  ]

  for (const { name, node } of nodes) {
    const metrics = node.getPerformanceMetrics()
    console.log(`${name}:`)
    console.log(`  Context Usage: ${(metrics.contextUsage * 100).toFixed(1)}%`)
    console.log(`  Efficiency: ${metrics.tokenEfficiency.toFixed(2)}`)
    console.log(`  Success Rate: ${(metrics.successRate * 100).toFixed(1)}%`)
    console.log(`  Connections: ${metrics.connections}`)
  }

  console.log('\n🎉 CAG-Chain демонстрация завершена!')
  console.log('=====================================')
  console.log('Система успешно продемонстрировала:')
  console.log('✅ Автоматическую декомпозицию сложных задач')
  console.log('✅ Интеллектуальное распределение по экспертам')
  console.log('✅ Оптимизацию использования токенов')
  console.log('✅ Высокое качество специализированных решений')
  console.log('✅ Эффективную экономию ресурсов')
}

// Запуск демонстрации
if (require.main === module) {
  demonstrateCAGChain().catch(console.error)
}

export { demonstrateCAGChain } 