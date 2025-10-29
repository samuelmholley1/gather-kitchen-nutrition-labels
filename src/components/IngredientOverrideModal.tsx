'use client'

import { useState, useEffect } from 'react'
import HistoryViewer from './HistoryViewer'

interface NutrientData {
  calories: number
  totalFat: number
  saturatedFat?: number
  transFat?: number
  cholesterol?: number
  sodium: number
  totalCarbohydrate: number
  dietaryFiber?: number
  sugars?: number
  protein: number
  vitaminA?: number
  vitaminC?: number
  calcium?: number
  iron?: number
}

interface IngredientOverrideModalProps {
  isOpen: boolean
  onClose: () => void
  ingredientId?: string
  ingredientName: string
  originalNutrients: NutrientData
  onSave: (customNutrients: NutrientData, reason?: string) => Promise<void>
  isLoading?: boolean
}

const NUTRIENT_FIELDS = [
  { key: 'calories', label: 'Calories', unit: 'kcal', required: true },
  { key: 'totalFat', label: 'Total Fat', unit: 'g', required: true },
  { key: 'saturatedFat', label: 'Saturated Fat', unit: 'g', required: false },
  { key: 'transFat', label: 'Trans Fat', unit: 'g', required: false },
  { key: 'cholesterol', label: 'Cholesterol', unit: 'mg', required: false },
  { key: 'sodium', label: 'Sodium', unit: 'mg', required: true },
  { key: 'totalCarbohydrate', label: 'Total Carbohydrate', unit: 'g', required: true },
  { key: 'dietaryFiber', label: 'Dietary Fiber', unit: 'g', required: false },
  { key: 'sugars', label: 'Sugars', unit: 'g', required: false },
  { key: 'protein', label: 'Protein', unit: 'g', required: true },
  { key: 'vitaminA', label: 'Vitamin A', unit: 'IU', required: false },
  { key: 'vitaminC', label: 'Vitamin C', unit: 'mg', required: false },
  { key: 'calcium', label: 'Calcium', unit: 'mg', required: false },
  { key: 'iron', label: 'Iron', unit: 'mg', required: false }
] as const

export default function IngredientOverrideModal({
  isOpen,
  onClose,
  ingredientId,
  ingredientName,
  originalNutrients,
  onSave,
  isLoading = false
}: IngredientOverrideModalProps) {
  const [customNutrients, setCustomNutrients] = useState<NutrientData>(originalNutrients)
  const [overrideReason, setOverrideReason] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showHistory, setShowHistory] = useState(false)

  // Reset form when modal opens with new ingredient
  useEffect(() => {
    if (isOpen) {
      setCustomNutrients(originalNutrients)
      setOverrideReason('')
      setErrors({})
    }
  }, [isOpen, originalNutrients])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Check required fields
    NUTRIENT_FIELDS.filter(field => field.required).forEach(field => {
      const value = customNutrients[field.key as keyof NutrientData]
      if (value === undefined || value === null || isNaN(value) || value < 0) {
        newErrors[field.key] = `${field.label} must be a valid non-negative number`
      }
    })

    // Check for reasonable values
    if (customNutrients.calories < 0 || customNutrients.calories > 10000) {
      newErrors.calories = 'Calories must be between 0 and 10,000'
    }

    if (customNutrients.protein < 0 || customNutrients.protein > 1000) {
      newErrors.protein = 'Protein must be between 0 and 1,000g'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNutrientChange = (key: keyof NutrientData, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value)
    setCustomNutrients(prev => ({
      ...prev,
      [key]: numValue
    }))

    // Clear error for this field
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[key]
        return newErrors
      })
    }
  }

  const handleSave = async () => {
    if (!validateForm()) return

    try {
      await onSave(customNutrients, overrideReason.trim() || undefined)
      onClose()
    } catch (error) {
      console.error('Failed to save ingredient override:', error)
      // Error handling would be shown in a toast or similar
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Override Nutrition Data
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {ingredientName}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {ingredientId && (
              <button
                onClick={() => setShowHistory(true)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-md hover:bg-gray-100"
                title="View change history"
                disabled={isLoading}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isLoading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Original vs Custom Comparison */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-blue-900">
                  Nutrition Override
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  You're overriding the default nutrition data. This will be saved as a custom ingredient
                  for future use.
                </p>
              </div>
            </div>
          </div>

          {/* Nutrient Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {NUTRIENT_FIELDS.map(field => {
              const key = field.key as keyof NutrientData
              const originalValue = originalNutrients[key]
              const customValue = customNutrients[key]
              const hasChanged = customValue !== originalValue

              return (
                <div key={field.key} className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                    <span className="text-gray-500 text-xs ml-1">({field.unit})</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={customValue || ''}
                    onChange={(e) => handleNutrientChange(key, e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      hasChanged
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-300'
                    } ${errors[field.key] ? 'border-red-300' : ''}`}
                    placeholder="0"
                  />
                  {originalValue !== undefined && (
                    <p className="text-xs text-gray-500">
                      Original: {originalValue}{field.unit}
                      {hasChanged && (
                        <span className="text-blue-600 font-medium ml-1">
                          (changed)
                        </span>
                      )}
                    </p>
                  )}
                  {errors[field.key] && (
                    <p className="text-xs text-red-600">{errors[field.key]}</p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Override Reason */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Reason for Override (Optional)
            </label>
            <textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="e.g., Lab testing shows different values, brand-specific nutrition, cooking method affects nutrients..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
            />
            <p className="text-xs text-gray-500">
              This helps track why the override was created and can be referenced later.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || Object.keys(errors).length > 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Save Override</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* History Viewer */}
      {ingredientId && (
        <HistoryViewer
          ingredientId={ingredientId}
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  )
}