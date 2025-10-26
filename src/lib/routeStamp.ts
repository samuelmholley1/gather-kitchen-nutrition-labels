/**
 * Runtime route stamping for observability
 * Ensures we know exactly which code path executed
 */

export interface RouteStamp {
  routeId: string
  sha: string
  region: string
  timestamp: string
}

export function createRouteStamp(routeId: string): RouteStamp {
  return {
    routeId,
    sha: process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'dev',
    region: process.env.VERCEL_REGION || 'local',
    timestamp: new Date().toISOString(),
  }
}

export function stampHeaders(headers: Headers, stamp: RouteStamp): void {
  headers.set('X-Route', stamp.routeId)
  headers.set('X-Route-SHA', stamp.sha)
  headers.set('X-Route-Region', stamp.region)
  headers.set('X-Route-Timestamp', stamp.timestamp)
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
}

export function logStamp(operation: string, stamp: RouteStamp, data?: any): void {
  console.log(`[${operation.toUpperCase()}]`, {
    ...stamp,
    ...(data || {}),
  })
}
