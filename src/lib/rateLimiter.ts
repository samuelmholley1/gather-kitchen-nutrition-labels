/**
 * Simple rate limiter for Airtable API
 * Airtable free tier: 5 requests/second per base
 * Airtable paid tier: 10 requests/second per base
 */

interface QueuedRequest {
  fn: () => Promise<any>
  resolve: (value: any) => void
  reject: (error: any) => void
}

class RateLimiter {
  private queue: QueuedRequest[] = []
  private requestsThisSecond = 0
  private lastResetTime = Date.now()
  private readonly maxRequestsPerSecond: number
  private processing = false

  constructor(maxRequestsPerSecond: number = 5) {
    this.maxRequestsPerSecond = maxRequestsPerSecond
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject })
      this.processQueue()
    })
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true

    while (this.queue.length > 0) {
      const now = Date.now()
      const timeSinceReset = now - this.lastResetTime

      // Reset counter every second
      if (timeSinceReset >= 1000) {
        this.requestsThisSecond = 0
        this.lastResetTime = now
      }

      // Wait if we've hit the rate limit
      if (this.requestsThisSecond >= this.maxRequestsPerSecond) {
        const waitTime = 1000 - timeSinceReset
        await new Promise(resolve => setTimeout(resolve, waitTime))
        this.requestsThisSecond = 0
        this.lastResetTime = Date.now()
      }

      // Process next request
      const request = this.queue.shift()
      if (!request) break

      this.requestsThisSecond++

      try {
        const result = await request.fn()
        request.resolve(result)
      } catch (error) {
        // Check if it's a rate limit error from Airtable
        if (error instanceof Error && error.message.includes('RATE_LIMIT')) {
          console.warn('⚠️ Airtable rate limit hit. Waiting 30 seconds before retry...')
          await new Promise(resolve => setTimeout(resolve, 30000))
          // Re-queue the request
          this.queue.unshift(request)
          this.requestsThisSecond = 0
        } else {
          request.reject(error)
        }
      }
    }

    this.processing = false
  }
}

// Export singleton instance
export const airtableRateLimiter = new RateLimiter(5) // Conservative 5 req/sec

/**
 * Wrap an Airtable API call with rate limiting
 */
export async function withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  return airtableRateLimiter.execute(fn)
}
