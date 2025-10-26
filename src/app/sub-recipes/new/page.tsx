'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import Link from 'next/link'
import IngredientSearch from '@/components/IngredientSearch'
import RecipePaste from '@/components/RecipePaste'
import Header from '@/components/Header'
import MobileRestrict from '@/components/MobileRestrict'
import { USDAFood, Ingredient, SubRecipe, NutrientProfile } from '@/types/recipe'
import { ParsedIngredient, cleanIngredientForSearch } from '@/lib/recipeParser'

interface SubRecipeForm {
  name: string
  ingredients: Ingredient[]
  rawWeight: number
  finalWeight: number
  servingSize: number
  category: string
  notes: string
}

export default function NewSubRecipePage() {
  const [selectedFood, setSelectedFood] = useState<USDAFood | null>(null)
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('grams')
  const [customGrams, setCustomGrams] = useState('')
  const [saving, setSaving] = useState(false)
  const [previewNutrition, setPreviewNutrition] = useState<NutrientProfile | null>(null)
  const [searchingIngredients, setSearchingIngredients] = useState(false)

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<SubRecipeForm>({
    defaultValues: {
      name: '',
      ingredients: [],
      rawWeight: 0,
      finalWeight: 0,
      servingSize: 100,
      category: '',
      notes: ''
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'ingredients'
  })

  const rawWeight = watch('rawWeight')
  const finalWeight = watch('finalWeight')
  const servingSize = watch('servingSize')

  // Calculate yield percentage
  const yieldPercentage = rawWeight > 0 && finalWeight > 0 
    ? ((finalWeight / rawWeight) * 100).toFixed(1) 
    : '0'

  // Calculate servings
  const servingsPerRecipe = finalWeight > 0 && servingSize > 0
    ? (finalWeight / servingSize).toFixed(1)
    : '0'

  const handleAddIngredient = () => {
    if (!selectedFood || !quantity) return

    const ingredient: Ingredient = {
      id: `ing_${Date.now()}`,
      fdcId: selectedFood.fdcId,
      name: selectedFood.description,
      quantity: parseFloat(quantity),
      unit,
      customGramsPerUnit: customGrams ? parseFloat(customGrams) : undefined,
      notes: ''
    }

    append(ingredient)
    
    // Reset
    setSelectedFood(null)
    setQuantity('')
    setUnit('grams')
    setCustomGrams('')
  }

  const handleParsedRecipe = async (name: string, parsedIngredients: ParsedIngredient[]) => {
    // Set recipe name
    setValue('name', name)
    
    // Calculate total raw weight
    const totalWeight = parsedIngredients.reduce((sum, ing) => sum + (ing.grams || 0), 0)
    setValue('rawWeight', Math.round(totalWeight))
    setValue('finalWeight', Math.round(totalWeight)) // Default to same as raw
    
    // Auto-search USDA for each ingredient
    setSearchingIngredients(true)
    
    for (const parsed of parsedIngredients) {
      try {
        const searchTerm = cleanIngredientForSearch(parsed.name)
        const response = await fetch(`/api/usda/search?query=${encodeURIComponent(searchTerm)}&pageSize=1`)
        
        if (response.ok) {
          const data = await response.json()
          
          if (data.foods && data.foods.length > 0) {
            const usdaFood = data.foods[0]
            
            const ingredient: Ingredient = {
              id: `ing_${Date.now()}_${Math.random()}`,
              fdcId: usdaFood.fdcId,
              name: parsed.name, // Keep original name from recipe
              quantity: parsed.grams || parsed.quantity,
              unit: 'grams',
              notes: `Auto-matched: ${usdaFood.description}`
            }
            
            append(ingredient)
          } else {
            // No USDA match found - add with placeholder
            const ingredient: Ingredient = {
              id: `ing_${Date.now()}_${Math.random()}`,
              fdcId: 0, // Placeholder
              name: parsed.name,
              quantity: parsed.grams || parsed.quantity,
              unit: 'grams',
              notes: '⚠️ No USDA match - please search manually'
            }
            
            append(ingredient)
          }
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300))
      } catch (error) {
        console.error(`Failed to search for ${parsed.name}:`, error)
      }
    }
    
    setSearchingIngredients(false)
  }

  const onSubmit = async (data: SubRecipeForm) => {
    setSaving(true)

    try {
      // Calculate nutrition profile
      const response = await fetch('/api/sub-recipes/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: data.ingredients,
          rawWeight: data.rawWeight,
          finalWeight: data.finalWeight,
          servingSize: data.servingSize
        })
      })

      if (!response.ok) {
        throw new Error('Failed to calculate nutrition')
      }

      const { nutritionProfile } = await response.json()

      // Save sub-recipe
      const subRecipe: SubRecipe = {
        id: `sr_${Date.now()}`,
        name: data.name,
        ingredients: data.ingredients,
        rawWeight: data.rawWeight,
        finalWeight: data.finalWeight,
        yieldPercentage: parseFloat(yieldPercentage),
        servingSize: data.servingSize,
        servingsPerRecipe: parseFloat(servingsPerRecipe),
        nutritionProfile,
        category: data.category,
        notes: data.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const saveResponse = await fetch('/api/sub-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subRecipe)
      })

      if (!saveResponse.ok) {
        throw new Error('Failed to save sub-recipe')
      }

      alert('Sub-recipe saved successfully!')
      window.location.href = '/sub-recipes'
    } catch (error) {
      console.error('Save error:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to save sub-recipe'}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <MobileRestrict>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/sub-recipes"
            className="inline-flex items-center text-emerald-600 hover:text-emerald-700 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Sub-Recipes
          </Link>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Create Sub-Recipe
          </h1>
          <p className="text-gray-600">
            Build a component recipe (sauce, dough, base) that you can reuse in multiple final dishes
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Info Card */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Basic Information</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sub-Recipe Name *
                </label>
                <input
                  {...register('name', { required: 'Name is required' })}
                  type="text"
                  placeholder="e.g., Marinara Sauce, Pizza Dough, House Dressing"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category (Optional)
                </label>
                <input
                  {...register('category')}
                  type="text"
                  placeholder="e.g., Sauce, Base, Topping"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Ingredients Card */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Ingredients</h2>
            
            {/* Recipe Paste Section */}
            <div className="mb-6">
              <RecipePaste onParsed={handleParsedRecipe} />
            </div>

            {searchingIngredients && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <p className="text-blue-700">Searching USDA database for ingredients...</p>
                </div>
              </div>
            )}

            <div className="mb-4 text-center text-gray-500 text-sm">
              — OR —
            </div>
            
            {/* Add Ingredient Section */}
            <div className="mb-6 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <h3 className="font-semibold text-gray-900 mb-3">Add Ingredient Manually from USDA</h3>
              
              <div className="mb-4">
                <IngredientSearch 
                  onSelectIngredient={setSelectedFood}
                  placeholder="Search for ingredients (chicken, flour, tomatoes...)"
                />
              </div>

              {selectedFood && (
                <div className="space-y-3 p-4 bg-white rounded-lg border border-emerald-300">
                  <p className="font-medium text-gray-900">
                    Selected: {selectedFood.description}
                  </p>
                  
                  <div className="grid md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit *
                      </label>
                      <select
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="grams">Grams (g)</option>
                        <option value="cup">Cup</option>
                        <option value="tablespoon">Tablespoon</option>
                        <option value="teaspoon">Teaspoon</option>
                        <option value="ounce">Ounce (oz)</option>
                        <option value="pound">Pound (lb)</option>
                        <option value="piece">Piece</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>

                    {unit === 'custom' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Grams per Unit
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={customGrams}
                          onChange={(e) => setCustomGrams(e.target.value)}
                          placeholder="e.g., 240 for 1 cup"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    disabled={!quantity}
                    className="w-full py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    Add to Recipe
                  </button>
                </div>
              )}
            </div>

            {/* Ingredients List */}
            {fields.length > 0 ? (
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900 mb-2">Recipe Ingredients ({fields.length})</h3>
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{field.name}</p>
                      <p className="text-sm text-gray-600">
                        {field.quantity} {field.unit}
                        {field.customGramsPerUnit && ` (${field.customGramsPerUnit}g per unit)`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-red-600 hover:text-red-700 p-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <p>No ingredients added yet</p>
                <p className="text-sm">Search and add ingredients from USDA database above</p>
              </div>
            )}
          </div>

          {/* Cooking Yield Card */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Cooking Yield</h2>
            <p className="text-sm text-gray-600 mb-4">
              Track weight changes during cooking (e.g., water evaporation, fat rendering)
            </p>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Raw Weight (g) *
                </label>
                <input
                  {...register('rawWeight', { 
                    required: 'Required', 
                    min: { value: 1, message: 'Must be > 0' }
                  })}
                  type="number"
                  step="0.01"
                  placeholder="Total weight before cooking"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
                {errors.rawWeight && (
                  <p className="mt-1 text-sm text-red-600">{errors.rawWeight.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Final Weight (g) *
                </label>
                <input
                  {...register('finalWeight', { 
                    required: 'Required', 
                    min: { value: 1, message: 'Must be > 0' }
                  })}
                  type="number"
                  step="0.01"
                  placeholder="Weight after cooking"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
                {errors.finalWeight && (
                  <p className="mt-1 text-sm text-red-600">{errors.finalWeight.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yield Percentage
                </label>
                <div className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">
                  {yieldPercentage}%
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {parseFloat(yieldPercentage) < 100 && 'Weight loss during cooking'}
                  {parseFloat(yieldPercentage) > 100 && 'Weight gain (e.g., water absorption)'}
                  {parseFloat(yieldPercentage) === 100 && 'No weight change'}
                </p>
              </div>
            </div>
          </div>

          {/* Serving Size Card */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Serving Information</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Serving Size (g) *
                </label>
                <input
                  {...register('servingSize', { 
                    required: 'Required', 
                    min: { value: 1, message: 'Must be > 0' }
                  })}
                  type="number"
                  step="0.01"
                  placeholder="100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
                {errors.servingSize && (
                  <p className="mt-1 text-sm text-red-600">{errors.servingSize.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Servings Per Recipe
                </label>
                <div className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">
                  {servingsPerRecipe}
                </div>
              </div>
            </div>
          </div>

          {/* Notes Card */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Notes (Optional)</h2>
            <textarea
              {...register('notes')}
              rows={4}
              placeholder="Add any notes about this sub-recipe..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving || fields.length === 0}
              className="flex-1 py-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold text-lg shadow-lg"
            >
              {saving ? 'Saving...' : 'Save Sub-Recipe'}
            </button>
            
            <Link
              href="/sub-recipes"
              className="px-8 py-4 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-semibold text-lg"
            >
              Cancel
            </Link>
          </div>

          {fields.length === 0 && (
            <p className="text-center text-sm text-red-600">
              Please add at least one ingredient before saving
            </p>
          )}
        </form>
        </main>
      </div>
    </MobileRestrict>
  )
}
