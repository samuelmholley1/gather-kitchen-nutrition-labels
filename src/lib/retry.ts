/**
 * Retry utility for handling transient network errors
 * Uses exponential backoff with jitter
 */

interface RetryOptions {
  maxRetries?: number
  initialDelayMs?: number
  maxDelayMs?: number
  shouldRetry?: (error: any) => boolean
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  shouldRetry: (error: any) => {
    // Retry on network errors, timeouts, and 429 (rate limit)
    if (error.name === 'AbortError') return false // Don't retry intentional aborts
    if (error.name === 'TypeError' && error.message.includes('fetch')) return true // Network error
    if (error.status === 429) return true // Rate limit
    if (error.status >= 500 && error.status < 600) return true // Server error
    return false
  }
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateDelay(attempt: number, initialDelayMs: number, maxDelayMs: number): number {
  const exponentialDelay = initialDelayMs * Math.pow(2, attempt)
  const jitter = Math.random() * 0.3 * exponentialDelay // 30% jitter
  return Math.min(exponentialDelay + jitter, maxDelayMs)
}

/**
 * Retry an async function with exponential backoff
 * 
 * @example
 * ```typescript
 * const data = await withRetry(
 *   () => fetch('https://api.example.com/data'),
 *   { maxRetries: 3, initialDelayMs: 1000 }
 * )
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: any
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // Don't retry if we've exhausted attempts or error is not retryable
      if (attempt === opts.maxRetries || !opts.shouldRetry(error)) {
        throw error
      }
      
      // Calculate delay and log retry attempt
      const delay = calculateDelay(attempt, opts.initialDelayMs, opts.maxDelayMs)
      console.log(
        `[Retry] Attempt ${attempt + 1}/${opts.maxRetries} failed. ` +
        `Retrying in ${Math.round(delay)}ms...`,
        error
      )
      
      await sleep(delay)
    }
  }
  
  throw lastError
}

/**
 * Retry a fetch request with exponential backoff
 * Handles rate limits (429) and server errors (5xx)
 * 
 * @example
 * ```typescript
 * const response = await retryFetch('https://api.example.com/data', {
 *   method: 'POST',
 *   body: JSON.stringify({ foo: 'bar' })
 * })
 * ```
 */
export async function retryFetch(
  url: string,
  init?: RequestInit,
  options: RetryOptions = {}
): Promise<Response> {
  return withRetry(
    async () => {
      const response = await fetch(url, init)
      
      // Check for rate limit or server error
      if (response.status === 429) {
        // Extract Retry-After header if available
        const retryAfter = response.headers.get('Retry-After')
        const retryAfterMs = retryAfter ? parseInt(retryAfter) * 1000 : 0
        
        const error: any = new Error('Rate limit exceeded')
        error.status = 429
        error.retryAfter = retryAfterMs
        throw error
      }
      
      if (response.status >= 500 && response.status < 600) {
        const error: any = new Error(`Server error: ${response.status}`)
        error.status = response.status
        throw error
      }
      
      return response
    },
    {
      ...options,
      shouldRetry: (error) => {
        // Custom retry logic for HTTP responses
        if (error.status === 429) return true // Rate limit
        if (error.status >= 500 && error.status < 600) return true // Server error
        if (options.shouldRetry) return options.shouldRetry(error)
        return DEFAULT_OPTIONS.shouldRetry(error)
      }
    }
  )
}
