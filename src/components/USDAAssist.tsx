'use client'

import { useState } from 'react'
import PhotoUploadButton from '@/components/PhotoUploadButton'

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
}

interface Props {
  onSuggestion: (query: string) => void
  disabled?: boolean
}

export default function USDAAssist({ onSuggestion, disabled = false }: Props) {
  const [lastAnalysis, setLastAnalysis] = useState<PhotoAnalysisResult | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  const handlePhotoAnalyzed = (result: PhotoAnalysisResult) => {
    setLastAnalysis(result)
    setIsExpanded(true)
    if (result.suggestedQuery) onSuggestion(result.suggestedQuery)
  }

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-emerald-900">Photo Assist</h3>
        <PhotoUploadButton onAnalyzed={handlePhotoAnalyzed} disabled={disabled} />
      </div>

      {!lastAnalysis && (
        <p className="text-sm text-emerald-700">Upload an ingredient label photo to suggest a USDA search.</p>
      )}

      {lastAnalysis && (
        <div className="space-y-2">
          <div className="text-sm text-emerald-800">
            <span className="font-medium">Suggested USDA search:</span>
            <span className="ml-2 italic">{lastAnalysis.suggestedQuery}</span>
          </div>
          <button
            onClick={() => onSuggestion(lastAnalysis.suggestedQuery)}
            className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700"
          >
            Use Suggestion
          </button>
          <details className="mt-2">
            <summary className="cursor-pointer text-sm text-emerald-800">Show extracted text</summary>
            <pre className="text-xs bg-white p-2 rounded border whitespace-pre-wrap mt-1">{lastAnalysis.ocrText}</pre>
          </details>
        </div>
      )}
    </div>
  )
}
