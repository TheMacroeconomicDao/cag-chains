import { nanoid } from 'nanoid'
import CryptoJS from 'crypto-js'
import type { NodeType, CAGNode, CAGMessage } from '../types'
import { NodeSizeConfig } from '../types'

// ==================== ID GENERATION ====================

/**
 * Generate a unique UUID for CAG nodes, chains, and tasks
 */
export function generateId(prefix?: string): string {
  const id = nanoid(16)
  return prefix ? `${prefix}_${id}` : id
}

/**
 * Generate a deterministic hash from data
 */
export function generateHash(data: string): string {
  return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex)
}

/**
 * Generate a short hash for quick lookups (first 8 chars of SHA256)
 */
export function generateShortHash(data: string): string {
  return generateHash(data).slice(0, 16)
}

// ==================== NODE UTILITIES ====================

/**
 * Get token limits and cost for a node type
 */
export function getNodeConfig(nodeType: NodeType) {
  return NodeSizeConfig[nodeType]
}

/**
 * Calculate context usage percentage
 */
export function calculateContextUsage(currentUsage: number, maxTokens: number): number {
  return Math.round((currentUsage / maxTokens) * 100) / 100
}

/**
 * Check if node needs context compression
 */
export function needsCompression(node: CAGNode): boolean {
  const usage = calculateContextUsage(node.contextWindow.currentUsage, node.contextWindow.maxTokens)
  return usage > node.contextWindow.optimizationThreshold
}

/**
 * Estimate token cost for a task based on complexity and domain
 */
export function estimateTokenCost(complexity: number, domains: string[]): number {
  const baseTokens = 1000
  const complexityMultiplier = Math.pow(1.5, complexity - 1)
  const domainMultiplier = Math.pow(1.2, domains.length - 1)
  
  return Math.round(baseTokens * complexityMultiplier * domainMultiplier)
}

// ==================== MESSAGE UTILITIES ====================

/**
 * Create a message signature (placeholder for Ed25519)
 */
export function signMessage(message: Omit<CAGMessage, 'signature'>, privateKey: string): string {
  const messageString = JSON.stringify(message)
  return CryptoJS.HmacSHA256(messageString, privateKey).toString()
}

/**
 * Verify message signature
 */
export function verifyMessage(message: CAGMessage, publicKey: string): boolean {
  const { signature, ...messageWithoutSig } = message
  const expectedSignature = signMessage(messageWithoutSig, publicKey)
  return signature === expectedSignature
}

/**
 * Generate a nonce for anti-replay protection
 */
export function generateNonce(): string {
  return CryptoJS.lib.WordArray.random(16).toString()
}

/**
 * Check if message has expired based on TTL
 */
export function isMessageExpired(message: CAGMessage): boolean {
  const now = Date.now()
  const messageAge = now - message.timestamp
  return messageAge > (message.ttl * 1000)
}

// ==================== COMPRESSION UTILITIES ====================

/**
 * Simple text compression using base64 encoding
 * In production, this would use zstd or gzip
 */
export function compressData(data: string): Uint8Array {
  // Simple implementation using btoa/atob for compression simulation
  // In production, use actual compression libraries like pako or zstd
  const compressed = btoa(data)
  return new TextEncoder().encode(compressed)
}

/**
 * Decompress data
 */
export function decompressData(data: Uint8Array): string {
  const compressed = new TextDecoder().decode(data)
  return atob(compressed)
}

/**
 * Calculate compression ratio
 */
export function calculateCompressionRatio(original: string, compressed: Uint8Array): number {
  const originalSize = new TextEncoder().encode(original).length
  const compressedSize = compressed.length
  return Math.round((originalSize / compressedSize) * 100) / 100
}

// ==================== PERFORMANCE ====================

/**
 * Calculate token efficiency score
 */
export function calculateTokenEfficiency(qualityScore: number, tokensUsed: number): number {
  if (tokensUsed === 0) return 0
  return Math.round((qualityScore / tokensUsed) * 10000) / 10000
}

/**
 * Calculate token cost for a task based on complexity and domain - alias for estimateTokenCost
 */
export function calculateTokenCost(complexity: number, domains: string[]): number {
  return estimateTokenCost(complexity, domains)
}

/**
 * Calculate weighted average
 */
export function calculateWeightedAverage(values: number[], weights: number[]): number {
  if (values.length !== weights.length) {
    throw new Error('Values and weights arrays must have the same length')
  }
  
  const weightedSum = values.reduce((sum, value, index) => sum + (value * weights[index]), 0)
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  
  return totalWeight === 0 ? 0 : weightedSum / totalWeight
}

// ==================== TIME UTILITIES ====================

/**
 * Get current timestamp in milliseconds
 */
export function getCurrentTimestamp(): number {
  return Date.now()
}

/**
 * Format timestamp for logging
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString()
}

/**
 * Calculate duration between timestamps
 */
export function calculateDuration(startTime: number, endTime: number): number {
  return Math.max(0, endTime - startTime)
}

// ==================== VALIDATION UTILITIES ====================

/**
 * Check if a string is a valid UUID
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

/**
 * Check if a string is a valid SHA256 hash
 */
export function isValidHash(str: string): boolean {
  const hashRegex = /^[a-f0-9]{64}$/i
  return hashRegex.test(str)
}

/**
 * Sanitize domain string
 */
export function sanitizeDomain(domain: string): string {
  return domain.toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// ==================== NETWORK UTILITIES ====================

/**
 * Calculate network distance between two hash IDs (XOR distance for Kademlia)
 */
export function calculateNetworkDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    throw new Error('Hashes must be the same length')
  }
  
  let distance = 0
  for (let i = 0; i < hash1.length; i += 2) {
    const byte1 = parseInt(hash1.substr(i, 2), 16)
    const byte2 = parseInt(hash2.substr(i, 2), 16)
    distance += (byte1 ^ byte2)
  }
  
  return distance
}

/**
 * Find closest nodes by hash distance
 */
export function findClosestNodes<T extends { headerHash: string }>(
  targetHash: string,
  nodes: T[],
  k: number = 20
): T[] {
  return nodes
    .map(node => ({
      node,
      distance: calculateNetworkDistance(targetHash, node.headerHash)
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, k)
    .map(item => item.node)
} 