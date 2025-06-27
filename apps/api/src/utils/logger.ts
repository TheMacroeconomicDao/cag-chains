import pino from 'pino'

const LOG_LEVEL = process.env.LOG_LEVEL || 'info'
const NODE_ENV = process.env.NODE_ENV || 'development'

// Configure logger based on environment
export const logger = pino({
  level: LOG_LEVEL,
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() }
    }
  },
  transport: NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss'
    }
  } : undefined,
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: req.headers,
      remoteAddress: req.remoteAddress,
      remotePort: req.remotePort
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      headers: res.headers
    }),
    err: pino.stdSerializers.err
  }
})

// Create child loggers for different components
export const createComponentLogger = (component: string) => {
  return logger.child({ component })
}

// Specialized loggers
export const nodeLogger = createComponentLogger('CAG-Node')
export const chainLogger = createComponentLogger('CAG-Chain')
export const oracleLogger = createComponentLogger('Oracle')
export const p2pLogger = createComponentLogger('P2P')
export const apiLogger = createComponentLogger('API')
export const dbLogger = createComponentLogger('Database')
export const redisLogger = createComponentLogger('Redis') 