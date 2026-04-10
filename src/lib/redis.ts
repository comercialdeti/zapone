import { Redis } from 'ioredis'

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

// Durante o build do Next.js, não criar conexão Redis
const isBuild = process.env.NEXT_PHASE === 'phase-production-build'

function createRedis(): Redis {
  if (isBuild) {
    // Retorna um proxy vazio durante o build
    return new Proxy({} as Redis, {
      get: () => async () => null,
    })
  }
  return new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  })
}

export const redis = globalForRedis.redis ?? createRedis()

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis

export default redis
