import Redis, { type Redis as RedisClient } from 'ioredis'

interface CacheEntry<T = any> {
  data: T
  timestamp: number
  ttl: number
}

interface P2PMessage {
  type: 'node_discovery' | 'task_broadcast' | 'result_share' | 'context_sync'
  from: string
  data: any
  timestamp: number
}

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

export class RedisService {
  private static instance: RedisService
  private redis: RedisClient
  private subscriber: RedisClient
  private isConnected = false

  private constructor() {
    // Main client for regular operations
    this.redis = new Redis(REDIS_URL, {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
      lazyConnect: true
    })

    // Separate connections for pub/sub
    this.subscriber = new Redis(REDIS_URL, {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
      lazyConnect: true
    })

    this.setupEventHandlers()
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService()
    }
    return RedisService.instance
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      console.log('✅ Redis connected')
      this.isConnected = true
    })

    this.redis.on('error', (error) => {
      console.error('❌ Redis error:', error)
      this.isConnected = false
    })

    this.redis.on('close', () => {
      console.log('🔌 Redis disconnected')
      this.isConnected = false
    })

    this.subscriber.on('connect', () => {
      console.log('✅ Redis subscriber connected')
    })
  }

  public async connect(): Promise<void> {
    await Promise.all([
      this.redis.connect(),
      this.subscriber.connect()
    ])
  }

  public async disconnect(): Promise<void> {
    await Promise.all([
      this.redis.disconnect(),
      this.subscriber.disconnect()
    ])
    this.isConnected = false
    console.log('✅ Redis disconnected gracefully')
  }

  public async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping()
      return result === 'PONG'
    } catch {
      return false
    }
  }

  // ==================== BASIC OPERATIONS ====================

  public async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error('Redis GET error:', error)
      return null
    }
  }

  public async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value)
      if (ttl) {
        await this.redis.setex(key, ttl, serialized)
      } else {
        await this.redis.set(key, serialized)
      }
      return true
    } catch (error) {
      console.error('Redis SET error:', error)
      return false
    }
  }

  public async del(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(key)
      return result > 0
    } catch (error) {
      console.error('Redis DEL error:', error)
      return false
    }
  }

  public async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key)
      return result > 0
    } catch (error) {
      console.error('Redis EXISTS error:', error)
      return false
    }
  }

  // ==================== ADVANCED CACHING ====================

  public async cacheWithTTL<T>(
    key: string, 
    data: T, 
    ttl: number = 3600
  ): Promise<boolean> {
    const cacheEntry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl
    }
    return this.set(key, cacheEntry, ttl)
  }

  public async getCached<T>(key: string): Promise<T | null> {
    const entry = await this.get<CacheEntry<T>>(key)
    if (!entry) return null

    // Check if entry is still valid
    const now = Date.now()
    const expiry = entry.timestamp + (entry.ttl * 1000)
    
    if (now > expiry) {
      await this.del(key)
      return null
    }

    return entry.data
  }

  public async mget<T>(keys: string[]): Promise<Record<string, T | null>> {
    try {
      const values = await this.redis.mget(...keys)
      const result: Record<string, T | null> = {}
      
      keys.forEach((key, index) => {
        const value = values[index]
        result[key] = value ? JSON.parse(value) : null
      })
      
      return result
    } catch (error) {
      console.error('Redis MGET error:', error)
      return {}
    }
  }

  // ==================== CONTEXT CACHING ====================

  public async cacheContext(nodeId: string, context: any): Promise<boolean> {
    const key = `context:${nodeId}`
    return this.cacheWithTTL(key, context, 1800) // 30 minutes
  }

  public async getContext(nodeId: string): Promise<any | null> {
    const key = `context:${nodeId}`
    return this.getCached(key)
  }

  public async cacheTaskResult(
    taskId: string, 
    result: any, 
    ttl: number = 3600
  ): Promise<boolean> {
    const key = `task_result:${taskId}`
    return this.cacheWithTTL(key, result, ttl)
  }

  public async getTaskResult(taskId: string): Promise<any | null> {
    const key = `task_result:${taskId}`
    return this.getCached(key)
  }

  // ==================== NODE REGISTRY ====================

  public async registerNode(nodeId: string, nodeData: any): Promise<boolean> {
    const key = `node:${nodeId}`
    const success = await this.cacheWithTTL(key, nodeData, 300) // 5 minutes
    
    if (success) {
      // Add to active nodes set
      await this.redis.sadd('active_nodes', nodeId)
      await this.redis.expire('active_nodes', 600) // 10 minutes
    }
    
    return success
  }

  public async getNode(nodeId: string): Promise<any | null> {
    const key = `node:${nodeId}`
    return this.getCached(key)
  }

  public async getActiveNodes(): Promise<string[]> {
    try {
      return await this.redis.smembers('active_nodes')
    } catch (error) {
      console.error('Redis SMEMBERS error:', error)
      return []
    }
  }

  public async heartbeat(nodeId: string): Promise<boolean> {
    const key = `heartbeat:${nodeId}`
    return this.set(key, Date.now(), 60) // 1 minute
  }

  public async isNodeAlive(nodeId: string): Promise<boolean> {
    const key = `heartbeat:${nodeId}`
    return this.exists(key)
  }

  // ==================== CHAIN COORDINATION ====================

  public async lockChain(chainId: string, nodeId: string): Promise<boolean> {
    const key = `chain_lock:${chainId}`
    try {
      const result = await this.redis.set(key, nodeId, 'EX', 300, 'NX') // 5 min lock
      return result === 'OK'
    } catch (error) {
      console.error('Redis LOCK error:', error)
      return false
    }
  }

  public async unlockChain(chainId: string): Promise<boolean> {
    const key = `chain_lock:${chainId}`
    return this.del(key)
  }

  public async getChainLock(chainId: string): Promise<string | null> {
    const key = `chain_lock:${chainId}`
    return this.get(key)
  }

  // ==================== P2P MESSAGING ====================

  public async publishMessage(channel: string, message: P2PMessage): Promise<boolean> {
    try {
      await this.redis.publish(channel, JSON.stringify(message))
      return true
    } catch (error) {
      console.error('Redis PUBLISH error:', error)
      return false
    }
  }

  public async subscribeToChannel(
    channel: string, 
    callback: (message: P2PMessage) => void
  ): Promise<void> {
    this.subscriber.subscribe(channel)
      
      this.subscriber.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
          const parsed = JSON.parse(message) as P2PMessage
            callback(parsed)
        } catch (error) {
          console.error('Message parsing error:', error)
        }
      }
    })
  }

  public async broadcastNodeDiscovery(nodeData: any): Promise<boolean> {
    const message: P2PMessage = {
      type: 'node_discovery',
      from: nodeData.id,
      data: nodeData,
      timestamp: Date.now()
    }
    return this.publishMessage('node_discovery', message)
  }

  public async broadcastTaskAvailable(taskData: any): Promise<boolean> {
    const message: P2PMessage = {
      type: 'task_broadcast',
      from: taskData.chainId || 'oracle',
      data: taskData,
      timestamp: Date.now()
          }
    return this.publishMessage('task_broadcast', message)
  }

  public async shareResult(taskId: string, result: any, fromNode: string): Promise<boolean> {
    const message: P2PMessage = {
      type: 'result_share',
      from: fromNode,
      data: { taskId, result },
      timestamp: Date.now()
    }
    return this.publishMessage('result_share', message)
  }

  // ==================== METRICS & MONITORING ====================

  public async incrementCounter(key: string, amount: number = 1): Promise<number> {
    try {
      return await this.redis.incrby(key, amount)
    } catch (error) {
      console.error('Redis INCRBY error:', error)
      return 0
    }
  }

  public async recordMetric(
    nodeId: string, 
    metric: string, 
    value: number
  ): Promise<boolean> {
    const key = `metrics:${nodeId}:${metric}`
    const timestamp = Date.now()
    
    try {
      // Store as sorted set with timestamp as score
      await this.redis.zadd(key, timestamp, value)
      // Keep only last 1000 entries
      await this.redis.zremrangebyrank(key, 0, -1001)
      // Set expiry
      await this.redis.expire(key, 86400) // 24 hours
      return true
    } catch (error) {
      console.error('Redis metric recording error:', error)
      return false
    }
  }

  public async getMetricHistory(
    nodeId: string, 
    metric: string, 
    limit: number = 100
  ): Promise<Array<{ value: number; timestamp: number }>> {
    const key = `metrics:${nodeId}:${metric}`
    
    try {
      const results = await this.redis.zrevrange(key, 0, limit - 1, 'WITHSCORES')
      const history: Array<{ value: number; timestamp: number }> = []
      
      for (let i = 0; i < results.length; i += 2) {
        history.push({
          value: parseFloat(results[i]),
          timestamp: parseFloat(results[i + 1])
        })
      }
      
      return history
    } catch (error) {
      console.error('Redis metric retrieval error:', error)
      return []
    }
  }

  // ==================== SEARCH & DISCOVERY ====================

  public async addToIndex(index: string, id: string, data: any): Promise<boolean> {
    const key = `index:${index}:${id}`
    return this.cacheWithTTL(key, data, 3600)
  }

  public async searchIndex(index: string, pattern: string = '*'): Promise<any[]> {
    try {
      const keys = await this.redis.keys(`index:${index}:${pattern}`)
      if (keys.length === 0) return []
      
      const values = await this.mget(keys)
      return Object.values(values).filter(v => v !== null)
    } catch (error) {
      console.error('Redis search error:', error)
      return []
    }
  }

  // ==================== CLEANUP & CONNECTION ====================

  public async flushCache(): Promise<boolean> {
    try {
      await this.redis.flushdb()
      return true
    } catch (error) {
      console.error('Redis FLUSH error:', error)
      return false
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected
  }

  public async getStats(): Promise<Record<string, any>> {
    try {
      const info = await this.redis.info()
      const memory = await this.redis.info('memory')
      
      return {
        connected: this.isConnected,
        info: info,
        memory: memory
      }
    } catch (error) {
      console.error('Redis stats error:', error)
      return { connected: false }
    }
  }
}

// Redis key patterns for CAG-Chain
export const RedisKeys = {
  // Node caching
  node: (nodeId: string) => `cag:node:${nodeId}`,
  nodesByDomain: (domain: string) => `cag:nodes:domain:${domain}`,
  nodeMetrics: (nodeId: string) => `cag:metrics:${nodeId}`,
  
  // Chain caching
  chain: (chainId: string) => `cag:chain:${chainId}`,
  activeChains: () => 'cag:chains:active',
  
  // Message queues
  messageQueue: (nodeId: string) => `cag:queue:${nodeId}`,
  broadcastQueue: () => 'cag:queue:broadcast',
  
  // Pub/Sub channels
  nodeUpdates: () => 'cag:updates:nodes',
  chainUpdates: () => 'cag:updates:chains',
  networkEvents: () => 'cag:events:network',
  
  // Rate limiting
  rateLimit: (key: string) => `cag:rate:${key}`,
  
  // Temporary data
  session: (sessionId: string) => `cag:session:${sessionId}`,
  task: (taskId: string) => `cag:task:${taskId}`
} as const

export default RedisService 