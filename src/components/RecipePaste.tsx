/**
 * Recipe Paste Component
 * 
 * Allows users to paste a full recipe text and automatically parse it
 */

'use client'

import { useState } from 'react'
import { parseRecipe, cleanIngredientForSearch, ParsedIngredient } from '@/lib/recipeParser'

interface RecipePasteProps {
  onParsed: (name: string, ingredients: ParsedIngredient[]) => void
}

export default function RecipePaste({ onParsed }: RecipePasteProps) {
  const [recipeText, setRecipeText] = useState('')
  const [showPaste, setShowPaste] = useState(true) // Open by default
  const [errors, setErrors] = useState<string[]>([])
  const [preview, setPreview] = useState<ParsedIngredient[]>([])
  const [recipeName, setRecipeName] = useState('')

  const handleParse = () => {
    const parsed = parseRecipe(recipeText)
    
    if (parsed.errors.length > 0) {
      setErrors(parsed.errors)
    } else {
      setErrors([])
    }
    
    setRecipeName(parsed.name)
    setPreview(parsed.ingredients)
  }

  const handleImport = () => {
    if (preview.length > 0) {
      onParsed(recipeName, preview)
      // Reset state
      setRecipeText('')
      setPreview([])
      setRecipeName('')
      setErrors([])
      setShowPaste(false)
    }
  }

  const handleCancel = () => {
    setRecipeText('')
    setPreview([])
    setRecipeName('')
    setErrors([])
    setShowPaste(false)
  }

  if (!showPaste) {
    return (
      <button
        type="button"
        onClick={() => setShowPaste(true)}
        className="w-full py-3 px-4 border-2 border-dashed border-emerald-300 rounded-lg text-emerald-600 hover:border-emerald-500 hover:text-emerald-700 transition-colors"
      >
        📋 Open Recipe Paste
      </button>
    )
  }

  return (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          📋 Paste Your Recipe
        </h3>
        <button
          type="button"
          onClick={handleCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Recipe Text
        </label>
        <p className="text-sm text-gray-600">
          Format: Recipe name on first line, then ingredients (one per line) like:
          <br />
          <code className="bg-gray-100 px-1 rounded">150 G chicken breast</code> or{' '}
          <code className="bg-gray-100 px-1 rounded">2 tbsp olive oil</code>
        </p>
        <textarea
          value={recipeText}
          onChange={(e) => setRecipeText(e.target.value)}
          rows={12}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono text-sm"
          placeholder="Pineapple Chicken

150 G boneless/skinless chicken breast
50 G julienned yellow onion
75 G red bell pepper
2 G green onion sliced
1 tsp sesame seeds
6 oz pineapple juice"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleParse}
          disabled={!recipeText.trim()}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Parse Recipe
        </button>
        {preview.length > 0 && (
          <button
            type="button"
            onClick={handleImport}
            className="flex-1 bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700"
          >
            Import {preview.length} Ingredients
          </button>
        )}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <p className="font-medium text-yellow-800 mb-1">⚠️ Parsing Issues:</p>
          <ul className="text-sm text-yellow-700 space-y-1">
            {errors.map((error, idx) => (
              <li key={idx}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview */}
      {preview.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-md p-4">
          <h4 className="font-medium text-gray-900 mb-3">
            Preview: {recipeName}
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {preview.map((ing, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded"
              >
                <div className="flex-1">
                  <span className="font-medium text-gray-900">{ing.name}</span>
                  <span className="text-gray-500 text-sm ml-2">
                    ({cleanIngredientForSearch(ing.name)})
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {ing.quantity} {ing.unit}
                  {ing.grams !== null && (
                    <span className="ml-2 text-emerald-600 font-medium">
                      ≈ {Math.round(ing.grams)}g
                    </span>
                  )}
                  {ing.grams === null && (
                    <span className="ml-2 text-red-600">
                      (unknown unit)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
