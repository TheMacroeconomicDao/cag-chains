import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { generateId, calculateTokenCost, getCurrentTimestamp } from '../utils/index.js'
import type { Task, CAGChain, CAGNode, NodeType, OptimizationStrategy, ChainTopology } from '../types/index.js'

export interface ChainPlan {
  id: string
  topology: ChainTopology
  tasks: Task[]
  nodeRequirements: NodeRequirement[]
  estimatedCost: number
  estimatedDuration: number
  confidence: number
  reasoning: string
  alternatives: ChainAlternative[]
}

export interface NodeRequirement {
  taskId: string
  requiredDomains: string[]
  nodeType: NodeType
  minExpertise: number
  priority: number
}

export interface ChainAlternative {
  topology: ChainTopology
  cost: number
  duration: number
  description: string
}

export interface OracleConfig {
  optimizationStrategy: OptimizationStrategy
  maxChainSize: number
  maxConcurrentChains: number
  nodeDiscoveryTimeout: number
  taskTimeout: number
  costWeighting: number
  speedWeighting: number
  qualityWeighting: number
}

export interface TaskAnalysis {
  complexity: number
  requiredDomains: string[]
  decomposition: SubTask[]
  dependencies: TaskDependency[]
  estimatedTokens: number
  parallelizable: boolean
}

export interface SubTask {
  id: string
  type: string
  description: string
  domain: string
  complexity: number
  dependencies: string[]
}

export interface TaskDependency {
  from: string
  to: string
  type: 'data' | 'sequence' | 'validation'
  strength: number
}

export interface OracleResult {
  analysis: TaskAnalysis
  plan: ChainPlan
  recommendations: string[]
}

export class Oracle {
  private config: OracleConfig
  private activeChains: Map<string, CAGChain> = new Map()
  private nodeRegistry: Map<string, CAGNode> = new Map()
  private chainHistory: ChainPlan[] = []

  constructor(config: Partial<OracleConfig> = {}) {
    this.config = {
      optimizationStrategy: 'balanced',
      maxChainSize: 10,
      maxConcurrentChains: 100,
      nodeDiscoveryTimeout: 5000,
      taskTimeout: 300000,
      costWeighting: 0.3,
      speedWeighting: 0.4,
      qualityWeighting: 0.3,
      ...config
    }
    console.log('🔮 Oracle initialized with strategy:', this.config.optimizationStrategy)
  }

  async processRequest(taskDescription: string, context: Record<string, unknown> = {}): Promise<OracleResult> {
    console.log('🔮 Oracle processing request:', taskDescription.substring(0, 100) + '...')
    
    const startTime = getCurrentTimestamp()
    
    try {
      // Step 1: Analyze the task
      const analysis = await this.analyzeTask(taskDescription, context)
      
      // Step 2: Plan the optimal chain
      const plan = await this.planChain(analysis, Array.from(this.nodeRegistry.values()))
      
      // Step 3: Generate recommendations
      const recommendations = this.generateRecommendations(analysis, plan)
      
      const processingTime = getCurrentTimestamp() - startTime
      console.log(`✅ Oracle completed processing in ${processingTime}ms`)
      
      // Step 4: Store in history
      this.chainHistory.push(plan)
      
      return { analysis, plan, recommendations }
    } catch (error) {
      console.error('Oracle processing failed:', error)
      throw error
    }
  }

  async analyzeTask(taskDescription: string, context: Record<string, unknown> = {}): Promise<TaskAnalysis> {
    const analysisPrompt = `Analyze this task for CAG-Chain decomposition:

Task: ${taskDescription}
Context: ${JSON.stringify(context, null, 2)}

Provide a detailed analysis in JSON format with:
1. complexity (1-10 scale)
2. requiredDomains (array of needed expertise areas)
3. decomposition (array of subtasks)
4. dependencies (relationships between subtasks)
5. estimatedTokens (total token usage estimate)
6. parallelizable (boolean)

Focus on:
- Breaking complex tasks into specialized domains
- Identifying dependencies and parallel opportunities
- Realistic complexity and token estimates
- Clear subtask descriptions

Return only valid JSON.`

    try {
      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt: analysisPrompt,
        maxTokens: 2000,
        temperature: 0.3
      })

      // Parse AI response
      const analysisData = JSON.parse(text)
      
      // Validate and structure the analysis
      const analysis: TaskAnalysis = {
        complexity: Math.max(1, Math.min(10, analysisData.complexity || 5)),
        requiredDomains: Array.isArray(analysisData.requiredDomains) ? analysisData.requiredDomains : ['general'],
        decomposition: this.validateSubTasks(analysisData.decomposition || []),
        dependencies: this.validateDependencies(analysisData.dependencies || []),
        estimatedTokens: Math.max(100, analysisData.estimatedTokens || 1000),
        parallelizable: Boolean(analysisData.parallelizable)
      }

      console.log('✅ Task analysis completed:', {
        complexity: analysis.complexity,
        domains: analysis.requiredDomains.length,
        subtasks: analysis.decomposition.length
      })

      return analysis
    } catch (error) {
      console.error('❌ Task analysis failed:', error)
      
      // Fallback analysis
      return {
        complexity: 5,
        requiredDomains: ['general'],
        decomposition: [{
          id: generateId(),
          type: 'general_task',
          description: taskDescription,
          domain: 'general',
          complexity: 5,
          dependencies: []
        }],
        dependencies: [],
        estimatedTokens: 1000,
        parallelizable: false
      }
    }
  }

  private async createOptimalPlan(analysis: TaskAnalysis, context: Record<string, unknown>): Promise<ChainPlan> {
    const planId = generateId()
    
    // Determine optimal topology based on dependencies
    const topology = this.selectTopology(analysis)
    
    // Convert decomposition to tasks
    const tasks = this.createTasksFromDecomposition(analysis.decomposition, context)
    
    // Create node requirements
    const nodeRequirements = this.createNodeRequirements(tasks, analysis)
    
    // Calculate estimates based on optimization strategy
    const { estimatedCost, estimatedDuration } = this.calculateEstimates(tasks, nodeRequirements)
    
    // Generate reasoning
    const reasoning = this.generatePlanReasoning(analysis, topology, this.config.optimizationStrategy)
    
    // Create alternatives
    const alternatives = this.generateAlternatives(analysis, estimatedCost, estimatedDuration)
    
    // Calculate confidence based on various factors
    const confidence = this.calculatePlanConfidence(analysis, tasks, nodeRequirements)

    const plan: ChainPlan = {
      id: planId,
      topology,
      tasks,
      nodeRequirements,
      estimatedCost,
      estimatedDuration,
      confidence,
      reasoning,
      alternatives
    }

    console.log('✅ Chain plan created:', {
      id: planId,
      topology,
      tasks: tasks.length,
      confidence: Math.round(confidence * 100) + '%'
    })

    return plan
  }

  private selectTopology(analysis: TaskAnalysis): ChainTopology {
    if (analysis.parallelizable && analysis.decomposition.length > 3) {
      return 'parallel'
    }
    
    if (analysis.dependencies.length > analysis.decomposition.length) {
      return 'graph'
    }
    
    if (analysis.decomposition.length > 5) {
      return 'tree'
    }
    
    return 'linear'
  }

  private createTasksFromDecomposition(decomposition: SubTask[], context: Record<string, unknown>): Task[] {
    return decomposition.map(subtask => ({
      id: subtask.id,
      type: subtask.type,
      description: subtask.description,
      requirements: {
        domains: [subtask.domain],
        complexity: subtask.complexity,
        timeConstraint: this.config.taskTimeout,
        qualityTarget: 0.8
      },
      dependencies: subtask.dependencies,
      context: {
        ...context,
        originalSubtask: subtask
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }))
  }

  private createNodeRequirements(tasks: Task[], analysis: TaskAnalysis): NodeRequirement[] {
    return tasks.map(task => {
      const nodeType = this.selectNodeType(task.requirements.complexity, this.config.optimizationStrategy)
      const minExpertise = this.calculateMinExpertise(task.requirements.complexity)
      
      return {
        taskId: task.id,
        requiredDomains: task.requirements.domains,
        nodeType,
        minExpertise,
        priority: this.calculateTaskPriority(task, analysis)
      }
    })
  }

  private selectNodeType(complexity: number, strategy: OptimizationStrategy): NodeType {
    if (strategy === 'cost') {
      // Prefer smaller nodes for cost optimization
      if (complexity <= 3) return 'nano'
      if (complexity <= 5) return 'small'
      if (complexity <= 7) return 'medium'
      return 'large'
    }
    
    if (strategy === 'speed') {
      // Prefer larger nodes for speed
      if (complexity <= 2) return 'small'
      if (complexity <= 4) return 'medium'
      if (complexity <= 6) return 'large'
      return 'xlarge'
    }
    
    if (strategy === 'quality') {
      // Prefer larger nodes for quality
      if (complexity <= 3) return 'medium'
      if (complexity <= 6) return 'large'
      return 'xlarge'
    }
    
    // Balanced strategy
    if (complexity <= 2) return 'nano'
    if (complexity <= 4) return 'small'
    if (complexity <= 6) return 'medium'
    if (complexity <= 8) return 'large'
    return 'xlarge'
  }

  private calculateMinExpertise(complexity: number): number {
    // Higher complexity requires higher expertise
    return Math.max(0.5, Math.min(1.0, 0.4 + (complexity / 10) * 0.5))
  }

  private calculateTaskPriority(task: Task, analysis: TaskAnalysis): number {
    // Higher priority for tasks with more dependencies
    const dependencyCount = analysis.dependencies.filter(dep => dep.to === task.id).length
    const hasDependents = analysis.dependencies.some(dep => dep.from === task.id)
    
    let priority = 5 // Base priority
    priority += dependencyCount * 0.5 // Increase for dependencies
    priority += hasDependents ? 1 : 0 // Increase if other tasks depend on this
    priority += task.requirements.complexity * 0.2 // Slight increase for complexity
    
    return Math.max(1, Math.min(10, priority))
  }

  private calculateEstimates(tasks: Task[], nodeRequirements: NodeRequirement[]): { estimatedCost: number, estimatedDuration: number } {
    let totalCost = 0
    let totalDuration = 0
    
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i]
      const requirement = nodeRequirements[i]
      
      // Cost calculation based on node type and complexity
      const nodeCost = this.getNodeCost(requirement.nodeType)
      const complexityMultiplier = task.requirements.complexity / 5
      const taskCost = nodeCost * complexityMultiplier
      
      totalCost += taskCost
      
      // Duration calculation
      const baseDuration = task.requirements.complexity * 1000 // ms per complexity point
      const nodeSpeedMultiplier = this.getNodeSpeedMultiplier(requirement.nodeType)
      const taskDuration = baseDuration / nodeSpeedMultiplier
      
      totalDuration = Math.max(totalDuration, taskDuration) // Assuming parallel execution
    }
    
    return {
      estimatedCost: Math.round(totalCost * 100) / 100,
      estimatedDuration: Math.round(totalDuration)
    }
  }

  private getNodeCost(nodeType: NodeType): number {
    const costs = {
      nano: 0.1,
      small: 0.5,
      medium: 1.0,
      large: 2.0,
      xlarge: 4.0
    }
    return costs[nodeType as keyof typeof costs] || 1.0
  }

  private getNodeSpeedMultiplier(nodeType: NodeType): number {
    const multipliers = {
      nano: 0.5,
      small: 0.8,
      medium: 1.0,
      large: 1.5,
      xlarge: 2.0
    }
    return multipliers[nodeType as keyof typeof multipliers] || 1.0
  }

  private generatePlanReasoning(analysis: TaskAnalysis, topology: ChainTopology, strategy: OptimizationStrategy): string {
    return `Chain plan optimized for ${strategy} strategy:
- Topology: ${topology} (selected based on ${analysis.parallelizable ? 'parallelizable' : 'sequential'} nature)
- Complexity: ${analysis.complexity}/10 (requires ${analysis.requiredDomains.length} specialized domains)
- Decomposition: ${analysis.decomposition.length} subtasks with ${analysis.dependencies.length} dependencies
- Optimization: Balanced for ${strategy === 'cost' ? 'minimal cost' : strategy === 'speed' ? 'fastest execution' : strategy === 'quality' ? 'highest quality' : 'balanced performance'}`
  }

  private generateAlternatives(analysis: TaskAnalysis, baseCost: number, baseDuration: number): ChainAlternative[] {
    const alternatives: ChainAlternative[] = []
    
    // Cost-optimized alternative
    alternatives.push({
      topology: 'linear' as ChainTopology,
      cost: baseCost * 0.7,
      duration: baseDuration * 1.3,
      description: 'Cost-optimized: Sequential execution with smaller nodes'
    })
    
    // Speed-optimized alternative
    alternatives.push({
      topology: 'parallel' as ChainTopology,
      cost: baseCost * 1.4,
      duration: baseDuration * 0.6,
      description: 'Speed-optimized: Parallel execution with larger nodes'
    })
    
    // Quality-optimized alternative
    alternatives.push({
      topology: 'tree' as ChainTopology,
      cost: baseCost * 1.2,
      duration: baseDuration * 1.1,
      description: 'Quality-optimized: Hierarchical execution with validation steps'
    })
    
    return alternatives
  }

  private calculatePlanConfidence(analysis: TaskAnalysis, tasks: Task[], nodeRequirements: NodeRequirement[]): number {
    let confidence = 0.5 // Base confidence
    
    // Increase confidence for well-defined tasks
    if (analysis.decomposition.length > 0) confidence += 0.2
    
    // Increase confidence for known domains
    const knownDomains = ['frontend', 'backend', 'ai', 'devops', 'general']
    const knownDomainRatio = analysis.requiredDomains.filter(domain => 
      knownDomains.includes(domain.toLowerCase())
    ).length / analysis.requiredDomains.length
    confidence += knownDomainRatio * 0.2
    
    // Decrease confidence for high complexity
    if (analysis.complexity > 8) confidence -= 0.1
    
    // Increase confidence for clear dependencies
    if (analysis.dependencies.length > 0) confidence += 0.1
    
    return Math.max(0.1, Math.min(1.0, confidence))
  }

  private generateRecommendations(analysis: TaskAnalysis, plan: ChainPlan): string[] {
    const recommendations: string[] = []
    
    if (analysis.complexity > 7) {
      recommendations.push('High complexity task - consider breaking down further for better results')
    }
    
    if (plan.estimatedCost > 10) {
      recommendations.push('High estimated cost - consider using smaller node types or optimizing for cost')
    }
    
    if (plan.estimatedDuration > 60000) {
      recommendations.push('Long execution time - consider parallel execution or faster node types')
    }
    
    if (analysis.requiredDomains.length > 3) {
      recommendations.push('Multiple domains required - ensure specialized Chain Nodes are available')
    }
    
    if (plan.confidence < 0.7) {
      recommendations.push('Low confidence plan - consider manual review and optimization')
    }
    
    return recommendations
  }

  private validateSubTasks(decomposition: any[]): SubTask[] {
    return decomposition.map(task => ({
      id: task.id || generateId(),
      type: task.type || 'general_task',
      description: task.description || '',
      domain: task.domain || 'general',
      complexity: Math.max(1, Math.min(10, task.complexity || 5)),
      dependencies: Array.isArray(task.dependencies) ? task.dependencies : []
    }))
  }

  private validateDependencies(dependencies: any[]): TaskDependency[] {
    return dependencies.map(dep => ({
      from: dep.from || '',
      to: dep.to || '',
      type: ['data', 'sequence', 'validation'].includes(dep.type) ? dep.type : 'sequence',
      strength: Math.max(0, Math.min(1, dep.strength || 0.5))
    }))
  }

  // ==================== CHAIN PLANNING ====================

  public async planChain(taskAnalysis: TaskAnalysis, availableNodes: CAGNode[]): Promise<ChainPlan> {
    console.log(`⚡ Oracle planning optimal chain for ${taskAnalysis.decomposition.length} subtasks`)
    
    try {
      const planningPrompt = this.buildChainPlanningPrompt(taskAnalysis, availableNodes)
      
      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt: planningPrompt,
        maxTokens: 3000,
        temperature: 0.2
      })

      return this.parseChainPlan(text, taskAnalysis, availableNodes)
    } catch (error) {
      console.error('Chain planning failed:', error)
      throw new Error(`Failed to plan chain: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private buildChainPlanningPrompt(taskAnalysis: TaskAnalysis, availableNodes: CAGNode[]): string {
    const nodeCapabilities = availableNodes.map(node => ({
      id: node.id,
      domain: node.domain,
      subdomains: node.subdomains,
      nodeType: node.nodeType,
      expertiseLevel: node.expertiseLevel,
      status: node.status,
      maxTokens: node.contextWindow.maxTokens,
      currentUsage: node.contextWindow.currentUsage,
      performance: {
        avgResponseTime: node.performanceStats.avgResponseTime,
        tokenEfficiency: node.performanceStats.tokenEfficiency,
        successRate: node.performanceStats.successRate
      }
    }))

    return `# Oracle Chain Planning v2025.1

Design an optimal CAG-Chain execution plan for the analyzed task.

## Task Analysis
**Complexity**: ${taskAnalysis.complexity}/10
**Required Domains**: ${taskAnalysis.requiredDomains.join(', ')}
**Parallelizable**: ${taskAnalysis.parallelizable}
**Estimated Tokens**: ${taskAnalysis.estimatedTokens}

### Subtasks
${taskAnalysis.decomposition.map(task => 
  `- **${task.id}** (${task.domain}): ${task.description} [Complexity: ${task.complexity}]`
).join('\n')}

### Dependencies
${taskAnalysis.dependencies.map(dep => 
  `- ${dep.from} → ${dep.to} (${dep.type}, strength: ${dep.strength})`
).join('\n')}

## Available Nodes
${nodeCapabilities.map(node => 
  `- **${node.id}** (${node.nodeType}): ${node.domain} | Expertise: ${(node.expertiseLevel * 100).toFixed(1)}% | Status: ${node.status} | Efficiency: ${node.performance.tokenEfficiency.toFixed(2)}`
).join('\n')}

## Optimization Strategy
**Current Strategy**: ${this.config.optimizationStrategy}
- Cost Weight: ${this.config.costWeighting}
- Speed Weight: ${this.config.speedWeighting}  
- Quality Weight: ${this.config.qualityWeighting}

## Planning Requirements
Provide an optimal execution plan in JSON format:

\`\`\`json
{
  "topology": "linear|tree|graph|parallel",
  "nodeAssignments": [
    {
      "taskId": "subtask_id",
      "nodeId": "best_node_id",
      "priority": <1-10>,
      "estimatedCost": <token_cost>,
      "estimatedDuration": <milliseconds>,
      "reasoning": "Why this node is optimal"
    }
  ],
  "executionOrder": [
    {
      "phase": 1,
      "tasks": ["task_id_1", "task_id_2"],
      "parallelizable": true
    }
  ],
  "estimatedTotalCost": <total_tokens>,
  "estimatedTotalDuration": <total_milliseconds>,
  "confidence": <0-1 confidence score>,
  "reasoning": "Overall strategy explanation",
  "alternatives": [
    {
      "topology": "alternative_topology",
      "cost": <alternative_cost>,
      "duration": <alternative_duration>,
      "description": "Brief description of alternative"
    }
  ],
  "riskFactors": [
    {
      "factor": "risk description",
      "probability": <0-1>,
      "impact": "low|medium|high",
      "mitigation": "mitigation strategy"
    }
  ]
}
\`\`\`

## Key Considerations
1. **Node Capacity**: Consider current token usage and availability
2. **Domain Expertise**: Match tasks to specialized nodes
3. **Performance History**: Favor nodes with good success rates
4. **Dependencies**: Respect task dependencies in execution order
5. **Load Balancing**: Distribute work efficiently across nodes
6. **Fault Tolerance**: Plan for node failures and retries

Design the most efficient execution plan possible.`
  }

  private parseChainPlan(planText: string, taskAnalysis: TaskAnalysis, availableNodes: CAGNode[]): ChainPlan {
    try {
      const jsonMatch = planText.match(/```json\s*([\s\S]*?)\s*```/)
      if (!jsonMatch) {
        throw new Error('No JSON found in plan response')
      }

      const parsed = JSON.parse(jsonMatch[1])
      
      // Convert subtasks to full Task objects
      const tasks: Task[] = taskAnalysis.decomposition.map(subtask => ({
        id: subtask.id,
        type: subtask.type,
        description: subtask.description,
        requirements: {
          domains: [subtask.domain],
          complexity: subtask.complexity,
          timeConstraint: this.config.taskTimeout,
          qualityTarget: 0.8
        },
        dependencies: subtask.dependencies,
        context: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }))

      // Build node requirements
      const nodeRequirements: NodeRequirement[] = (parsed.nodeAssignments || []).map((assignment: any) => ({
        taskId: assignment.taskId,
        requiredDomains: tasks.find(t => t.id === assignment.taskId)?.requirements.domains || ['general'],
        nodeType: availableNodes.find(n => n.id === assignment.nodeId)?.nodeType || 'medium',
        minExpertise: 0.7,
        priority: assignment.priority || 5
      }))

      return {
        id: generateId(),
        topology: this.validateTopology(parsed.topology),
        tasks,
        nodeRequirements,
        estimatedCost: Math.max(0, parsed.estimatedTotalCost || taskAnalysis.estimatedTokens),
        estimatedDuration: Math.max(0, parsed.estimatedTotalDuration || 30000),
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.7)),
        reasoning: parsed.reasoning || 'Automated plan generation',
        alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives.map((alt: any) => ({
          topology: this.validateTopology(alt.topology),
          cost: Math.max(0, alt.cost || 0),
          duration: Math.max(0, alt.duration || 0),
          description: alt.description || ''
        })) : []
      }
    } catch (error) {
      console.error('Failed to parse chain plan:', error)
      
      // Fallback plan
      return this.createFallbackPlan(taskAnalysis, availableNodes)
    }
  }

  private validateTopology(topology: string): ChainTopology {
    const validTopologies: ChainTopology[] = ['linear', 'tree', 'graph', 'parallel']
    return validTopologies.includes(topology as ChainTopology) ? topology as ChainTopology : 'linear'
  }

  private createFallbackPlan(taskAnalysis: TaskAnalysis, availableNodes: CAGNode[]): ChainPlan {
    const tasks: Task[] = taskAnalysis.decomposition.map(subtask => ({
      id: subtask.id,
      type: subtask.type,
      description: subtask.description,
      requirements: {
        domains: [subtask.domain],
        complexity: subtask.complexity,
        timeConstraint: this.config.taskTimeout,
        qualityTarget: 0.8
      },
      dependencies: subtask.dependencies,
      context: {},
      createdAt: new Date(),
      updatedAt: new Date()
    }))

    const nodeRequirements: NodeRequirement[] = tasks.map(task => ({
      taskId: task.id,
      requiredDomains: task.requirements.domains,
      nodeType: 'medium',
      minExpertise: 0.5,
      priority: 5
    }))

    return {
      id: generateId(),
      topology: taskAnalysis.parallelizable ? 'parallel' : 'linear',
      tasks,
      nodeRequirements,
      estimatedCost: taskAnalysis.estimatedTokens,
      estimatedDuration: tasks.length * 10000, // 10s per task estimate
      confidence: 0.5,
      reasoning: 'Fallback plan due to planning error',
      alternatives: []
    }
  }

  // ==================== NODE SELECTION ====================

  public selectOptimalNodes(plan: ChainPlan, availableNodes: CAGNode[]): Map<string, string> {
    console.log(`🎯 Oracle selecting optimal nodes for ${plan.tasks.length} tasks`)
    
    const assignments = new Map<string, string>() // taskId -> nodeId
    
    for (const requirement of plan.nodeRequirements) {
      const optimalNode = this.findBestNodeForTask(requirement, availableNodes, assignments)
      if (optimalNode) {
        assignments.set(requirement.taskId, optimalNode.id)
      }
    }
    
    return assignments
  }

  private findBestNodeForTask(
    requirement: NodeRequirement, 
    availableNodes: CAGNode[], 
    existingAssignments: Map<string, string>
  ): CAGNode | null {
    
    // Filter available nodes
    const candidateNodes = availableNodes.filter(node => {
      // Check basic availability
      if (node.status !== 'active') return false
      
      // Check domain expertise
      const hasDomainExpertise = requirement.requiredDomains.some(domain =>
        node.domain.toLowerCase() === domain.toLowerCase() ||
        node.subdomains.some(sub => sub.toLowerCase().includes(domain.toLowerCase()))
      )
      if (!hasDomainExpertise) return false
      
      // Check expertise level
      if (node.expertiseLevel < requirement.minExpertise) return false
      
      // Check capacity
      const contextUsage = node.contextWindow.currentUsage / node.contextWindow.maxTokens
      if (contextUsage > 0.9) return false
      
      return true
    })
    
    if (candidateNodes.length === 0) {
      console.warn(`No suitable nodes found for task ${requirement.taskId}`)
      return null
    }
    
    // Score nodes based on optimization strategy
    const scoredNodes = candidateNodes.map(node => ({
      node,
      score: this.calculateNodeScore(node, requirement, existingAssignments)
    }))
    
    // Sort by score (higher is better)
    scoredNodes.sort((a, b) => b.score - a.score)
    
    return scoredNodes[0].node
  }

  private calculateNodeScore(
    node: CAGNode, 
    requirement: NodeRequirement, 
    existingAssignments: Map<string, string>
  ): number {
    let score = 0
    
    // Base expertise score (0-40 points)
    score += node.expertiseLevel * 40
    
    // Domain match bonus (0-20 points)
    const exactDomainMatch = requirement.requiredDomains.includes(node.domain)
    const subdomainMatch = requirement.requiredDomains.some(domain =>
      node.subdomains.some(sub => sub.toLowerCase().includes(domain.toLowerCase()))
    )
    if (exactDomainMatch) score += 20
    else if (subdomainMatch) score += 10
    
    // Performance history (0-20 points)
    score += node.performanceStats.successRate * 10
    score += Math.min(node.performanceStats.tokenEfficiency, 2) * 5
    
    // Capacity availability (0-10 points)
    const contextUsage = node.contextWindow.currentUsage / node.contextWindow.maxTokens
    score += (1 - contextUsage) * 10
    
    // Load balancing penalty
    const currentAssignments = Array.from(existingAssignments.values()).filter(nodeId => nodeId === node.id).length
    score -= currentAssignments * 2
    
    // Optimization strategy weighting
    if (this.config.optimizationStrategy === 'speed') {
      score += (1 / Math.max(node.performanceStats.avgResponseTime, 1)) * 1000 * 0.2
    } else if (this.config.optimizationStrategy === 'quality') {
      score += node.performanceStats.tokenEfficiency * 5
    } else if (this.config.optimizationStrategy === 'cost') {
      // Prefer smaller nodes for cost optimization
      const nodeTypeCostMap = { nano: 10, small: 5, medium: 0, large: -5, xlarge: -10 }
      score += nodeTypeCostMap[node.nodeType] || 0
    }
    
    return score
  }

  // ==================== CHAIN OPTIMIZATION ====================

  public optimizeChain(chain: CAGChain, currentPerformance: any): ChainPlan | null {
    console.log(`🔧 Oracle optimizing chain ${chain.id}`)
    
    // Analyze current performance
    const optimization = this.analyzeChainPerformance(chain, currentPerformance)
    
    if (optimization.improvementPotential < 0.1) {
      console.log('Chain already optimized')
      return null
    }
    
    // Generate optimization suggestions
    return this.generateOptimizationPlan(chain, optimization)
  }

  private analyzeChainPerformance(chain: CAGChain, performance: any) {
    // Analyze bottlenecks, inefficiencies, and improvement opportunities
    return {
      bottlenecks: [],
      inefficiencies: [],
      improvementPotential: 0.3,
      recommendations: []
    }
  }

  private generateOptimizationPlan(chain: CAGChain, analysis: any): ChainPlan {
    // Generate new optimized plan based on analysis
    // This is a simplified implementation
    
    // Create dummy tasks based on chain nodes
    const tasks: Task[] = chain.nodes.map((nodeId, index) => ({
      id: generateId(),
      type: 'optimization_task',
      description: `Optimized task for node ${nodeId}`,
      requirements: {
        domains: chain.metadata?.domains || ['general'],
        complexity: chain.metadata?.complexity || 5,
        timeConstraint: this.config.taskTimeout,
        qualityTarget: 0.8
      },
      dependencies: [],
      context: {},
      createdAt: new Date(),
      updatedAt: new Date()
    }))

    return {
      id: generateId(),
      topology: 'linear', // Default topology for optimization
      tasks,
      nodeRequirements: [],
      estimatedCost: 1000, // Default estimated cost
      estimatedDuration: 30000, // Default 30 seconds
      confidence: 0.8,
      reasoning: 'Optimized based on performance analysis',
      alternatives: []
    }
  }

  // ==================== PUBLIC API ====================

  public registerNode(node: CAGNode): void {
    this.nodeRegistry.set(node.id, node)
    console.log(`📝 Oracle registered node: ${node.domain} (${node.nodeType})`)
  }

  public unregisterNode(nodeId: string): void {
    this.nodeRegistry.delete(nodeId)
    console.log(`🗑️ Oracle unregistered node: ${nodeId}`)
  }

  public getActiveChains(): CAGChain[] {
    return Array.from(this.activeChains.values())
  }

  public getChainHistory(): ChainPlan[] {
    return [...this.chainHistory]
  }

  public updateConfig(newConfig: Partial<OracleConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('🔧 Oracle configuration updated:', newConfig)
  }
} 