import { OpenAPIHono } from '@hono/zod-openapi'

export const metricsRouter = new OpenAPIHono()

// TODO: Implement metrics routes
metricsRouter.get('/', (c) => {
  return c.json({ 
    message: 'Metrics API coming soon',
    endpoints: [],
    status: 'development'
  })
}) 