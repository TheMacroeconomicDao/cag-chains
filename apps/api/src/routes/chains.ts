import { OpenAPIHono } from '@hono/zod-openapi'

export const chainsRouter = new OpenAPIHono()

// TODO: Implement chain routes
chainsRouter.get('/', (c) => {
  return c.json({ 
    message: 'Chains API coming soon',
    endpoints: [],
    status: 'development'
  })
}) 