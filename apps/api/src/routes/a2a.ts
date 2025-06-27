import { Hono } from 'hono'
// Временно отключаем импорты A2A до исправления путей
// import { A2AService } from '../../../packages/core/src/a2a/A2AService.js'
// import { CAGNode, ChainNode } from '../../../packages/core/src/node/index.js'

export const a2aRouter = new Hono()

// const a2aService = A2AService.getInstance()

// ==================== MOCK A2A ROUTES ====================

// GET /api/v1/a2a/agents - List all registered A2A agents
a2aRouter.get('/agents', async (c) => {
  try {
    const domain = c.req.query('domain')
    
    // Mock implementation for now
    const agents = [
      {
        agentId: 'mock_agent_1',
        card: {
          schema_version: '1.0.0',
          name: 'Mock CAG Agent',
          description: 'Mock agent for testing',
          versions: [{
            version: '1.0.0',
            endpoint: '/api/a2a/mock',
            supports_streaming: true,
            auth: { type: 'none' },
            skills: [{
              id: 'general',
              name: 'General Processing',
              description: 'General task processing',
              input_modes: ['text'],
              output_modes: ['text']
            }]
          }]
        }
      }
    ]
    
    return c.json({
      agents,
      total: agents.length
    })
  } catch (error) {
    console.error('List A2A agents error:', error)
    return c.json({ error: 'Failed to list A2A agents' }, 500)
  }
})

// GET /api/v1/a2a/agents/:agentId - Get agent card
a2aRouter.get('/agents/:agentId', async (c) => {
  try {
    const agentId = c.req.param('agentId')
    
    // Mock implementation
    if (agentId === 'mock_agent_1') {
      const agentCard = {
        schema_version: '1.0.0',
        name: 'Mock CAG Agent',
        description: 'Mock agent for testing',
        versions: [{
          version: '1.0.0',
          endpoint: '/api/a2a/mock',
          supports_streaming: true,
          auth: { type: 'none' },
          skills: [{
            id: 'general',
            name: 'General Processing',
            description: 'General task processing',
            input_modes: ['text'],
            output_modes: ['text']
          }]
        }]
      }
      return c.json(agentCard)
    }
    
    return c.json({ error: 'Agent not found' }, 404)
  } catch (error) {
    console.error('Get agent card error:', error)
    return c.json({ error: 'Failed to get agent card' }, 500)
  }
})

// POST /api/v1/a2a/agents/:agentId/tasks - Send task to agent
a2aRouter.post('/agents/:agentId/tasks', async (c) => {
  try {
    const agentId = c.req.param('agentId')
    const body = await c.req.json()
    const { message, context } = body
    
    // Mock implementation
    const task = {
      task_id: `task_${Date.now()}`,
      status: 'submitted',
      created_time: new Date().toISOString(),
      updated_time: new Date().toISOString(),
      messages: [{
        role: 'user',
        parts: [{
          type: 'text',
          text: message
        }]
      }],
      metadata: { agentId, context }
    }
    
    return c.json(task, 201)
  } catch (error) {
    console.error('Send A2A task error:', error)
    return c.json({ 
      error: 'Failed to send task',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// GET /api/v1/a2a/tasks/:taskId - Get task status
a2aRouter.get('/tasks/:taskId', async (c) => {
  try {
    const taskId = c.req.param('taskId')
    
    // Mock implementation
    const task = {
      task_id: taskId,
      status: 'completed',
      created_time: new Date().toISOString(),
      updated_time: new Date().toISOString(),
      messages: [{
        role: 'user',
        parts: [{
          type: 'text',
          text: 'Mock task message'
        }]
      }, {
        role: 'agent',
        parts: [{
          type: 'text',
          text: 'Mock agent response'
        }]
      }]
    }
    
    return c.json(task)
  } catch (error) {
    console.error('Get A2A task error:', error)
    return c.json({ error: 'Failed to get task' }, 500)
  }
})

// DELETE /api/v1/a2a/tasks/:taskId - Cancel task
a2aRouter.delete('/tasks/:taskId', async (c) => {
  try {
    const taskId = c.req.param('taskId')
    
    // Mock implementation
    return c.json({
      message: 'Task canceled successfully',
      taskId
    })
  } catch (error) {
    console.error('Cancel A2A task error:', error)
    return c.json({ error: 'Failed to cancel task' }, 500)
  }
})

// POST /api/v1/a2a/register/cag-node - Register CAG Node as A2A agent
a2aRouter.post('/register/cag-node', async (c) => {
  try {
    const body = await c.req.json()
    const { nodeId, endpoint } = body
    
    // Mock implementation
    const agentId = `cag_${nodeId}`
    const card = {
      schema_version: '1.0.0',
      name: `CAG Node - ${nodeId}`,
      description: `CAG Node registered from ${nodeId}`,
      versions: [{
        version: '1.0.0',
        endpoint,
        supports_streaming: true,
        auth: { type: 'none' },
        skills: [{
          id: 'general',
          name: 'General Processing',
          description: 'General task processing',
          input_modes: ['text'],
          output_modes: ['text']
        }]
      }]
    }
    
    return c.json({
      agentId,
      message: 'CAG Node registered as A2A agent successfully',
      card
    }, 201)
  } catch (error) {
    console.error('Register CAG Node as A2A agent error:', error)
    return c.json({ 
      error: 'Failed to register CAG Node',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// POST /api/v1/a2a/discover - Discover agents by domain
a2aRouter.post('/discover', async (c) => {
  try {
    const body = await c.req.json()
    const { domain, capability } = body
    
    // Mock implementation
    const agents = [{
      schema_version: '1.0.0',
      name: `${domain} Specialist Agent`,
      description: `Mock agent specialized in ${domain}`,
      versions: [{
        version: '1.0.0',
        endpoint: `/api/a2a/${domain}`,
        supports_streaming: true,
        auth: { type: 'none' },
        skills: [{
          id: domain.toLowerCase(),
          name: `${domain} Processing`,
          description: `Specialized ${domain} task processing`,
          input_modes: ['text'],
          output_modes: ['text'],
          tags: [domain.toLowerCase()]
        }]
      }]
    }]
    
    return c.json({
      agents,
      query: { domain, capability }
    })
  } catch (error) {
    console.error('Discover A2A agents error:', error)
    return c.json({ error: 'Failed to discover agents' }, 500)
  }
}) 