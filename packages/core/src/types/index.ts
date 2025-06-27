import { z } from 'zod'

// ==================== NODE TYPES ====================

export const NodeTypeSchema = z.enum(['nano', 'small', 'medium', 'large', 'xlarge'])
export type NodeType = z.infer<typeof NodeTypeSchema>

export const NodeSizeConfig = {
  nano: { maxTokens: 4000, cost: 0.1 },
  small: { maxTokens: 16000, cost: 0.5 },
  medium: { maxTokens: 32000, cost: 1.0 },
  large: { maxTokens: 64000, cost: 2.0 },
  xlarge: { maxTokens: 128000, cost: 4.0 }
} as const

// ==================== CAG NODE ====================

export const ContextWindowSchema = z.object({
  maxTokens: z.number().positive(),
  currentUsage: z.number().nonnegative().default(0),
  optimizationThreshold: z.number().min(0).max(1).default(0.85)
})

export const PerformanceStatsSchema = z.object({
  avgResponseTime: z.number().nonnegative(),
  tokenEfficiency: z.number().nonnegative(),
  successRate: z.number().min(0).max(1),
  lastUpdated: z.date()
})

export const CAGNodeSchema = z.object({
  id: z.string().uuid(),
  headerHash: z.string().length(64), // SHA256 hash
  nodeType: NodeTypeSchema,
  
  // Context Management
  contextWindow: ContextWindowSchema,
  
  // Specialization
  domain: z.string().min(1),
  subdomains: z.array(z.string()),
  expertiseLevel: z.number().min(0).max(1),
  
  // Network
  connections: z.map(z.string(), z.number()),
  status: z.enum(['initializing', 'active', 'busy', 'error', 'offline']).default('initializing'),
  
  // Performance
  performanceStats: PerformanceStatsSchema,
  
  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date()
})

export type CAGNode = z.infer<typeof CAGNodeSchema>

// ==================== TASK & CHAIN ====================

export const TaskRequirementsSchema = z.object({
  domains: z.array(z.string()),    // Required expertise domains
  complexity: z.number().min(1).max(10),  // Complexity score
  timeConstraint: z.number().positive().optional(),  // Max processing time (ms)
  qualityTarget: z.number().min(0).max(1).optional()  // Min quality score
})

export const TaskSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  description: z.string(),
  requirements: TaskRequirementsSchema,
  dependencies: z.array(z.string().uuid()),  // IDs of prerequisite tasks
  context: z.record(z.unknown()),  // Task-specific context
  
  createdAt: z.date(),
  updatedAt: z.date()
})

export type Task = z.infer<typeof TaskSchema>

export const TaskResultSchema = z.object({
  id: z.string(),
  success: z.boolean(),
  data: z.unknown(),  // Actual result data
  result: z.string().optional(),  // String representation for backwards compatibility
  confidence: z.number().min(0).max(1).optional(),  // Confidence in result
  processingTime: z.number().nonnegative().optional(),  // Time taken to process
  tokensUsed: z.number().nonnegative().optional(),  // Tokens consumed
  responseTime: z.number().nonnegative().optional(),  // Response time
  qualityScore: z.number().min(0).max(1).optional(),  // Quality score
  error: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date()
})

export type TaskResult = z.infer<typeof TaskResultSchema>

export const ChainTopologySchema = z.enum(['linear', 'tree', 'graph', 'parallel'])
export type ChainTopology = z.infer<typeof ChainTopologySchema>

export const ChainStateSchema = z.enum([
  'init', 'planning', 'loading', 'ready', 
  'processing', 'aggregating', 'complete', 'error'
])

export const CAGChainSchema = z.object({
  id: z.string().uuid(),
  nodes: z.array(z.string()),  // Node IDs in chain
  connections: z.array(z.object({
    from: z.string(),
    to: z.string(),
    type: z.string().optional()
  })),
  metadata: z.object({
    createdBy: z.string().optional(),
    complexity: z.number().optional(),
    domains: z.array(z.string()).optional()
  }).optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export type CAGChain = z.infer<typeof CAGChainSchema>

// ==================== MESSAGES ====================

export const MessageTypeSchema = z.enum(['QUERY', 'RESPONSE', 'UPDATE', 'DISCOVERY', 'HEARTBEAT'])

export const MessagePayloadSchema = z.object({
  compression: z.enum(['zstd', 'gzip', 'none']).default('zstd'),
  data: z.instanceof(Uint8Array),
  checksum: z.string()
})

export const CAGMessageSchema = z.object({
  // Header
  version: z.string().default('1.0'),
  type: MessageTypeSchema,
  from: z.string().length(64), // Sender hash
  to: z.string().length(64),   // Receiver hash
  timestamp: z.number(),
  
  // Security
  signature: z.string(),  // Ed25519 signature
  nonce: z.string(),      // Anti-replay protection
  
  // Payload
  payload: MessagePayloadSchema,
  
  // Routing
  ttl: z.number().positive().default(300), // 5 minutes TTL
  hopCount: z.number().nonnegative().default(0),
  routingPath: z.array(z.string())
})

export type CAGMessage = z.infer<typeof CAGMessageSchema>

// ==================== METRICS ====================

export const NodeMetricsSchema = z.object({
  nodeId: z.string().uuid(),
  timeWindow: z.object({
    start: z.date(),
    end: z.date()
  }),
  metrics: z.object({
    requestsProcessed: z.number().nonnegative(),
    avgResponseTime: z.number().nonnegative(),
    tokenEfficiency: z.number().nonnegative(), // quality_score / tokens_used
    successRate: z.number().min(0).max(1),
    errorRate: z.number().min(0).max(1),
    contextCompressionRatio: z.number().min(0).max(1)
  })
})

export type NodeMetrics = z.infer<typeof NodeMetricsSchema>

// ==================== ORACLE ====================

export const OptimizationStrategySchema = z.enum(['cost', 'speed', 'quality', 'balanced'])
export type OptimizationStrategy = z.infer<typeof OptimizationStrategySchema>

export const OracleConfigSchema = z.object({
  optimizationStrategy: OptimizationStrategySchema.default('balanced'),
  maxChainSize: z.number().positive().default(10),
  maxConcurrentChains: z.number().positive().default(100),
  nodeDiscoveryTimeout: z.number().positive().default(5000), // 5 seconds
  taskTimeout: z.number().positive().default(300000) // 5 minutes
})

export type OracleConfig = z.infer<typeof OracleConfigSchema>

// ==================== UTILITIES ====================

export const ErrorCodeSchema = z.enum([
  'NODE_UNAVAILABLE',
  'CONTEXT_OVERFLOW', 
  'INVALID_MESSAGE',
  'AUTHENTICATION_FAILED',
  'TASK_TIMEOUT',
  'CHAIN_FORMATION_FAILED',
  'NETWORK_PARTITION',
  'INSUFFICIENT_RESOURCES'
])

export type ErrorCode = z.infer<typeof ErrorCodeSchema>

export const CAGErrorSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string(),
  nodeId: z.string().uuid().optional(),
  chainId: z.string().uuid().optional(),
  timestamp: z.date(),
  context: z.record(z.unknown()).optional()
})

export type CAGError = z.infer<typeof CAGErrorSchema>

// ==================== GUARD SYSTEM TYPES ====================

export interface A2AHeader {
  nodeId: string
  expertDomains: string[]
  competenceMap: Record<string, number>
  capabilities: string[]
  contextHash: string
  guardThresholds: {
    minConfidence: number
    rejectBelow: number
  }
  blockedAt: Date
  version: string
}

export interface GuardDecision {
  action: 'allow' | 'reject' | 'redirect'
  confidence: number
  reasoning: string
  contextMatchScore: number
  missingCapabilities: string[]
  suggestedNodeType?: string
  processingTime: number
  cost: number
}

export interface GuardResult {
  success: boolean
  guardDecision: GuardDecision
  result?: TaskResult
  rejectionReason?: string
  redirectSent?: boolean
  totalCost: number
  totalTime: number
} 