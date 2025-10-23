'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import MobileRestrict from '@/components/MobileRestrict'
import IngredientSearch from '@/components/IngredientSearch'
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
      const subRecipesData: Array<{ id: string, name: string, nutritionProfile: any, quantityInFinalDish: number, unitInFinalDish: string }> = []
      
      for (let i = 0; i < subRecipes.length; i++) {
        setSaveProgress(`Creating sub-recipe ${i + 1} of ${subRecipes.length}: "${subRecipes[i].name}"...`)
        try {
          const result = await createSubRecipe(subRecipes[i])
          createdSubRecipeIds.push(result.id)
          subRecipesData.push({
            id: result.id,
            name: subRecipes[i].name,
            nutritionProfile: result.nutritionProfile,
            quantityInFinalDish: subRecipes[i].quantityInFinalDish,
            unitInFinalDish: subRecipes[i].unitInFinalDish
          })
        } catch (subError) {
          throw new Error(`Failed to create sub-recipe "${subRecipes[i].name}": ${subError instanceof Error ? subError.message : 'Unknown error'}`)
        }
      }

      // Step 2: Create final dish with sub-recipes
      setSaveProgress(`Creating final dish "${parseResult.finalDish.name}"...`)
      const finalDishId = await createFinalDish(
        parseResult.finalDish.name,
        finalDishIngredients,
        subRecipesData
      )

      // Success!
      setSaveProgress('Success! Redirecting...')
      alert(`✅ Recipe "${parseResult.finalDish.name}" created successfully!\n\n${subRecipes.length} sub-recipes created\n1 final dish created`)
      
      // Clear session storage and redirect
      sessionStorage.removeItem('parsedRecipe')
      router.push(`/final-dishes`)
      
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
        </div>

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
                  {ing.usdaFood ? (
                    <div className="text-sm text-green-700 mt-1">
                      ✓ Matched: {ing.usdaFood.description}
                    </div>
                  ) : (
                    <div className="text-sm text-amber-700 mt-1">
                      ⚠ No USDA match yet
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setEditingIngredient({ type: 'final', ingredientIndex: idx })}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    ing.confirmed
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  }`}
                >
                  {ing.confirmed ? 'Change' : 'Select USDA'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Sub-Recipes */}
        {subRecipes.map((sub, subIdx) => (
          <div key={subIdx} className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-blue-900 mb-1">
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
                    {ing.usdaFood ? (
                      <div className="text-sm text-green-700 mt-1">
                        ✓ Matched: {ing.usdaFood.description}
                      </div>
                    ) : (
                      <div className="text-sm text-amber-700 mt-1">
                        ⚠ No USDA match yet
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setEditingIngredient({ type: 'sub', subRecipeIndex: subIdx, ingredientIndex: ingIdx })}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      ing.confirmed
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    }`}
                  >
                    {ing.confirmed ? 'Change' : 'Select USDA'}
                  </button>
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
    </MobileRestrict>
  )
}
