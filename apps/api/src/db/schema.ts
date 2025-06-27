import { sql } from 'drizzle-orm'
import {
  pgTable,
  text,
  integer,
  real,
  timestamp,
  boolean,
  jsonb,
  index,
  unique,
  varchar,
  primaryKey,
  uuid,
  uniqueIndex,
  type PgTableWithColumns
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ==================== CAG NODES ====================

export const cagNodes = pgTable('cag_nodes', {
  id: uuid('id').primaryKey().defaultRandom(),
  headerHash: varchar('header_hash', { length: 64 }).notNull().unique(),
  
  // Node Configuration
  nodeType: varchar('node_type', { length: 20 }).notNull(), // nano, small, medium, large, xlarge
  domain: varchar('domain', { length: 100 }).notNull(),
  subdomains: jsonb('subdomains').$type<string[]>().default([]),
  expertiseLevel: real('expertise_level').notNull().default(0.7),
  
  // Context Management
  maxTokens: integer('max_tokens').notNull(),
  currentUsage: integer('current_usage').notNull().default(0),
  optimizationThreshold: real('optimization_threshold').notNull().default(0.85),
  
  // Network State
  status: varchar('status', { length: 20 }).notNull().default('initializing'), // initializing, active, busy, error, offline
  connections: jsonb('connections').$type<Record<string, number>>().default({}),
  
  // Performance Stats
  avgResponseTime: real('avg_response_time').notNull().default(0),
  tokenEfficiency: real('token_efficiency').notNull().default(0),
  successRate: real('success_rate').notNull().default(1.0),
  totalRequestsProcessed: integer('total_requests_processed').notNull().default(0),
  
  // IPFS Integration
  knowledgeHash: varchar('knowledge_hash', { length: 100 }), // IPFS hash of expertise
  contextHashes: jsonb('context_hashes').$type<string[]>().default([]), // IPFS stored contexts
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastActiveAt: timestamp('last_active_at').defaultNow().notNull()
}, (table) => ({
  domainIdx: index('nodes_domain_idx').on(table.domain),
  statusIdx: index('nodes_status_idx').on(table.status),
  expertiseIdx: index('nodes_expertise_idx').on(table.expertiseLevel),
  headerHashIdx: uniqueIndex('nodes_header_hash_idx').on(table.headerHash)
}))

// ==================== TASKS ====================

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: varchar('type', { length: 50 }).notNull(), // analysis, synthesis, implementation, validation
  description: text('description').notNull(),
  
  // Requirements
  requiredDomains: jsonb('required_domains').$type<string[]>().notNull(),
  complexity: integer('complexity').notNull(), // 1-10
  timeConstraint: integer('time_constraint'), // milliseconds
  qualityTarget: real('quality_target'), // 0-1
  
  // Dependencies & Context
  dependencies: jsonb('dependencies').$type<string[]>().default([]), // task IDs
  context: jsonb('context').$type<Record<string, unknown>>().default({}),
  
  // Execution
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, assigned, processing, completed, failed
  assignedNodeId: uuid('assigned_node_id'),
  chainId: uuid('chain_id'),
  
  // Results
  result: text('result'),
  tokensUsed: integer('tokens_used').default(0),
  responseTime: integer('response_time').default(0),
  qualityScore: real('quality_score').default(0),
  errorMessage: text('error_message'),
  
  // IPFS Storage
  resultHash: varchar('result_hash', { length: 100 }), // IPFS hash of result
  contextHash: varchar('context_hash', { length: 100 }), // IPFS hash of context
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at')
}, (table) => ({
  statusIdx: index('tasks_status_idx').on(table.status),
  chainIdx: index('tasks_chain_idx').on(table.chainId),
  complexityIdx: index('tasks_complexity_idx').on(table.complexity),
  assignedNodeIdx: index('tasks_assigned_node_idx').on(table.assignedNodeId)
}))

// ==================== CAG CHAINS ====================

export const cagChains = pgTable('cag_chains', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Chain Configuration
  topology: varchar('topology', { length: 20 }).notNull(), // linear, tree, graph, parallel
  state: varchar('state', { length: 20 }).notNull().default('init'), // init, planning, loading, ready, processing, aggregating, complete, error
  
  // Planning Data
  taskIds: jsonb('task_ids').$type<string[]>().notNull(),
  nodeAssignments: jsonb('node_assignments').$type<Record<string, string>>().default({}), // taskId -> nodeId
  
  // Cost & Performance
  estimatedCost: integer('estimated_cost').notNull(),
  estimatedDuration: integer('estimated_duration').notNull(),
  actualCost: integer('actual_cost').default(0),
  actualDuration: integer('actual_duration').default(0),
  priority: integer('priority').notNull().default(5), // 1-10
  
  // Oracle Planning
  oracleAnalysis: jsonb('oracle_analysis').$type<Record<string, unknown>>(),
  oracleRecommendations: jsonb('oracle_recommendations').$type<string[]>().default([]),
  confidence: real('confidence').default(0.7),
  
  // IPFS Integration
  chainHistoryHash: varchar('chain_history_hash', { length: 100 }), // Immutable execution history
  sharedContexts: jsonb('shared_contexts').$type<string[]>().default([]), // IPFS hashes
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at')
}, (table) => ({
  stateIdx: index('chains_state_idx').on(table.state),
  priorityIdx: index('chains_priority_idx').on(table.priority),
  topologyIdx: index('chains_topology_idx').on(table.topology)
}))

// ==================== MARKETPLACE ====================

export const chainNodes = pgTable('chain_nodes', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Chain Node Identity
  nodeId: uuid('node_id').notNull(), // Reference to locked CAG node
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description').notNull(),
  
  // Specialization
  domain: varchar('domain', { length: 100 }).notNull(),
  subdomains: jsonb('subdomains').$type<string[]>().default([]),
  expertiseLevel: real('expertise_level').notNull(),
  
  // Marketplace Data
  price: integer('price').notNull(), // Price in cents
  licenseType: varchar('license_type', { length: 50 }).notNull(), // commercial, open-source, academic
  isPublic: boolean('is_public').notNull().default(false),
  isVerified: boolean('is_verified').notNull().default(false),
  
  // Performance Metrics
  totalSales: integer('total_sales').notNull().default(0),
  averageRating: real('average_rating').default(0),
  totalReviews: integer('total_reviews').notNull().default(0),
  successRate: real('success_rate').default(0),
  
  // IPFS Storage
  contextHash: varchar('context_hash', { length: 100 }).notNull(), // Locked context
  knowledgeHash: varchar('knowledge_hash', { length: 100 }).notNull(), // Expertise snapshot
  
  // Owner
  ownerId: varchar('owner_id', { length: 100 }).notNull(), // User/organization ID
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  domainIdx: index('chain_nodes_domain_idx').on(table.domain),
  publicIdx: index('chain_nodes_public_idx').on(table.isPublic),
  priceIdx: index('chain_nodes_price_idx').on(table.price),
  ratingIdx: index('chain_nodes_rating_idx').on(table.averageRating),
  ownerIdx: index('chain_nodes_owner_idx').on(table.ownerId)
}))

export const contextTemplates = pgTable('context_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Template Identity
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description').notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  
  // Template Data
  domain: varchar('domain', { length: 100 }).notNull(),
  subdomains: jsonb('subdomains').$type<string[]>().default([]),
  difficulty: varchar('difficulty', { length: 20 }).notNull(), // beginner, intermediate, advanced, expert
  
  // Marketplace
  price: integer('price').notNull(),
  licenseType: varchar('license_type', { length: 50 }).notNull(),
  downloads: integer('downloads').notNull().default(0),
  
  // IPFS Storage
  contextHash: varchar('context_hash', { length: 100 }).notNull(),
  metadataHash: varchar('metadata_hash', { length: 100 }),
  
  // Quality Metrics
  qualityScore: real('quality_score').default(0),
  averageRating: real('average_rating').default(0),
  totalReviews: integer('total_reviews').notNull().default(0),
  
  // Owner
  ownerId: varchar('owner_id', { length: 100 }).notNull(),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  categoryIdx: index('context_templates_category_idx').on(table.category),
  domainIdx: index('context_templates_domain_idx').on(table.domain),
  priceIdx: index('context_templates_price_idx').on(table.price),
  qualityIdx: index('context_templates_quality_idx').on(table.qualityScore)
}))

// ==================== IPFS CONTENT ====================

export const ipfsContent = pgTable('ipfs_content', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // IPFS Identity
  hash: varchar('hash', { length: 100 }).notNull().unique(),
  size: integer('size').notNull(),
  contentType: varchar('content_type', { length: 100 }).notNull(),
  
  // Metadata
  domain: varchar('domain', { length: 100 }),
  tags: jsonb('tags').$type<string[]>().default([]),
  quality: real('quality').default(0),
  popularity: integer('popularity').notNull().default(0),
  
  // Network Data
  nodeId: uuid('node_id'), // Node that created content
  pinned: boolean('pinned').notNull().default(false),
  replicationCount: integer('replication_count').notNull().default(1),
  
  // Access Patterns
  accessCount: integer('access_count').notNull().default(0),
  lastAccessedAt: timestamp('last_accessed_at'),
  
  // Relationships
  parentHash: varchar('parent_hash', { length: 100 }), // For versioning
  childHashes: jsonb('child_hashes').$type<string[]>().default([]),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  hashIdx: uniqueIndex('ipfs_content_hash_idx').on(table.hash),
  domainIdx: index('ipfs_content_domain_idx').on(table.domain),
  popularityIdx: index('ipfs_content_popularity_idx').on(table.popularity),
  nodeIdx: index('ipfs_content_node_idx').on(table.nodeId)
}))

// ==================== NETWORK METRICS ====================

export const networkMetrics = pgTable('network_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Metrics Identity
  nodeId: uuid('node_id'),
  chainId: uuid('chain_id'),
  timeWindow: varchar('time_window', { length: 20 }).notNull(), // 1m, 5m, 15m, 1h, 1d
  
  // Performance Metrics
  requestsProcessed: integer('requests_processed').notNull().default(0),
  avgResponseTime: real('avg_response_time').notNull().default(0),
  tokenEfficiency: real('token_efficiency').notNull().default(0),
  successRate: real('success_rate').notNull().default(0),
  errorRate: real('error_rate').notNull().default(0),
  
  // Resource Usage
  contextUsage: real('context_usage').notNull().default(0),
  compressionRatio: real('compression_ratio').notNull().default(0),
  cacheHitRate: real('cache_hit_rate').notNull().default(0),
  
  // Network Stats
  messagesReceived: integer('messages_received').notNull().default(0),
  messagesSent: integer('messages_sent').notNull().default(0),
  bytesTransferred: integer('bytes_transferred').notNull().default(0),
  peersConnected: integer('peers_connected').notNull().default(0),
  
  // IPFS Stats
  ipfsReads: integer('ipfs_reads').notNull().default(0),
  ipfsWrites: integer('ipfs_writes').notNull().default(0),
  ipfsStorageUsed: integer('ipfs_storage_used').notNull().default(0),
  
  // Timestamp
  timestamp: timestamp('timestamp').defaultNow().notNull()
}, (table) => ({
  nodeTimeIdx: index('metrics_node_time_idx').on(table.nodeId, table.timestamp),
  chainTimeIdx: index('metrics_chain_time_idx').on(table.chainId, table.timestamp),
  windowIdx: index('metrics_window_idx').on(table.timeWindow, table.timestamp)
}))

// ==================== RELATIONS ====================

export const cagNodesRelations = relations(cagNodes, ({ many, one }) => ({
  tasks: many(tasks),
  chainNode: one(chainNodes, {
    fields: [cagNodes.id],
    references: [chainNodes.nodeId]
  }),
  ipfsContent: many(ipfsContent),
  metrics: many(networkMetrics)
}))

export const tasksRelations = relations(tasks, ({ one }) => ({
  assignedNode: one(cagNodes, {
    fields: [tasks.assignedNodeId],
    references: [cagNodes.id]
  }),
  chain: one(cagChains, {
    fields: [tasks.chainId],
    references: [cagChains.id]
  })
}))

export const cagChainsRelations = relations(cagChains, ({ many }) => ({
  tasks: many(tasks),
  metrics: many(networkMetrics)
}))

export const chainNodesRelations = relations(chainNodes, ({ one }) => ({
  sourceNode: one(cagNodes, {
    fields: [chainNodes.nodeId],
    references: [cagNodes.id]
  })
}))

export const ipfsContentRelations = relations(ipfsContent, ({ one, many }) => ({
  node: one(cagNodes, {
    fields: [ipfsContent.nodeId],
    references: [cagNodes.id]
  }),
  parent: one(ipfsContent, {
    fields: [ipfsContent.parentHash],
    references: [ipfsContent.hash]
  }),
  children: many(ipfsContent)
}))

export const networkMetricsRelations = relations(networkMetrics, ({ one }) => ({
  node: one(cagNodes, {
    fields: [networkMetrics.nodeId],
    references: [cagNodes.id]
  }),
  chain: one(cagChains, {
    fields: [networkMetrics.chainId],
    references: [cagChains.id]
  })
}))

// ==================== TYPES ====================

export type CAGNodeInsert = typeof cagNodes.$inferInsert
export type CAGNodeSelect = typeof cagNodes.$inferSelect

export type TaskInsert = typeof tasks.$inferInsert  
export type TaskSelect = typeof tasks.$inferSelect

export type CAGChainInsert = typeof cagChains.$inferInsert
export type CAGChainSelect = typeof cagChains.$inferSelect

export type ChainNodeInsert = typeof chainNodes.$inferInsert
export type ChainNodeSelect = typeof chainNodes.$inferSelect

export type ContextTemplateInsert = typeof contextTemplates.$inferInsert
export type ContextTemplateSelect = typeof contextTemplates.$inferSelect

export type IPFSContentInsert = typeof ipfsContent.$inferInsert
export type IPFSContentSelect = typeof ipfsContent.$inferSelect

export type NetworkMetricsInsert = typeof networkMetrics.$inferInsert
export type NetworkMetricsSelect = typeof networkMetrics.$inferSelect 