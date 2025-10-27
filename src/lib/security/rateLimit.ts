/**
 * Simple in-memory rate limiter for report issue API.
 * Enforces 5 reports/min per IP + recipeId combination.
 * 
 * TODO: Replace with Redis for distributed rate limiting across multiple instances.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5;

/**
 * Check if a request is rate limited.
 * @param ip - Client IP address
 * @param recipeId - Recipe ID
 * @returns true if rate limited, false if allowed
 */
export function isRateLimited(ip: string, recipeId: string): boolean {
  const key = `${ip}:${recipeId}`;
  const now = Date.now();

  // Get or create entry
  let entry = rateLimitMap.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    rateLimitMap.set(key, entry);
  }

  // Remove old timestamps outside the window
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < WINDOW_MS);

  // Check if limit exceeded
  if (entry.timestamps.length >= MAX_REQUESTS) {
    return true;
  }

  // Add current timestamp
  entry.timestamps.push(now);

  // Clean up old entries (map entries older than 2 windows)
  if (Math.random() < 0.01) {
    // Cleanup on 1% of requests
    cleanupOldEntries();
  }

  return false;
}

/**
 * Get remaining quota for a key.
 */
export function getRemainingQuota(ip: string, recipeId: string): number {
  const key = `${ip}:${recipeId}`;
  const entry = rateLimitMap.get(key);

  if (!entry) {
    return MAX_REQUESTS;
  }

  const now = Date.now();
  const validTimestamps = entry.timestamps.filter((ts) => now - ts < WINDOW_MS);

  return Math.max(0, MAX_REQUESTS - validTimestamps.length);
}

/**
 * Get reset time for a key.
 */
export function getResetTime(ip: string, recipeId: string): number {
  const key = `${ip}:${recipeId}`;
  const entry = rateLimitMap.get(key);

  if (!entry || entry.timestamps.length === 0) {
    return 0;
  }

  const oldestTimestamp = Math.min(...entry.timestamps);
  return oldestTimestamp + WINDOW_MS;
}

/**
 * Internal cleanup of old entries.
 */
function cleanupOldEntries(): void {
  const now = Date.now();
  const twoWindowsAgo = now - WINDOW_MS * 2;

  const keysToDelete: string[] = [];
  rateLimitMap.forEach((entry, key) => {
    if (entry.timestamps.every((ts: number) => ts < twoWindowsAgo)) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach((key) => rateLimitMap.delete(key));
}

/**
 * Clear all rate limit data (for testing).
 */
export function clearRateLimitData(): void {
  rateLimitMap.clear();
}
