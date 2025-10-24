'use client'

import { useState } from 'react'

interface IngredientNeedingSpec {
  id: string
  quantity: number
  baseIngredient: string
  specificationPrompt: string
  specificationOptions: string[]
  type: 'final' | 'sub'
  subRecipeIndex?: number
  ingredientIndex: number
}

interface BatchIngredientSpecificationModalProps {
  ingredients: IngredientNeedingSpec[]
  onConfirm: (specifications: Map<string, string>) => void
  onSkipAll: () => void
  onCancel: () => void
}

export default function BatchIngredientSpecificationModal({
  ingredients,
  onConfirm,
  onSkipAll,
  onCancel
}: BatchIngredientSpecificationModalProps) {
  const [selections, setSelections] = useState<Map<string, string>>(
    new Map(ingredients.map(ing => [
      ing.id, 
      ing.specificationOptions && ing.specificationOptions.length > 0 
        ? ing.specificationOptions[0] 
        : `medium ${ing.baseIngredient}`
    ]))
  )

  const handleSelectionChange = (id: string, variety: string) => {
    setSelections(new Map(selections.set(id, variety)))
  }

  const handleConfirm = () => {
    onConfirm(selections)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <h2 className="text-2xl font-bold text-gray-900">
            Specify Ingredient Varieties
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {ingredients.length} ingredient{ingredients.length > 1 ? 's' : ''} need clarification for accurate nutrition data
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-6">
          {ingredients.map((ing) => (
            <div key={ing.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="mb-3">
                <div className="font-semibold text-gray-900 text-lg">
                  {ing.quantity} {ing.baseIngredient}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {ing.specificationPrompt}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ing.specificationOptions.map((variety) => {
                  const isSelected = selections.get(ing.id) === variety
                  return (
                    <button
                      key={variety}
                      onClick={() => handleSelectionChange(ing.id, variety)}
                      className={`
                        px-4 py-3 rounded-lg border-2 transition-all text-left
                        ${isSelected
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-300'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <span className="capitalize font-medium">{variety}</span>
                        {isSelected && (
                          <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleConfirm}
            className="flex-1 px-6 py-3 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 transition-colors shadow-sm"
          >
            ✓ Confirm All Selections
          </button>
          <button
            onClick={onSkipAll}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Skip All (Use Defaults)
          </button>
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-white text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors border border-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
