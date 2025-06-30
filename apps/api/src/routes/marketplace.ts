import { OpenAPIHono } from '@hono/zod-openapi'

export const marketplaceRouter = new OpenAPIHono()

// TODO: Implement marketplace routes
marketplaceRouter.get('/', (c) => {
  return c.json({ 
    message: 'Marketplace API coming soon',
    endpoints: [],
    status: 'development'
  })
}) 