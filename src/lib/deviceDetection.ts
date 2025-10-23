/**
 * Mobile Detection Utility
 * Detects if user is on mobile device (phone)
 * Tablets are considered "desktop-capable" for our purposes
 */

export function isMobilePhone(): boolean {
  if (typeof window === 'undefined') return false
  
  // Check user agent for mobile indicators
  const userAgent = navigator.userAgent.toLowerCase()
  const isMobile = /iphone|ipod|android.*mobile|windows phone|blackberry|opera mini|iemobile/.test(userAgent)
  
  // Also check screen width (phones typically < 768px)
  const isSmallScreen = window.innerWidth < 768
  
  return isMobile && isSmallScreen
}

export function isTabletOrDesktop(): boolean {
  return !isMobilePhone()
}

/**
 * Get device type for display purposes
 */
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop'
  
  const width = window.innerWidth
  const userAgent = navigator.userAgent.toLowerCase()
  
  // Check for tablet
  const isTablet = /ipad|android(?!.*mobile)|tablet/.test(userAgent) || (width >= 768 && width <= 1024)
  
  if (isMobilePhone()) return 'mobile'
  if (isTablet) return 'tablet'
  return 'desktop'
}
