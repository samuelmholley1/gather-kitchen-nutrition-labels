'use client'

import { useState, useRef } from 'react'

interface PhotoAnalysisResult {
  ok: boolean
  ocrText: string
  suggestedQuery: string
  extractedData: {
    name: string
    servingSize: string
    nutrients: Record<string, number>
  }
  meta: {
    timestamp: string
    fileName: string
    ocrProvider: string
  }
  error?: string
}

interface Props {
  onAnalyzed: (result: PhotoAnalysisResult) => void
  disabled?: boolean
  className?: string
}

export default function PhotoUploadButton({ onAnalyzed, disabled = false, className = '' }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB')
      return
    }

    setError(null)
    setLoading(true)

    try {
      // Create FormData for multipart upload (Google Vision API)
      const formData = new FormData()
      formData.append('image', file)
      formData.append('fileName', file.name)
      
      const response = await fetch('/api/ingredients/analyze-photo', {
        method: 'POST',
        body: formData  // Send as FormData instead of JSON
      })

      const result = await response.json()
      
      if (!response.ok || !result.ok) {
        throw new Error(result.error || `HTTP ${response.status}: Failed to analyze image`)
      }

      console.log('[PhotoUpload] Analysis successful:', {
        fileName: file.name,
        ocrText: result.ocrText?.substring(0, 100) + '...',
        suggestedQuery: result.suggestedQuery,
        provider: result.meta?.ocrProvider
      })

      onAnalyzed(result)
      
    } catch (err: any) {
      console.error('[PhotoUpload] Analysis failed:', err)
      setError(err?.message || 'Failed to analyze photo')
    } finally {
      setLoading(false)
      // Clear the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleClick = () => {
    if (disabled || loading) return
    fileInputRef.current?.click()
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <button
        onClick={handleClick}
        disabled={disabled || loading}
        className={`
          px-4 py-2 rounded-lg font-medium transition-colors
          ${loading 
            ? 'bg-gray-400 text-white cursor-not-allowed' 
            : disabled
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer'
          }
        `}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Analyzing...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Upload Photo
          </div>
        )}
      </button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || loading}
      />
      
      {error && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-2 py-1">
          {error}
        </div>
      )}
    </div>
  )
}

// Utility function to convert File to base64 (deprecated - now using FormData)
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = () => {
      const result = reader.result as string
      // Remove the data URL prefix (data:image/jpeg;base64,)
      const base64 = result.split(',')[1] || ''
      resolve(base64)
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsDataURL(file)
  })
}