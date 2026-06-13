import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Try to initialize Redis from environment, but don't fail immediately if missing
// so the build doesn't crash if UPSTASH_REDIS_REST_URL is missing
const redis = (() => {
  try {
    return Redis.fromEnv()
  } catch (e) {
    console.warn('[SECURITY] Upstash Redis env vars missing. Rate limiting will be disabled or fallback.')
    // Create a dummy redis client that always fails so checkRateLimit falls back to returning true
    return {
      eval: async () => { throw new Error('Redis not configured') },
      pipeline: () => { throw new Error('Redis not configured') },
      // ... minimal mock if needed, but Redis.fromEnv usually throws if not set.
    } as any
  }
})()

export const rateLimiters = {
  // Orders: 5 per table per 30 seconds
  createOrder: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '30 s'),
    prefix: 'rl_order',
  }),

  // PIN: 10 attempts per restaurant per minute
  verifyPin: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '60 s'),
    prefix: 'rl_pin',
  }),

  // Login: 5 attempts per IP per 15 minutes
  login: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    prefix: 'rl_login',
  }),

  // General API: 100 requests per IP per minute
  general: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    prefix: 'rl_general',
  }),

  // Analytics: 10 requests per user per minute
  analytics: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    prefix: 'rl_analytics',
  }),
}

export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<boolean> {
  try {
    // If Redis isn't initialized properly, this will throw
    const { success } = await limiter.limit(identifier)
    return success
  } catch (err) {
    // If Redis is down or missing env vars, allow the request but log
    console.warn('[SECURITY] Rate limit check failed - Redis down or not configured')
    return true
  }
}
