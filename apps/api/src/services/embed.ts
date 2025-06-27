import OpenAI from 'openai'
import RedisService from './redis.js'

export class EmbedService {
  private static instance: EmbedService
  private openai: OpenAI
  private redis = RedisService.getInstance()
  private model = process.env.EMBED_MODEL || 'text-embedding-3-small'

  private constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }

  public static getInstance(): EmbedService {
    if (!EmbedService.instance) {
      EmbedService.instance = new EmbedService()
    }
    return EmbedService.instance
  }

  private cacheKey(text: string): string {
    const normalized = text.toLowerCase().trim().replace(/\s+/g, ' ')
    return `embedding:${this.model}:${normalized}`
  }

  public async embed(text: string): Promise<number[]> {
    const key = this.cacheKey(text)
    const cached = await this.redis.get<number[]>(key)
    if (cached) return cached

    const resp = await this.openai.embeddings.create({ model: this.model, input: text })
    const vector = resp.data[0].embedding as number[]
    await this.redis.set(key, vector, 86400)
    return vector
  }
}

export default EmbedService 