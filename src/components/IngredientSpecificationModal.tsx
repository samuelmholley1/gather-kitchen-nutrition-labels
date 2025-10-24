'use client'

import { useState } from 'react'

interface IngredientSpecificationModalProps {
  ingredient: {
    quantity: number
    unit: string
    ingredient: string
    baseIngredient?: string
    specificationPrompt?: string
    specificationOptions?: string[]
  }
  onSpecify: (variety: string) => void
  onSkip: () => void
  onCancel: () => void
}

export default function IngredientSpecificationModal({
  ingredient,
  onSpecify,
  onSkip,
  onCancel
}: IngredientSpecificationModalProps) {
  const [selectedVariety, setSelectedVariety] = useState<string>('')

  const handleConfirm = () => {
    if (selectedVariety) {
      onSpecify(selectedVariety)
    } else {
      onSkip()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Specify {ingredient.baseIngredient || ingredient.unit}
          </h3>
          <p className="text-gray-600">
            You have <span className="font-semibold">{ingredient.quantity} {ingredient.unit}</span>.
            {' '}{ingredient.specificationPrompt || 'What type/size?'}
          </p>
        </div>

        <div className="space-y-2 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select variety or size:
          </label>
          {ingredient.specificationOptions?.map((variety) => (
            <button
              key={variety}
              onClick={() => setSelectedVariety(variety)}
              className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                selectedVariety === variety
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium capitalize">{variety}</span>
                {selectedVariety === variety && (
                  <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-medium"
          >
            {selectedVariety ? 'Confirm' : 'Use Default'}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>

        {!selectedVariety && (
          <p className="mt-3 text-sm text-gray-500 text-center">
            If you skip, we'll use "medium {ingredient.baseIngredient || ingredient.unit}" as default
          </p>
        )}
      </div>
    </div>
  )
}
