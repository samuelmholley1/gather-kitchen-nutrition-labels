'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import MobileRestrict from '@/components/MobileRestrict'
import IngredientSearch from '@/components/IngredientSearch'
import IngredientSpecificationModal from '@/components/IngredientSpecificationModal'
import { SmartParseResult } from '@/lib/smartRecipeParser'
import { USDAFood } from '@/types/liturgist'
import { cleanIngredientForUSDASearch } from '@/lib/smartRecipeParser'

interface IngredientWithUSDA {
  quantity: number
  unit: string
  ingredient: string
  originalLine: string
  usdaFood: USDAFood | null
  searchQuery: string
  confirmed: boolean
  needsSpecification?: boolean
  specificationPrompt?: string
  specificationOptions?: string[]
  baseIngredient?: string
}

interface SubRecipeWithUSDA {
  name: string
  ingredients: IngredientWithUSDA[]
  quantityInFinalDish: number
  unitInFinalDish: string
}

export default function ReviewPage() {
  const router = useRouter()
  const [parseResult, setParseResult] = useState<SmartParseResult | null>(null)
  const [finalDishIngredients, setFinalDishIngredients] = useState<IngredientWithUSDA[]>([])
  const [subRecipes, setSubRecipes] = useState<SubRecipeWithUSDA[]>([])
  const [editingIngredient, setEditingIngredient] = useState<{
    type: 'final' | 'sub'
    subRecipeIndex?: number
    ingredientIndex: number
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveProgress, setSaveProgress] = useState('')
  const [autoSearching, setAutoSearching] = useState(false)
  const [hasAutoSearched, setHasAutoSearched] = useState(false)
  const [specificationModal, setSpecificationModal] = useState<{
    ingredient: IngredientWithUSDA & {
      needsSpecification?: boolean
      specificationPrompt?: string
      specificationOptions?: string[]
      baseIngredient?: string
    }
    type: 'final' | 'sub'
    subRecipeIndex?: number
    ingredientIndex: number
  } | null>(null)

  // Auto-search USDA for all ingredients on mount
  useEffect(() => {
    const autoSearchUSDA = async () => {
      if (!parseResult || hasAutoSearched || finalDishIngredients.length === 0) return
      
      setAutoSearching(true)
      setHasAutoSearched(true) // Prevent re-running
      
      try {
        // Search for final dish ingredients with variants
        const finalPromises = finalDishIngredients.map(async (ing, idx) => {
          // Skip if ingredient name is empty
          if (!ing.ingredient || ing.ingredient.trim().length === 0) {
            console.warn(`[USDA] Skipping empty ingredient`)
            return null
          }
          
          try {
            // Use variant search endpoint
            const response = await fetch(`/api/usda/search-with-variants`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ingredient: ing.ingredient })
            })
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}))
              const errorMsg = errorData.error || `HTTP ${response.status}`
              
              // User-friendly error messages
              if (response.status === 429 || errorMsg.includes('rate limit')) {
                console.error(`[USDA] Rate limit hit for "${ing.ingredient}". Please wait a moment.`)
              } else if (response.status >= 500 || errorMsg.includes('server error')) {
                console.error(`[USDA] USDA API temporarily unavailable for "${ing.ingredient}". Will retry.`)
              } else if (errorMsg.includes('Network') || errorMsg.includes('fetch')) {
                console.error(`[USDA] Network error searching for "${ing.ingredient}". Check your connection.`)
              } else {
                console.error(`[USDA] Search failed for "${ing.ingredient}": ${errorMsg}`)
              }
              return null
            }
            
            const data = await response.json()
            if (data.success && data.food) {
              if (data.attemptNumber > 1) {
                console.log(`[USDA] ✓ "${ing.ingredient}" matched using variant "${data.variantUsed}" (attempt ${data.attemptNumber})`)
              }
              return { idx, food: data.food, type: 'final' as const }
            } else {
              console.warn(`[USDA] No match found for "${ing.ingredient}" after trying ${data.variantsTried?.length || 0} variants`)
            }
          } catch (error) {
            console.error(`[USDA] Failed to search for "${ing.ingredient}":`, error)
          }
          return null
        })
        
        // Search for sub-recipe ingredients with variants
        const subPromises = subRecipes.flatMap((sub, subIdx) =>
          sub.ingredients.map(async (ing, ingIdx) => {
            // Skip if ingredient name is empty
            if (!ing.ingredient || ing.ingredient.trim().length === 0) {
              console.warn(`[USDA] Skipping empty ingredient`)
              return null
            }
            
            try {
              // Use variant search endpoint
              const response = await fetch(`/api/usda/search-with-variants`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ingredient: ing.ingredient })
              })
              
              if (!response.ok) {
                console.error(`[USDA] Variant search failed for "${ing.ingredient}":`, response.status)
                return null
              }
              
              const data = await response.json()
              if (data.success && data.food) {
                if (data.attemptNumber > 1) {
                  console.log(`[USDA] ✓ "${ing.ingredient}" matched using variant "${data.variantUsed}" (attempt ${data.attemptNumber})`)
                }
                return { subIdx, ingIdx, food: data.food, type: 'sub' as const }
              } else {
                console.warn(`[USDA] No match found for "${ing.ingredient}" after trying ${data.variantsTried?.length || 0} variants`)
              }
            } catch (error) {
              console.error(`[USDA] Failed to search for "${ing.ingredient}":`, error)
            }
            return null
          })
        )
        
        const allResults = await Promise.all([...finalPromises, ...subPromises])
        
        // Update state with proposed matches
        const newFinalIngredients = [...finalDishIngredients]
        const newSubRecipes = JSON.parse(JSON.stringify(subRecipes))
        
        allResults.forEach(result => {
          if (!result) return
          
          if (result.type === 'final') {
            newFinalIngredients[result.idx] = {
              ...newFinalIngredients[result.idx],
              usdaFood: result.food,
              confirmed: true // Auto-confirm found matches
            }
          } else {
            newSubRecipes[result.subIdx].ingredients[result.ingIdx] = {
              ...newSubRecipes[result.subIdx].ingredients[result.ingIdx],
              usdaFood: result.food,
              confirmed: true // Auto-confirm found matches
            }
          }
        })
        
        setFinalDishIngredients(newFinalIngredients)
        setSubRecipes(newSubRecipes)
      } catch (error) {
        console.error('Auto-search failed:', error)
      } finally {
        setAutoSearching(false)
      }
    }
    
    autoSearchUSDA()
  }, [parseResult, finalDishIngredients.length, hasAutoSearched])

  useEffect(() => {
    // Load parsed recipe from sessionStorage
    const stored = sessionStorage.getItem('parsedRecipe')
    if (!stored) {
      router.push('/import')
      return
    }

    const result: SmartParseResult = JSON.parse(stored)
    setParseResult(result)

    // Initialize final dish ingredients with USDA search queries
    const finalIngredients = result.finalDish.ingredients
      .filter(ing => !ing.isSubRecipe)
      .map(ing => ({
        ...ing,
        usdaFood: null,
        searchQuery: cleanIngredientForUSDASearch(ing.ingredient),
        confirmed: false
      }))
    setFinalDishIngredients(finalIngredients)

    // Initialize sub-recipes with USDA search queries
    const subsWithUSDA = result.subRecipes.map(sub => ({
      ...sub,
      ingredients: sub.ingredients.map(ing => ({
        ...ing,
        usdaFood: null,
        searchQuery: cleanIngredientForUSDASearch(ing.ingredient),
        confirmed: false
      }))
    }))
    setSubRecipes(subsWithUSDA)

    // Check for ingredients needing specification (final dish first, then sub-recipes)
    const needsSpecFinal = finalIngredients.find((ing: any) => ing.needsSpecification)
    if (needsSpecFinal) {
      const index = finalIngredients.indexOf(needsSpecFinal)
      setSpecificationModal({
        ingredient: needsSpecFinal as any,
        type: 'final',
        ingredientIndex: index
      })
      return // Don't proceed with auto-search until specification is complete
    }

    // Check sub-recipe ingredients
    for (let subIdx = 0; subIdx < subsWithUSDA.length; subIdx++) {
      const needsSpecSub = subsWithUSDA[subIdx].ingredients.find((ing: any) => ing.needsSpecification)
      if (needsSpecSub) {
        const ingIdx = subsWithUSDA[subIdx].ingredients.indexOf(needsSpecSub)
        setSpecificationModal({
          ingredient: needsSpecSub as any,
          type: 'sub',
          subRecipeIndex: subIdx,
          ingredientIndex: ingIdx
        })
        return // Don't proceed with auto-search until specification is complete
      }
    }

    // Warn before leaving page if there are unconfirmed ingredients
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const allConfirmed = [...finalIngredients, ...subsWithUSDA.flatMap(s => s.ingredients)]
        .every(ing => ing.confirmed)
      
      if (!saving && !allConfirmed) {
        e.preventDefault()
        e.returnValue = 'You have unconfirmed ingredients. Are you sure you want to leave?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [router, saving])

  const handleSelectUSDA = (food: USDAFood) => {
    if (!editingIngredient) return

    if (editingIngredient.type === 'final') {
      const updated = [...finalDishIngredients]
      updated[editingIngredient.ingredientIndex] = {
        ...updated[editingIngredient.ingredientIndex],
        usdaFood: food,
        confirmed: true
      }
      setFinalDishIngredients(updated)
    } else {
      const updated = [...subRecipes]
      updated[editingIngredient.subRecipeIndex!].ingredients[editingIngredient.ingredientIndex] = {
        ...updated[editingIngredient.subRecipeIndex!].ingredients[editingIngredient.ingredientIndex],
        usdaFood: food,
        confirmed: true
      }
      setSubRecipes(updated)
    }

    setEditingIngredient(null)
  }

  const allIngredientsConfirmed = () => {
    const finalConfirmed = finalDishIngredients.every(ing => ing.confirmed)
    const subsConfirmed = subRecipes.every(sub => 
      sub.ingredients.every(ing => ing.confirmed)
    )
    return finalConfirmed && subsConfirmed
  }

  const handleSave = async () => {
    if (!parseResult) return
    if (!allIngredientsConfirmed()) {
      alert('Please confirm all ingredient USDA matches before saving')
      return
    }

    setSaving(true)
    setSaveProgress('Preparing to save...')
    
    const createdSubRecipeIds: string[] = []
    
    try {
      const { createSubRecipe, createFinalDish } = await import('@/lib/smartRecipeSaver')
      
      // Step 1: Create all sub-recipes first
      const subRecipesData: Array<{ id: string, name: string, nutritionProfile: any, totalWeight: number, quantityInFinalDish: number, unitInFinalDish: string }> = []
      
      for (let i = 0; i < subRecipes.length; i++) {
        setSaveProgress(`Creating sub-recipe ${i + 1} of ${subRecipes.length}: "${subRecipes[i].name}"...`)
        try {
          const result = await createSubRecipe(subRecipes[i])
          createdSubRecipeIds.push(result.id)
          subRecipesData.push({
            id: result.id,
            name: subRecipes[i].name,
            nutritionProfile: result.nutritionProfile,
            totalWeight: result.totalWeight,
            quantityInFinalDish: subRecipes[i].quantityInFinalDish,
            unitInFinalDish: subRecipes[i].unitInFinalDish
          })
        } catch (subError) {
          // Rollback: Delete any sub-recipes that were already created
          setSaveProgress('Rolling back - deleting created sub-recipes...')
          for (const subRecipeId of createdSubRecipeIds) {
            try {
              await fetch(`/api/sub-recipes/${subRecipeId}`, { method: 'DELETE' })
            } catch (deleteError) {
              console.error(`Failed to delete sub-recipe ${subRecipeId}:`, deleteError)
            }
          }
          throw new Error(`Failed to create sub-recipe "${subRecipes[i].name}": ${subError instanceof Error ? subError.message : 'Unknown error'}`)
        }
      }

      // Step 2: Create final dish with sub-recipes
      setSaveProgress(`Creating final dish "${parseResult.finalDish.name}"...`)
      let finalDishId: string
      try {
        finalDishId = await createFinalDish(
          parseResult.finalDish.name,
          finalDishIngredients,
          subRecipesData
        )
      } catch (finalDishError) {
        // Rollback: Delete all created sub-recipes if final dish creation fails
        setSaveProgress('Final dish creation failed - rolling back sub-recipes...')
        for (const subRecipeId of createdSubRecipeIds) {
          try {
            await fetch(`/api/sub-recipes/${subRecipeId}`, { method: 'DELETE' })
          } catch (deleteError) {
            console.error(`Failed to delete sub-recipe ${subRecipeId}:`, deleteError)
          }
        }
        throw finalDishError
      }

      // Success!
      setSaveProgress('✅ Success! Recipe created!')
      
      // Clear session storage
      sessionStorage.removeItem('parsedRecipe')
      sessionStorage.removeItem('originalRecipeText')
      
      // Show success for 1.5 seconds before redirect
      setTimeout(() => {
        router.push(`/final-dishes`)
      }, 1500)
      
    } catch (error) {
      console.error('Save failed:', error)
      setSaveProgress('')
      
      // If some sub-recipes were created, inform user
      let errorMessage = `❌ Failed to save recipe: ${error instanceof Error ? error.message : 'Unknown error'}\n\n`
      
      if (createdSubRecipeIds.length > 0) {
        errorMessage += `⚠️ Warning: ${createdSubRecipeIds.length} sub-recipe(s) were created before the error occurred. You may need to delete them manually from the Sub-Recipes page to avoid duplicates.\n\n`
      }
      
      errorMessage += 'Please try again or contact support if the issue persists.'
      
      alert(errorMessage)
    } finally {
      setSaving(false)
      setSaveProgress('')
    }
  }

  // Handle ingredient specification
  const handleSpecify = (variety: string) => {
    if (!specificationModal) return

    const { type, ingredientIndex, subRecipeIndex } = specificationModal
    const updatedIngredient = variety || `medium ${specificationModal.ingredient.baseIngredient || specificationModal.ingredient.unit}`

    if (type === 'final') {
      const updated = [...finalDishIngredients]
      updated[ingredientIndex] = {
        ...updated[ingredientIndex],
        ingredient: updatedIngredient,
        searchQuery: cleanIngredientForUSDASearch(updatedIngredient),
        needsSpecification: false
      }
      setFinalDishIngredients(updated)
    } else {
      const updated = [...subRecipes]
      updated[subRecipeIndex!].ingredients[ingredientIndex] = {
        ...updated[subRecipeIndex!].ingredients[ingredientIndex],
        ingredient: updatedIngredient,
        searchQuery: cleanIngredientForUSDASearch(updatedIngredient),
        needsSpecification: false
      }
      setSubRecipes(updated)
    }

    // Check for more ingredients needing specification
    const allIngredients = [
      ...finalDishIngredients.map((ing, idx) => ({ ...ing, type: 'final' as const, ingredientIndex: idx })),
      ...subRecipes.flatMap((sub, subIdx) => 
        sub.ingredients.map((ing, ingIdx) => ({ ...ing, type: 'sub' as const, subRecipeIndex: subIdx, ingredientIndex: ingIdx }))
      )
    ]
    const nextNeedsSpec = allIngredients.find((ing: any) => ing.needsSpecification && 
      !(ing.type === type && ing.ingredientIndex === ingredientIndex && ing.subRecipeIndex === subRecipeIndex))
    
    if (nextNeedsSpec) {
      setSpecificationModal(nextNeedsSpec as any)
    } else {
      setSpecificationModal(null)
      // All specifications complete, allow auto-search to proceed
    }
  }

  const handleSkipSpecification = () => {
    handleSpecify('') // Empty string will use default "medium"
  }

  const handleCancelSpecification = () => {
    setSpecificationModal(null)
    router.push('/import') // Go back to import page
  }

  if (!parseResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <MobileRestrict>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Review & Confirm
          </h1>
          <p className="text-gray-600 text-lg">
            Review the parsed recipe and confirm USDA matches for each ingredient
          </p>
          
          {/* Progress Counter & Bar */}
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className={`px-4 py-2 rounded-lg font-medium ${
                allIngredientsConfirmed() 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {allIngredientsConfirmed() ? (
                  <span>✓ All ingredients confirmed!</span>
                ) : (
                  <span>
                    {[...finalDishIngredients, ...subRecipes.flatMap(s => s.ingredients)].filter(i => i.confirmed).length} of {[...finalDishIngredients, ...subRecipes.flatMap(s => s.ingredients)].length} ingredients confirmed
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600">
                {subRecipes.length > 0 && `${subRecipes.length} sub-recipe${subRecipes.length > 1 ? 's' : ''} detected`}
              </div>
              
              {/* Bulk Skip Button */}
              {!allIngredientsConfirmed() && [...finalDishIngredients, ...subRecipes.flatMap(s => s.ingredients)].some(i => !i.confirmed) && (
                <button
                  onClick={() => {
                    const unconfirmedCount = [...finalDishIngredients, ...subRecipes.flatMap(s => s.ingredients)].filter(i => !i.confirmed).length
                    if (confirm(`Skip all ${unconfirmedCount} remaining unconfirmed ingredients?\n\nThese ingredients will NOT contribute to nutrition calculations. Only do this if they're negligible or non-food items.`)) {
                      // Skip all unconfirmed in final dish
                      setFinalDishIngredients(finalDishIngredients.map(ing => 
                        ing.confirmed ? ing : { ...ing, confirmed: true, usdaFood: null }
                      ))
                      // Skip all unconfirmed in sub-recipes
                      setSubRecipes(subRecipes.map(sub => ({
                        ...sub,
                        ingredients: sub.ingredients.map(ing =>
                          ing.confirmed ? ing : { ...ing, confirmed: true, usdaFood: null }
                        )
                      })))
                    }
                  }}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors"
                >
                  Skip All Remaining
                </button>
              )}
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  allIngredientsConfirmed() ? 'bg-green-600' : 'bg-amber-500'
                }`}
                style={{ 
                  width: `${([...finalDishIngredients, ...subRecipes.flatMap(s => s.ingredients)].filter(i => i.confirmed).length / [...finalDishIngredients, ...subRecipes.flatMap(s => s.ingredients)].length) * 100}%` 
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Save Preview Summary */}
        {allIngredientsConfirmed() && (
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border-2 border-emerald-200 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-bold text-emerald-900 mb-3 flex items-center gap-2">
              <span className="text-2xl">🎉</span>
              Ready to Save!
            </h3>
            <div className="text-emerald-800 space-y-2">
              <p className="font-medium">This will create:</p>
              <ul className="ml-6 space-y-1">
                {subRecipes.length > 0 && (
                  <li>✓ {subRecipes.length} Sub-Recipe{subRecipes.length > 1 ? 's' : ''}: {subRecipes.map(s => s.name).join(', ')}</li>
                )}
                <li>✓ 1 Final Dish: {parseResult.finalDish.name}</li>
                <li className="text-sm text-emerald-700 mt-2">
                  📊 Total: {[...finalDishIngredients, ...subRecipes.flatMap(s => s.ingredients)].filter(i => i.usdaFood).length} ingredients with nutrition data
                  {[...finalDishIngredients, ...subRecipes.flatMap(s => s.ingredients)].filter(i => !i.usdaFood).length > 0 && 
                    `, ${[...finalDishIngredients, ...subRecipes.flatMap(s => s.ingredients)].filter(i => !i.usdaFood).length} skipped`
                  }
                </li>
              </ul>
            </div>
          </div>
        )}
        
        {/* Errors/Warnings */}
        {parseResult.errors.length > 0 && (
          <div className={`border-2 rounded-xl p-6 mb-6 ${
            parseResult.errors.some(e => !e.startsWith('⚠️'))
              ? 'bg-red-50 border-red-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <h3 className={`text-lg font-bold mb-2 ${
              parseResult.errors.some(e => !e.startsWith('⚠️'))
                ? 'text-red-900'
                : 'text-amber-900'
            }`}>
              {parseResult.errors.some(e => !e.startsWith('⚠️')) ? '🚨 Errors & Warnings' : '⚠️ Warnings'}
            </h3>
            <ul className="space-y-2">
              {parseResult.errors.map((error, idx) => (
                <li key={idx} className={`flex items-start gap-2 ${
                  error.startsWith('⚠️') ? 'text-amber-800' : 'text-red-800'
                }`}>
                  <span className="flex-shrink-0">{error.startsWith('⚠️') ? '⚠️' : '❌'}</span>
                  <span>{error.replace(/^⚠️\s*/, '').replace(/^Warning:\s*/i, '')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Final Dish */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Final Dish: {parseResult.finalDish.name}
          </h2>

          <div className="space-y-3">
            {finalDishIngredients.map((ing, idx) => (
              <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {ing.quantity} {ing.unit} {ing.ingredient}
                  </div>
                  {autoSearching ? (
                    <div className="text-sm text-gray-500 mt-1 animate-pulse">
                      🔍 Searching USDA database...
                    </div>
                  ) : ing.usdaFood ? (
                    <div className="text-sm text-green-700 mt-1 font-medium">
                      ✓ USDA Match Selected: {ing.usdaFood.description}
                    </div>
                  ) : (
                    <div className="text-sm text-red-600 mt-1 font-medium">
                      ❌ No match found - please search manually
                    </div>
                  )}
                </div>
                {!autoSearching && (
                  <div className="flex gap-2">
                    {ing.usdaFood ? (
                      // Has a match - show Change button (already auto-confirmed)
                      <button
                        onClick={() => setEditingIngredient({ type: 'final', ingredientIndex: idx })}
                        className="px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg font-medium transition-colors border border-blue-300"
                      >
                        ✏️ Change
                      </button>
                    ) : (
                      // No match - show Select button
                      <button
                        onClick={() => setEditingIngredient({ type: 'final', ingredientIndex: idx })}
                        className="px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg font-medium transition-colors shadow-sm"
                      >
                        🔍 Search USDA
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm(`Skip USDA match for "${ing.ingredient}"?\n\nThis ingredient will NOT contribute to nutrition calculations. Only skip if:\n• It's a non-food item (garnish, wrapper)\n• Quantity is negligible\n• You'll add nutrition data manually later`)) {
                          const updated = [...finalDishIngredients]
                          updated[idx] = { ...updated[idx], confirmed: true, usdaFood: null }
                          setFinalDishIngredients(updated)
                        }
                      }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                      title="Skip USDA match - won't contribute to nutrition"
                    >
                      Skip
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sub-Recipes */}
        {subRecipes.map((sub, subIdx) => (
          <div key={subIdx} className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-blue-900 mb-1 truncate" title={sub.name}>
              Sub-Recipe: {sub.name}
            </h3>
            <p className="text-sm text-blue-700 mb-4">
              Uses {sub.quantityInFinalDish} {sub.unitInFinalDish} in final dish
            </p>

            <div className="space-y-3">
              {sub.ingredients.map((ing, ingIdx) => (
                <div key={ingIdx} className="flex items-center gap-4 p-3 bg-white rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {ing.quantity} {ing.unit} {ing.ingredient}
                    </div>
                    {autoSearching ? (
                      <div className="text-sm text-gray-500 mt-1 animate-pulse">
                        🔍 Searching USDA database...
                      </div>
                    ) : ing.usdaFood ? (
                      <div className="text-sm text-green-700 mt-1 font-medium">
                        ✓ USDA Match Selected: {ing.usdaFood.description}
                      </div>
                    ) : (
                      <div className="text-sm text-red-600 mt-1 font-medium">
                        ❌ No match found - please search manually
                      </div>
                    )}
                  </div>
                  {!autoSearching && (
                    <div className="flex gap-2">
                      {ing.usdaFood ? (
                        // Has a match - show Change button (already auto-confirmed)
                        <button
                          onClick={() => setEditingIngredient({ type: 'sub', subRecipeIndex: subIdx, ingredientIndex: ingIdx })}
                          className="px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg font-medium transition-colors border border-blue-300"
                        >
                          ✏️ Change
                        </button>
                      ) : (
                        // No match - show Select button
                        <button
                          onClick={() => setEditingIngredient({ type: 'sub', subRecipeIndex: subIdx, ingredientIndex: ingIdx })}
                          className="px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg font-medium transition-colors shadow-sm"
                        >
                          🔍 Search USDA
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm(`Skip USDA match for "${ing.ingredient}"?\n\nThis ingredient will NOT contribute to nutrition calculations. Only skip if:\n• It's a non-food item (garnish, wrapper)\n• Quantity is negligible\n• You'll add nutrition data manually later`)) {
                            const updated = [...subRecipes]
                            updated[subIdx].ingredients[ingIdx] = { 
                              ...updated[subIdx].ingredients[ingIdx], 
                              confirmed: true, 
                              usdaFood: null 
                            }
                            setSubRecipes(updated)
                          }
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                        title="Skip USDA match - won't contribute to nutrition"
                      >
                        Skip
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* USDA Search Modal */}
        {editingIngredient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  Select USDA Match
                </h3>
                <button
                  onClick={() => setEditingIngredient(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              <IngredientSearch
                onSelectIngredient={handleSelectUSDA}
                initialQuery={
                  editingIngredient.type === 'final'
                    ? finalDishIngredients[editingIngredient.ingredientIndex].searchQuery
                    : subRecipes[editingIngredient.subRecipeIndex!].ingredients[editingIngredient.ingredientIndex].searchQuery
                }
              />
            </div>
          </div>
        )}

        {/* Save Progress */}
        {saveProgress && (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 mb-6 text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600"></div>
              <span className="text-emerald-900 font-medium">{saveProgress}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 sticky bottom-4">
          <button
            onClick={() => router.push('/import')}
            disabled={saving}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Back to Import
          </button>

          <button
            onClick={handleSave}
            disabled={!allIngredientsConfirmed() || saving}
            className="flex-1 px-8 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-lg font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                {allIngredientsConfirmed() ? '✓' : '⚠'} Save Recipe
              </>
            )}
          </button>
        </div>
        </main>
      </div>

      {/* Ingredient Specification Modal */}
      {specificationModal && (
        <IngredientSpecificationModal
          ingredient={specificationModal.ingredient}
          onSpecify={handleSpecify}
          onSkip={handleSkipSpecification}
          onCancel={handleCancelSpecification}
        />
      )}
    </MobileRestrict>
  )
}
