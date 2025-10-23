'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { isMobilePhone } from '@/lib/deviceDetection'

interface MobileRestrictProps {
  children: React.ReactNode
  allowViewOnly?: boolean
}

/**
 * Wraps pages that require desktop/tablet
 * Shows message to mobile users to switch devices
 */
export default function MobileRestrict({ children, allowViewOnly = false }: MobileRestrictProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsMobile(isMobilePhone())

    // Re-check on resize
    const handleResize = () => {
      setIsMobile(isMobilePhone())
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Prevent flash on server-side render
  if (!mounted) {
    return null
  }

  if (isMobile && !allowViewOnly) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">📱➡️💻</div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Desktop or Tablet Required
          </h1>
          
          <p className="text-gray-700 mb-6 leading-relaxed">
            The <strong>Recipe Importer</strong> requires a larger screen for the best experience. 
            Please open this page on a <strong>tablet or desktop computer</strong>.
          </p>

          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-emerald-900">
              <strong>💡 Tip:</strong> You can still view your saved recipes and nutrition labels on mobile!
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/"
              className="block w-full px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold"
            >
              Go to Home
            </Link>
            
            <Link
              href="/final-dishes"
              className="block w-full px-6 py-3 bg-white text-emerald-600 border-2 border-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors font-semibold"
            >
              View Saved Recipes
            </Link>

            <Link
              href="/sub-recipes"
              className="block w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
            >
              View Sub-Recipes
            </Link>
          </div>

          <p className="text-xs text-gray-500 mt-6">
            Current device: Mobile phone
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
