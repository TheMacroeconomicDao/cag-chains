import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import VectorService from '../services/vector.js'
import EmbedService from '../services/embed.js'

const vector = new OpenAPIHono()
const vs = VectorService.getInstance()
const embedder = EmbedService.getInstance()

await vs.initCollection()

const UpsertSchema = z.object({
  id: z.string(),
  text: z.string(),
  payload: z.record(z.any()).optional()
})

const SearchSchema = z.object({
  query: z.string(),
  topK: z.number().optional().default(5)
})

// POST /api/v1/vector/upsert
const upsertRoute = createRoute({
  method: 'post',
  path: '/upsert',
  summary: 'Upsert vector',
  description: 'Generate embedding and upsert into Qdrant',
  request: { body: { content: { 'application/json': { schema: UpsertSchema } } } },
  responses: {
    200: { description: 'Ok', content: { 'application/json': { schema: z.object({ status: z.string() }) } } }
  }
})

vector.openapi(upsertRoute, async (c) => {
  const { id, text, payload } = c.req.valid('json')
  const vectorEmb = await embedder.embed(text)
  await vs.upsertPoint(id, vectorEmb, { text, ...payload })
  return c.json({ status: 'upserted' })
})

// POST /api/v1/vector/search
const searchRoute = createRoute({
  method: 'post',
  path: '/search',
  summary: 'Vector search',
  description: 'Semantic search in Qdrant',
  request: { body: { content: { 'application/json': { schema: SearchSchema } } } },
  responses: {
    200: { description: 'Results', content: { 'application/json': { schema: z.object({ results: z.array(z.object({ id: z.string(), score: z.number(), payload: z.any().optional() })) }) } } }
  }
})

vector.openapi(searchRoute, async (c) => {
  const { query, topK } = c.req.valid('json')
  const vectorEmb = await embedder.embed(query)
  const results = await vs.search(vectorEmb, topK)
  return c.json({ results })
})

export { vector } 