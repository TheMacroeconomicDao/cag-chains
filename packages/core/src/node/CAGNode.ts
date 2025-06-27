import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { generateId, generateHash, getCurrentTimestamp } from '../utils/index.js'
import type { NodeType, Task, CAGMessage, TaskResult } from '../types/index.js'
import { NodeSizeConfig } from '../types/index.js'

export interface CAGNodeConfig {
  domain: string
  subdomains?: string[]
  nodeType: NodeType
  expertiseLevel?: number
  openaiApiKey: string
  model?: string
}

export interface NodeState {
  id: string
  headerHash: string
  nodeType: NodeType
  domain: string
  subdomains: string[]
  expertiseLevel: number
  status: 'initializing' | 'active' | 'busy' | 'error' | 'offline'
  contextWindow: {
    maxTokens: number
    currentUsage: number
    optimizationThreshold: number
  }
  performanceStats: {
    avgResponseTime: number
    tokenEfficiency: number
    successRate: number
    lastUpdated: Date
  }
  connections: Map<string, number>
  createdAt: Date
  updatedAt: Date
}

export class CAGNode {
  private state: NodeState
  private context: string[] = []
  private messageHandlers: Map<string, (message: CAGMessage) => Promise<void>> = new Map()
  private taskQueue: Task[] = []
  private isProcessing = false

  constructor(config: CAGNodeConfig) {
    const nodeConfig = NodeSizeConfig[config.nodeType]
    const now = new Date()

    this.state = {
      id: generateId(),
      headerHash: this.generateHeaderHash(config.domain, config.subdomains || []),
      nodeType: config.nodeType,
      domain: config.domain,
      subdomains: config.subdomains || [],
      expertiseLevel: config.expertiseLevel || 0.7,
      status: 'initializing',
      
      contextWindow: {
        maxTokens: nodeConfig.maxTokens,
        currentUsage: 0,
        optimizationThreshold: 0.85
      },
      
      performanceStats: {
        avgResponseTime: 0,
        tokenEfficiency: 0,
        successRate: 1.0,
        lastUpdated: now
      },
      
      connections: new Map(),
      createdAt: now,
      updatedAt: now
    }

    // Initialize the node
    this.initialize().catch((error) => {
      console.error(`❌ Failed to initialize CAG-Node ${this.state.id}:`, error)
      this.state.status = 'error'
    })
  }

  private async initialize(): Promise<void> {
    console.log(`🚀 Initializing CAG-Node: ${this.state.domain} (${this.state.nodeType})`)
    
    // Load domain-specific context
    await this.loadDomainContext()
    
    // Register default message handlers
    this.registerMessageHandlers()
    
    // Start task processing loop
    this.startTaskProcessor()
    
    // Update status
    this.state.status = 'active'
    this.state.updatedAt = new Date()
    
    console.log(`✅ CAG-Node initialized: ${this.state.id}`)
  }

  private generateHeaderHash(domain: string, subdomains: string[]): string {
    const headerData = {
      domain,
      subdomains,
      timestamp: getCurrentTimestamp(),
      capabilities: this.getCapabilities(domain, subdomains),
      version: '2025.1'
    }
    return generateHash(JSON.stringify(headerData))
  }

  private getCapabilities(domain: string, subdomains: string[]): string[] {
    const baseCapabilities = [
      `${domain}-expert`,
      `${domain}-analysis`,
      `${domain}-synthesis`,
      'problem-solving',
      'context-optimization'
    ]
    
    const subdomainCapabilities = subdomains.map(
      subdomain => `${subdomain}-specialist`
    )
    
    return [...baseCapabilities, ...subdomainCapabilities]
  }

  private async loadDomainContext(): Promise<void> {
    const systemPrompt = this.buildSystemPrompt()
    this.addToContext(systemPrompt)
    
    // Load specialized knowledge based on domain
    const specializedContext = await this.loadSpecializedKnowledge()
    this.addToContext(specializedContext)
  }

  private buildSystemPrompt(): string {
    return `# CAG-Node System Prompt v2025.1

You are a specialized AI expert in the domain of ${this.state.domain}.

## Core Identity
- **Expertise Level**: ${(this.state.expertiseLevel * 100).toFixed(1)}%
- **Specializations**: ${this.state.subdomains.join(', ') || 'General'}
- **Node Type**: ${this.state.nodeType} (${this.state.contextWindow.maxTokens} tokens)

## Capabilities
${this.getCapabilities(this.state.domain, this.state.subdomains).map(cap => `- ${cap}`).join('\n')}

## Operating Principles
1. **Focus on Excellence**: Provide expert-level insights within your domain
2. **Collaborate Effectively**: Work seamlessly with other CAG nodes
3. **Optimize Context**: Use tokens efficiently, compress when needed
4. **Quality First**: Prioritize accuracy and usefulness over speed

## Response Format
- Be concise yet comprehensive
- Provide actionable insights
- Indicate when expertise outside your domain is needed
- Include confidence levels for your recommendations

Current context usage: ${this.state.contextWindow.currentUsage}/${this.state.contextWindow.maxTokens} tokens`
  }

  private async loadSpecializedKnowledge(): Promise<string> {
    // This would typically load from knowledge bases, but for now return domain-specific context
    const domainKnowledge = this.getDomainKnowledge(this.state.domain)
    
    // In a full implementation, this would:
    // 1. Query vector databases for relevant documents
    // 2. Load domain-specific training data
    // 3. Connect to external APIs for real-time data
    // 4. Use RAG (Retrieval Augmented Generation) techniques
    
    return domainKnowledge
  }

  private getDomainKnowledge(domain: string): string {
    const knowledgeBase: Record<string, string> = {
      'frontend': `# Frontend Development Expertise

## Core Technologies
- **React 19**: Concurrent features, Server Components, Actions
- **Next.js 15**: App Router 2.0, Turbopack, Server Actions
- **TypeScript 5.4+**: Advanced type features, decorators
- **Tailwind CSS 4.0**: New engine, container queries
- **Vite 5+**: Lightning-fast builds, optimized bundling

## Best Practices
- Component composition over inheritance
- Progressive enhancement with SSR/SSG
- Performance optimization (Core Web Vitals)
- Accessibility-first design (WCAG 2.2)
- Modern CSS (Grid, Flexbox, Container Queries)

## Tools & Ecosystem
- Biome for linting/formatting
- Vitest for testing
- Playwright for E2E testing
- Storybook for component development`,

      'backend': `# Backend Development Expertise

## Core Technologies
- **Bun 1.1+**: Fastest JavaScript runtime
- **Hono**: Ultra-fast web framework
- **Drizzle ORM**: Type-safe database operations
- **PostgreSQL 16+**: Advanced SQL features
- **Redis 7+**: High-performance caching

## Architecture Patterns
- Domain-driven design
- Event-driven architecture
- Microservices with proper boundaries
- API-first development
- Clean architecture principles

## Performance & Scalability
- Connection pooling and optimization
- Caching strategies (Redis, CDN)
- Database indexing and query optimization
- Horizontal scaling patterns
- Load balancing and failover`,

      'ai': `# AI/ML Development Expertise

## Core Technologies
- **OpenAI GPT-4/5**: Latest language models
- **Vercel AI SDK**: Streamlined AI development
- **LangChain**: Building AI applications
- **Vector Databases**: Pinecone, Weaviate, Chroma
- **Hugging Face**: Open-source models

## Techniques
- Retrieval Augmented Generation (RAG)
- Fine-tuning and prompt engineering
- Embedding and semantic search
- Multi-modal AI (text, image, audio)
- Agent architectures and tool use

## Best Practices
- Responsible AI development
- Model evaluation and monitoring
- Cost optimization strategies
- Privacy and security considerations
- Ethical AI guidelines`,

      'devops': `# DevOps & Infrastructure Expertise

## Core Technologies
- **Docker & Kubernetes**: Containerization at scale
- **Terraform**: Infrastructure as Code
- **GitHub Actions**: CI/CD automation
- **Cloudflare**: Edge computing and security
- **Monitoring**: Prometheus, Grafana, OpenTelemetry

## Practices
- GitOps workflow
- Blue-green deployments
- Infrastructure monitoring
- Security best practices
- Disaster recovery planning

## Cloud Platforms
- AWS, Azure, GCP comparative analysis
- Serverless architectures
- Edge computing strategies
- Cost optimization
- Multi-cloud approaches`
    }

    return knowledgeBase[domain.toLowerCase()] || `# ${domain} Domain Expertise

Specialized knowledge in ${domain} with focus on:
- Industry best practices
- Current trends and technologies
- Problem-solving methodologies
- Quality standards and metrics
- Continuous learning and adaptation`
  }

  private addToContext(content: string): void {
    this.context.push(content)
    
    // Estimate token usage (rough: 1 token ≈ 3.5 chars for GPT models)
    const estimatedTokens = Math.ceil(content.length / 3.5)
    this.state.contextWindow.currentUsage += estimatedTokens
    
    // Auto-compress if needed
    if (this.needsCompression()) {
      this.compressContext()
    }
  }

  private needsCompression(): boolean {
    const usage = this.state.contextWindow.currentUsage / this.state.contextWindow.maxTokens
    return usage >= this.state.contextWindow.optimizationThreshold
  }

  private async compressContext(): Promise<void> {
    console.log(`🗜️ Compressing context for node ${this.state.id}`)
    
    try {
      // Use AI to intelligently compress context
      const compressionPrompt = `Please compress the following context while preserving all essential information:

${this.context.slice(1).join('\n\n')}

Requirements:
- Maintain all key technical details
- Preserve domain-specific knowledge
- Keep important examples and patterns
- Reduce verbosity while keeping clarity
- Target 70% of original length`

      const { text } = await generateText({
        model: openai('gpt-4'),
        prompt: compressionPrompt,
        maxTokens: Math.floor(this.state.contextWindow.maxTokens * 0.3),
        temperature: 0.3
      })

      // Keep system prompt + compressed content
      this.context = [
        this.context[0], // System prompt
        `# Compressed Context\n${text}`
      ]

      // Recalculate usage
      const totalContent = this.context.join('\n\n')
      this.state.contextWindow.currentUsage = Math.ceil(totalContent.length / 3.5)
      
      // Update header hash
      this.state.headerHash = this.generateHeaderHash(this.state.domain, this.state.subdomains)
      this.state.updatedAt = new Date()

      console.log(`✅ Context compressed to ${this.state.contextWindow.currentUsage} tokens`)
    } catch (error) {
      console.error('Failed to compress context:', error)
    }
  }

  public async processTask(task: Task): Promise<TaskResult> {
    const startTime = getCurrentTimestamp()
    const taskId = generateId()
    
    try {
      this.state.status = 'busy'
      
      // Build the task prompt
      const prompt = this.buildTaskPrompt(task)
      
      // Choose appropriate model based on node type and task complexity
      const model = this.selectModel(task.requirements.complexity)
      
      // Generate response using AI SDK
      const { text, usage } = await generateText({
        model: openai(model),
        messages: [
          { role: 'system', content: this.context.join('\n\n') },
          { role: 'user', content: prompt }
        ],
        maxTokens: Math.min(4000, Math.floor(this.state.contextWindow.maxTokens * 0.3)),
        temperature: 0.7
      })

      const responseTime = getCurrentTimestamp() - startTime
      const tokensUsed = usage?.totalTokens || 0
      const qualityScore = this.calculateQualityScore(text, task, responseTime)

      // Update performance stats
      this.updatePerformanceStats(responseTime, tokensUsed, qualityScore, true)
      
      this.state.status = 'active'
      
      return {
        id: taskId,
        success: true,
        result: text,
        tokensUsed,
        responseTime,
        qualityScore,
        createdAt: new Date(),
        metadata: {
          model,
          contextTokens: this.state.contextWindow.currentUsage,
          nodeType: this.state.nodeType,
          domain: this.state.domain
        }
      }

    } catch (error) {
      const responseTime = getCurrentTimestamp() - startTime
      this.updatePerformanceStats(responseTime, 0, 0, false)
      
      this.state.status = 'error'
      
      return {
        id: taskId,
        success: false,
        tokensUsed: 0,
        responseTime,
        qualityScore: 0,
        createdAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private selectModel(complexity: number): string {
    // Choose model based on node type and task complexity
    if (complexity >= 8 || this.state.nodeType === 'xlarge') {
      return 'gpt-4-turbo-preview'
    } else if (complexity >= 6 || this.state.nodeType === 'large') {
      return 'gpt-4'
    } else if (complexity >= 4 || this.state.nodeType === 'medium') {
      return 'gpt-3.5-turbo'
    } else {
      return 'gpt-3.5-turbo'
    }
  }

  private buildTaskPrompt(task: Task): string {
    const requiredDomains = task.requirements.domains.join(', ')
    const isInMyDomain = task.requirements.domains.some(domain => 
      domain.toLowerCase() === this.state.domain.toLowerCase() ||
      this.state.subdomains.some(sub => sub.toLowerCase().includes(domain.toLowerCase()))
    )

    return `# Task Analysis Request

## Task Details
- **Type**: ${task.type}
- **Description**: ${task.description}
- **Complexity**: ${task.requirements.complexity}/10
- **Required Domains**: ${requiredDomains}
- **Time Constraint**: ${task.requirements.timeConstraint ? `${task.requirements.timeConstraint}ms` : 'None'}
- **Quality Target**: ${task.requirements.qualityTarget ? `${(task.requirements.qualityTarget * 100).toFixed(1)}%` : 'Standard'}

## Your Role
${isInMyDomain 
  ? `This task aligns with your expertise in ${this.state.domain}. Provide a comprehensive analysis and solution.`
  : `This task requires domains outside your primary expertise (${this.state.domain}). Provide what insights you can and clearly indicate what additional expertise is needed.`
}

## Instructions
1. Analyze the task from your domain perspective
2. Provide actionable recommendations
3. If collaboration is needed, specify what other domains should be involved
4. Include confidence level for your recommendations (0-100%)
5. Suggest next steps or implementation approach

Please provide a detailed response focusing on quality and accuracy.`
  }

  private calculateQualityScore(response: string, task: Task, responseTime: number): number {
    // Advanced quality scoring algorithm
    let score = 0.5 // Base score
    
    // Length and depth factor (0-0.3)
    const responseLength = response.length
    const lengthFactor = Math.min(responseLength / 2000, 1) * 0.3
    score += lengthFactor
    
    // Complexity match (0-0.3)
    const complexityFactor = (task.requirements.complexity / 10) * 0.3
    score += complexityFactor
    
    // Response time factor (0-0.2) - faster is better up to a point
    const timeFactor = responseTime < 5000 ? 0.2 : Math.max(0, 0.2 - (responseTime - 5000) / 50000)
    score += timeFactor
    
    // Domain relevance (0-0.2)
    const isRelevant = task.requirements.domains.some(domain => 
      domain.toLowerCase() === this.state.domain.toLowerCase()
    )
    if (isRelevant) score += 0.2
    
    return Math.max(0, Math.min(1, score))
  }

  private updatePerformanceStats(
    responseTime: number, 
    tokensUsed: number, 
    qualityScore: number,
    success: boolean
  ): void {
    const stats = this.state.performanceStats
    
    // Rolling averages with more weight on recent performance
    stats.avgResponseTime = stats.avgResponseTime * 0.8 + responseTime * 0.2
    
    if (tokensUsed > 0) {
      const efficiency = qualityScore / (tokensUsed / 1000)
      stats.tokenEfficiency = stats.tokenEfficiency * 0.8 + efficiency * 0.2
    }
    
    const successValue = success ? 1.0 : 0.0
    stats.successRate = stats.successRate * 0.9 + successValue * 0.1
    
    stats.lastUpdated = new Date()
    this.state.updatedAt = new Date()
  }

  private registerMessageHandlers(): void {
    this.messageHandlers.set('QUERY', this.handleQueryMessage.bind(this))
    this.messageHandlers.set('UPDATE', this.handleUpdateMessage.bind(this))
    this.messageHandlers.set('DISCOVERY', this.handleDiscoveryMessage.bind(this))
    this.messageHandlers.set('HEARTBEAT', this.handleHeartbeatMessage.bind(this))
  }

  private async handleQueryMessage(message: CAGMessage): Promise<void> {
    // Handle incoming query from another node
    console.log(`📨 Received query from ${message.from}`)
    // Implementation would process the query and send response
  }

  private async handleUpdateMessage(message: CAGMessage): Promise<void> {
    // Handle context updates from connected nodes
    console.log(`🔄 Received update from ${message.from}`)
  }

  private async handleDiscoveryMessage(message: CAGMessage): Promise<void> {
    // Handle node discovery in P2P network
    console.log(`🔍 Discovery message from ${message.from}`)
  }

  private async handleHeartbeatMessage(message: CAGMessage): Promise<void> {
    // Handle heartbeat for connection maintenance
    console.log(`💓 Heartbeat from ${message.from}`)
  }

  private startTaskProcessor(): void {
    // Task processing loop
    setInterval(() => {
      if (!this.isProcessing && this.taskQueue.length > 0) {
        this.processNextTask()
      }
    }, 100)
  }

  private async processNextTask(): Promise<void> {
    if (this.taskQueue.length === 0) return
    
    this.isProcessing = true
    const task = this.taskQueue.shift()!
    
    try {
      await this.processTask(task)
    } catch (error) {
      console.error(`Failed to process task ${task.id}:`, error)
    } finally {
      this.isProcessing = false
    }
  }

  // Public API
  public getState(): NodeState {
    return { ...this.state }
  }

  public getStatus(): string {
    return this.state.status
  }

  public getContextUsage(): number {
    return this.state.contextWindow.currentUsage / this.state.contextWindow.maxTokens
  }

  public canHandleTask(task: Task): boolean {
    const hasRequiredDomain = task.requirements.domains.some(
      domain => domain.toLowerCase() === this.state.domain.toLowerCase() ||
                this.state.subdomains.some(sub => sub.toLowerCase().includes(domain.toLowerCase()))
    )
    
    const hasCapacity = this.getContextUsage() < 0.9
    const isAvailable = this.state.status === 'active'
    
    return hasRequiredDomain && hasCapacity && isAvailable
  }

  public addToQueue(task: Task): void {
    this.taskQueue.push(task)
  }

  public addConnection(nodeHash: string, strength: number): void {
    this.state.connections.set(nodeHash, strength)
    this.state.updatedAt = new Date()
  }

  public removeConnection(nodeHash: string): void {
    this.state.connections.delete(nodeHash)
    this.state.updatedAt = new Date()
  }

  public async handleMessage(message: CAGMessage): Promise<void> {
    const handler = this.messageHandlers.get(message.type)
    if (handler) {
      await handler(message)
    } else {
      console.warn(`No handler for message type: ${message.type}`)
    }
  }

  public getPerformanceMetrics() {
    return {
      ...this.state.performanceStats,
      contextUsage: this.getContextUsage(),
      queueLength: this.taskQueue.length,
      isProcessing: this.isProcessing,
      connections: this.state.connections.size
    }
  }
} 