import { OpenAPIHono } from '@hono/zod-openapi'

export const tasksRouter = new OpenAPIHono()

// TODO: Implement task routes
tasksRouter.get('/', (c) => {
  return c.json({ 
    message: 'Tasks API coming soon',
    endpoints: [],
    status: 'development'
  })
}) 