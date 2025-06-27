import { QdrantClient, type PointStruct } from '@qdrant/js-client-rest'
import { type Embeddings } from 'openai/resources/embeddings/index.mjs'

interface VectorConfig {
  url?: string
  apiKey?: string
  collectionName?: string
  vectorSize?: number
  distance?: 'Cosine' | 'Euclid' | 'Dot'
}

export class VectorService {
  private static instance: VectorService
  private client: QdrantClient
  private collection: string
  private vectorSize: number
  private distance: 'Cosine' | 'Euclid' | 'Dot'

  private constructor(config: VectorConfig) {
    const url = config.url || process.env.QDRANT_URL || 'http://localhost:6333'
    const apiKey = config.apiKey || process.env.QDRANT_API_KEY

    this.client = new QdrantClient({ url, apiKey })
    this.collection = config.collectionName || 'blocks'
    this.vectorSize = config.vectorSize || 1536 // OpenAI text-embedding-3-small
    this.distance = config.distance || 'Cosine'
  }

  public static getInstance(config: VectorConfig = {}): VectorService {
    if (!VectorService.instance) {
      VectorService.instance = new VectorService(config)
    }
    return VectorService.instance
  }

  // Ensure collection exists
  public async initCollection(): Promise<void> {
    const collections = await this.client.getCollections()
    const exists = collections.collections?.some(c => c.name === this.collection)
    if (!exists) {
      await this.client.createCollection(this.collection, {
        vectors: {
          size: this.vectorSize,
          distance: this.distance
        }
      })
      console.log(`🆕 Qdrant collection created: ${this.collection}`)
    }
  }

  public async upsertPoint(
    id: string | number,
    vector: number[],
    payload: Record<string, any>
  ): Promise<void> {
    const point: PointStruct = { id, vector, payload }
    await this.client.upsert(this.collection, { points: [point] })
  }

  public async search(
    vector: number[],
    top: number = 10,
    filter?: Record<string, any>
  ): Promise<Array<{ id: string; score: number; payload?: any }>> {
    const searchResult = await this.client.search(this.collection, {
      vector,
      limit: top,
      filter
    })
    return searchResult.map(r => ({ id: String(r.id), score: r.score, payload: r.payload }))
  }
}

export default VectorService 