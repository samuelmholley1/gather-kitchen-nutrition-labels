'use client'

import { useState, useEffect, useCallback } from 'react'
import { USDAFood, USDANutrient } from '@/types/recipe'
import IngredientOverrideModal from './IngredientOverrideModal'

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

interface IngredientSearchProps {
  onSelectIngredient: (food: USDAFood) => void
  onOverrideIngredient?: (customNutrients: NutrientData, reason?: string) => Promise<void>
  placeholder?: string
  autoFocus?: boolean
  initialQuery?: string
}

export default function IngredientSearch({ 
  onSelectIngredient, 
  onOverrideIngredient,
  placeholder = "Search USDA ingredients...",
  autoFocus = false,
  initialQuery = ''
}: IngredientSearchProps) {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<USDAFood[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [overrideModalOpen, setOverrideModalOpen] = useState(false)
  const [selectedForOverride, setSelectedForOverride] = useState<USDAFood | null>(null)

  // Debounced search function
  const searchIngredients = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch(
        `/api/usda/search?query=${encodeURIComponent(searchQuery)}&pageSize=20`,
        { signal: controller.signal }
      )
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success && data.foods) {
        setResults(data.foods)
        setIsOpen(true)
        
        // If no results, show helpful message
        if (data.foods.length === 0) {
          setError('No ingredients found. Try a simpler search term (e.g., "chicken breast" instead of "grilled seasoned chicken breast")')
        }
      } else {
        setResults([])
        setError(data.error || 'No results found. Try a different search term.')
      }
    } catch (err) {
      console.error('Ingredient search error:', err)
      
      // Better error messages
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Search timed out. Check your internet connection and try again.')
      } else {
        setError('Search failed. Please check your internet connection and try again.')
      }
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounce logic with useEffect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchIngredients(query)
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [query, searchIngredients])

  const handleSelect = (food: USDAFood) => {
    onSelectIngredient(food)
    setQuery('')
    setResults([])
    setIsOpen(false)
  }

  const handleOverride = (food: USDAFood) => {
    setSelectedForOverride(food)
    setOverrideModalOpen(true)
  }

  const handleOverrideSave = async (customNutrients: NutrientData, reason?: string) => {
    if (!selectedForOverride || !onOverrideIngredient) return

    await onOverrideIngredient(customNutrients, reason)
    setOverrideModalOpen(false)
    setSelectedForOverride(null)
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
    setError(null)
    setIsOpen(false)
  }

  return (
    <div className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg 
            className="h-5 w-5 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
            />
          </svg>
        </div>
        
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 placeholder-gray-400"
        />

        {/* Clear Button */}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-y-0 right-10 pr-3 flex items-center pointer-events-none">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600"></div>
          </div>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && !loading && results.length > 0 && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-96 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs text-gray-500 px-3 py-2 border-b border-gray-100">
              {results.length} results found
            </div>
            
            {results.map((food) => {
              const isUserIngredient = food.isUserIngredient || food.dataType === 'User Override'

              return (
                <div
                  key={food.fdcId}
                  className={`px-3 py-3 hover:bg-emerald-50 rounded-lg transition-colors group ${
                    isUserIngredient ? 'border-l-4 border-blue-500 bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`font-medium truncate ${
                          isUserIngredient ? 'text-blue-900' : 'text-gray-900 group-hover:text-emerald-700'
                        }`}>
                          {food.description}
                        </p>
                        {isUserIngredient && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium flex-shrink-0">
                            Custom
                          </span>
                        )}
                      </div>

                      {/* Additional Info */}
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                        {food.brandOwner && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                            {food.brandOwner}
                          </span>
                        )}

                        <span className={`px-2 py-0.5 rounded ${
                          isUserIngredient
                            ? 'bg-blue-100 text-blue-700'
                            : food.dataType === 'Foundation'
                            ? 'bg-green-100 text-green-700'
                            : food.dataType === 'SR Legacy'
                            ? 'bg-blue-100 text-blue-700'
                            : food.dataType === 'Branded'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {isUserIngredient && '⭐ User Override'}
                          {!isUserIngredient && food.dataType === 'Foundation' && '🔬 Foundation'}
                          {!isUserIngredient && food.dataType === 'SR Legacy' && '📚 SR Legacy'}
                          {!isUserIngredient && food.dataType === 'Branded' && '🏷️ Branded'}
                          {!isUserIngredient && food.dataType === 'Survey (FNDDS)' && '📊 Survey'}
                        </span>

                        {food.foodCategory && (
                          <span className="truncate">
                            {food.foodCategory}
                          </span>
                        )}
                      </div>

                      {/* User Ingredient Metadata */}
                      {isUserIngredient && food.userIngredientData && (
                        <div className="mt-1 flex items-center gap-2 text-xs text-blue-600">
                          {food.userIngredientData.tags?.length > 0 && (
                            <span>🏷️ {food.userIngredientData.tags.slice(0, 2).join(', ')}</span>
                          )}
                          {food.userIngredientData.usageCount > 0 && (
                            <span>📊 Used {food.userIngredientData.usageCount} times</span>
                          )}
                        </div>
                      )}

                      {/* Basic Nutrition Preview */}
                      {food.foodNutrients && food.foodNutrients.length > 0 && (
                        <div className="mt-2 flex gap-3 text-xs text-gray-600">
                          {food.foodNutrients.find((n: USDANutrient) => n.nutrientName === 'Energy' || n.nutrientName === 'Calories')?.value && (
                            <span>
                              {Math.round(food.foodNutrients.find((n: USDANutrient) => n.nutrientName === 'Energy' || n.nutrientName === 'Calories')!.value)} cal
                            </span>
                          )}
                          {food.foodNutrients.find((n: USDANutrient) => n.nutrientName === 'Protein')?.value && (
                            <span>
                              {food.foodNutrients.find((n: USDANutrient) => n.nutrientName === 'Protein')!.value.toFixed(1)}g protein
                            </span>
                          )}
                          {food.foodNutrients.find((n: USDANutrient) => n.nutrientName?.toLowerCase().includes('fat'))?.value && (
                            <span>
                              {food.foodNutrients.find((n: USDANutrient) => n.nutrientName?.toLowerCase().includes('fat'))!.value.toFixed(1)}g fat
                            </span>
                          )}
                          {food.foodNutrients.find((n: USDANutrient) => n.nutrientName?.toLowerCase().includes('carbohydrate'))?.value && (
                            <span>
                              {food.foodNutrients.find((n: USDANutrient) => n.nutrientName?.toLowerCase().includes('carbohydrate'))!.value.toFixed(1)}g carbs
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {onOverrideIngredient && !isUserIngredient && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOverride(food)
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Create custom version"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => handleSelect(food)}
                        className={`p-2 rounded-md transition-colors ${
                          isUserIngredient ? 'text-blue-500 hover:bg-blue-50' : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title="Add to recipe"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && query.length >= 2 && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-red-200 rounded-lg shadow-xl p-4">
          <div className="flex items-center gap-3 text-red-700">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium">Search Error</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && query.length >= 2 && results.length === 0 && !error && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-xl p-6 text-center">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600 font-medium mb-1">No ingredients found</p>
          <p className="text-sm text-gray-500">
            Try a different search term or check spelling
          </p>
        </div>
      )}

      {/* Search Hint */}
      {query.length > 0 && query.length < 2 && (
        <div className="absolute z-50 mt-2 w-full bg-blue-50 border border-blue-200 rounded-lg shadow-sm p-3">
          <p className="text-sm text-blue-700">
            Type at least 2 characters to search...
          </p>
        </div>
      )}

      {/* Override Modal */}
      {selectedForOverride && (
        <IngredientOverrideModal
          isOpen={overrideModalOpen}
          onClose={() => {
            setOverrideModalOpen(false)
            setSelectedForOverride(null)
          }}
          ingredientId={selectedForOverride.isUserIngredient ? selectedForOverride.fdcId.toString() : undefined}
          ingredientName={selectedForOverride.description}
          originalNutrients={{
            calories: selectedForOverride.foodNutrients?.find(n => n.nutrientName === 'Energy' || n.nutrientName === 'Calories')?.value || 0,
            totalFat: selectedForOverride.foodNutrients?.find(n => n.nutrientName?.toLowerCase().includes('fat') && !n.nutrientName?.toLowerCase().includes('saturated') && !n.nutrientName?.toLowerCase().includes('trans'))?.value || 0,
            saturatedFat: selectedForOverride.foodNutrients?.find(n => n.nutrientName?.toLowerCase().includes('saturated fat'))?.value || 0,
            transFat: selectedForOverride.foodNutrients?.find(n => n.nutrientName?.toLowerCase().includes('trans fat'))?.value || 0,
            cholesterol: selectedForOverride.foodNutrients?.find(n => n.nutrientName?.toLowerCase().includes('cholesterol'))?.value || 0,
            sodium: selectedForOverride.foodNutrients?.find(n => n.nutrientName?.toLowerCase().includes('sodium'))?.value || 0,
            totalCarbohydrate: selectedForOverride.foodNutrients?.find(n => n.nutrientName?.toLowerCase().includes('carbohydrate') && !n.nutrientName?.toLowerCase().includes('fiber') && !n.nutrientName?.toLowerCase().includes('sugar'))?.value || 0,
            dietaryFiber: selectedForOverride.foodNutrients?.find(n => n.nutrientName?.toLowerCase().includes('fiber'))?.value || 0,
            sugars: selectedForOverride.foodNutrients?.find(n => n.nutrientName?.toLowerCase().includes('sugar') && !n.nutrientName?.toLowerCase().includes('dietary'))?.value || 0,
            protein: selectedForOverride.foodNutrients?.find(n => n.nutrientName?.toLowerCase().includes('protein'))?.value || 0,
            vitaminA: selectedForOverride.foodNutrients?.find(n => n.nutrientName?.toLowerCase().includes('vitamin a'))?.value || 0,
            vitaminC: selectedForOverride.foodNutrients?.find(n => n.nutrientName?.toLowerCase().includes('vitamin c'))?.value || 0,
            calcium: selectedForOverride.foodNutrients?.find(n => n.nutrientName?.toLowerCase().includes('calcium'))?.value || 0,
            iron: selectedForOverride.foodNutrients?.find(n => n.nutrientName?.toLowerCase().includes('iron'))?.value || 0
          }}
          onSave={handleOverrideSave}
        />
      )}
    </div>
  )
}
