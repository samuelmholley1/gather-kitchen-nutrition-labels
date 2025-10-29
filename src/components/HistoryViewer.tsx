'use client'

import { useState, useEffect } from 'react'
import { OverridesHistoryRecord } from '@/lib/userIngredients'

interface HistoryViewerProps {
  ingredientId: string
  isOpen: boolean
  onClose: () => void
}

interface HistoryRecordWithParsed extends OverridesHistoryRecord {
  oldNutrients?: Record<string, number>
  newNutrients?: Record<string, number>
}

export default function HistoryViewer({ ingredientId, isOpen, onClose }: HistoryViewerProps) {
  const [history, setHistory] = useState<HistoryRecordWithParsed[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && ingredientId) {
      fetchHistory()
    }
  }, [isOpen, ingredientId])

  const fetchHistory = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/user-ingredients/${ingredientId}/history`)
      const result = await response.json()

      if (result.success) {
        // Parse the JSON nutrients for display
        const parsedHistory = result.data.map((record: OverridesHistoryRecord) => ({
          ...record,
          oldNutrients: record.oldNutrientsJSON ? JSON.parse(record.oldNutrientsJSON) : undefined,
          newNutrients: record.newNutrientsJSON ? JSON.parse(record.newNutrientsJSON) : undefined
        }))
        setHistory(parsedHistory)
      } else {
        setError(result.error || 'Failed to fetch history')
      }
    } catch (err) {
      setError('Failed to fetch history')
      console.error('Error fetching history:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatNutrients = (nutrients: Record<string, number> | undefined) => {
    if (!nutrients) return 'N/A'
    return Object.entries(nutrients)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ')
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'Created': return 'text-green-600 bg-green-100'
      case 'Updated': return 'text-blue-600 bg-blue-100'
      case 'Deleted': return 'text-red-600 bg-red-100'
      case 'Restored': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Ingredient Change History</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading history...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {!loading && !error && history.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No history records found for this ingredient.
            </div>
          )}

          {!loading && !error && history.length > 0 && (
            <div className="space-y-4">
              {history.map((record) => (
                <div key={record.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(record.action)}`}>
                        {record.action}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDate(record.timestamp)}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      by {record.changedBy}
                    </span>
                  </div>

                  {record.reason && (
                    <p className="text-sm text-gray-700 mb-3 italic">
                      "{record.reason}"
                    </p>
                  )}

                  {record.changedFields.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">Changed Fields:</p>
                      <div className="flex flex-wrap gap-1">
                        {record.changedFields.map((field) => (
                          <span
                            key={field}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {(record.oldNutrients || record.newNutrients) && (
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Nutrition Changes:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {record.oldNutrients && (
                          <div>
                            <p className="font-medium text-red-600 mb-1">Before:</p>
                            <p className="text-gray-600">{formatNutrients(record.oldNutrients)}</p>
                          </div>
                        )}
                        {record.newNutrients && (
                          <div>
                            <p className="font-medium text-green-600 mb-1">After:</p>
                            <p className="text-gray-600">{formatNutrients(record.newNutrients)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}