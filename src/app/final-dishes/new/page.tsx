'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import Link from 'next/link'
import IngredientSearch from '@/components/IngredientSearch'
import NutritionLabel from '@/components/NutritionLabel'
import Header from '@/components/Header'
import MobileRestrict from '@/components/MobileRestrict'
import { USDAFood, NutrientProfile } from '@/types/recipe'

interface FinalDishComponent {
  id: string
  type: 'ingredient' | 'subRecipe'
  fdcId?: number
  subRecipeId?: string
  name: string
  quantity: number
  unit: string
}

interface FinalDishForm {
  name: string
  components: FinalDishComponent[]
  servingSize: number
  servingsPerContainer: number
  category: string
  allergens: string[]
  notes: string
  status: string
}

export default function NewFinalDishPage() {
  const [subRecipes, setSubRecipes] = useState<any[]>([])
  const [selectedFood, setSelectedFood] = useState<USDAFood | null>(null)
  const [selectedSubRecipe, setSelectedSubRecipe] = useState<any | null>(null)
  const [quantity, setQuantity] = useState('')
  const [saving, setSaving] = useState(false)
  const [previewNutrition, setPreviewNutrition] = useState<NutrientProfile | null>(null)
  const [calculating, setCalculating] = useState(false)

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<FinalDishForm>({
    defaultValues: {
      name: '',
      components: [],
      servingSize: 100,
      servingsPerContainer: 1,
      category: '',
      allergens: [],
      notes: '',
      status: 'Draft'
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'components'
  })

  const components = watch('components')
  const servingSize = watch('servingSize')

  // Fetch sub-recipes on mount
  useEffect(() => {
    fetchSubRecipes()
  }, [])

  // Auto-calculate nutrition when components or serving size change
  useEffect(() => {
    if (components.length > 0) {
      calculatePreviewNutrition()
    }
  }, [components, servingSize])

  const fetchSubRecipes = async () => {
    try {
      const response = await fetch('/api/sub-recipes')
      if (response.ok) {
        const data = await response.json()
        setSubRecipes(data.subRecipes || [])
      }
    } catch (error) {
      console.error('Failed to fetch sub-recipes:', error)
    }
  }

  const calculatePreviewNutrition = async () => {
    setCalculating(true)
    try {
      const response = await fetch('/api/final-dishes/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          components,
          servingSize
        })
      })

      if (response.ok) {
        const data = await response.json()
        setPreviewNutrition(data.nutritionProfile)
      }
    } catch (error) {
      console.error('Preview calculation failed:', error)
    } finally {
      setCalculating(false)
    }
  }

  const handleAddIngredient = () => {
    if (!selectedFood || !quantity) return

    const component: FinalDishComponent = {
      id: `comp_${Date.now()}`,
      type: 'ingredient',
      fdcId: selectedFood.fdcId,
      name: selectedFood.description,
      quantity: parseFloat(quantity),
      unit: 'grams'
    }

    append(component)
    
    // Reset
    setSelectedFood(null)
    setQuantity('')
  }

  const handleAddSubRecipe = () => {
    if (!selectedSubRecipe || !quantity) return

    const component: FinalDishComponent = {
      id: `comp_${Date.now()}`,
      type: 'subRecipe',
      subRecipeId: selectedSubRecipe.id,
      name: selectedSubRecipe.name,
      quantity: parseFloat(quantity),
      unit: 'grams'
    }

    append(component)
    
    // Reset
    setSelectedSubRecipe(null)
    setQuantity('')
  }

  const onSubmit = async (data: FinalDishForm) => {
    setSaving(true)

    try {
      // Calculate final nutrition
      const calcResponse = await fetch('/api/final-dishes/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          components: data.components,
          servingSize: data.servingSize
        })
      })

      if (!calcResponse.ok) {
        throw new Error('Failed to calculate nutrition')
      }

      const { nutritionProfile, totalWeight, servingsPerContainer } = await calcResponse.json()

      // Prepare sub-recipe links for Airtable
      const subRecipeLinks = data.components
        .filter(c => c.type === 'subRecipe')
        .map(c => c.subRecipeId)
        .filter(Boolean)

      // Save final dish
      const saveResponse = await fetch('/api/final-dishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          components: data.components,
          totalWeight,
          servingSize: data.servingSize,
          servingsPerContainer,
          nutritionLabel: nutritionProfile,
          subRecipeLinks,
          allergens: data.allergens,
          category: data.category,
          notes: data.notes,
          status: data.status
        })
      })

      if (!saveResponse.ok) {
        throw new Error('Failed to save final dish')
      }

      alert('Final dish saved successfully!')
      window.location.href = '/final-dishes'
    } catch (error) {
      console.error('Save error:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to save final dish'}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <MobileRestrict>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/final-dishes"
            className="inline-flex items-center text-emerald-600 hover:text-emerald-700 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Final Dishes
          </Link>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Create Final Dish
          </h1>
          <p className="text-gray-600">
            Build a complete menu item by combining sub-recipes and ingredients, then generate an FDA-compliant nutrition label
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column: Form */}
          <div className="lg:col-span-2 space-y-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Basic Info */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Basic Information</h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dish Name *
                    </label>
                    <input
                      {...register('name', { required: 'Name is required' })}
                      type="text"
                      placeholder="e.g., Margherita Pizza, Caesar Salad"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <input
                      {...register('category')}
                      type="text"
                      placeholder="e.g., Entree, Appetizer, Dessert"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Serving Size (grams) *
                    </label>
                    <input
                      {...register('servingSize', { required: true, min: 1 })}
                      type="number"
                      placeholder="150"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      {...register('status')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Active">Active</option>
                      <option value="Archived">Archived</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Components */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Components</h2>
                
                {/* Add Sub-Recipe */}
                <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h3 className="font-semibold text-gray-900 mb-3">Add Sub-Recipe</h3>
                  
                  <div className="grid md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <select
                        value={selectedSubRecipe?.id || ''}
                        onChange={(e) => {
                          const sr = subRecipes.find(sr => sr.id === e.target.value)
                          setSelectedSubRecipe(sr || null)
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">Select a sub-recipe...</option>
                        {subRecipes.map(sr => (
                          <option key={sr.id} value={sr.id}>{sr.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="Grams"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddSubRecipe}
                        disabled={!selectedSubRecipe || !quantity}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mb-4 text-center text-gray-500 text-sm">
                  — OR —
                </div>

                {/* Add USDA Ingredient */}
                <div className="mb-6 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <h3 className="font-semibold text-gray-900 mb-3">Add USDA Ingredient</h3>
                  
                  <div className="mb-4">
                    <IngredientSearch 
                      onSelectIngredient={setSelectedFood}
                      placeholder="Search for ingredients (chicken, lettuce, cheese...)"
                    />
                  </div>

                  {selectedFood && (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="Quantity (grams)"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddIngredient}
                        disabled={!quantity}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>

                {/* Components List */}
                {fields.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900">Components ({fields.length})</h3>
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            components[index].type === 'subRecipe'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {components[index].type === 'subRecipe' ? 'Sub-Recipe' : 'Ingredient'}
                          </span>
                          <span className="font-medium text-gray-900">{components[index].name}</span>
                          <span className="text-gray-600 text-sm">
                            {components[index].quantity}g
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Additional Info</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    placeholder="Add any notes about this dish..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={saving || fields.length === 0}
                className="w-full py-4 px-6 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Save Final Dish'}
              </button>
            </form>
          </div>

          {/* Right Column: Nutrition Label Preview */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Nutrition Label Preview
                </h2>
                
                {calculating && (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                  </div>
                )}

                {!calculating && previewNutrition && (
                  <NutritionLabel
                    dishName={watch('name') || 'Untitled Dish'}
                    servingSize={`${servingSize}g`}
                    servingsPerContainer={Math.round((components.reduce((sum, c) => sum + c.quantity, 0)) / servingSize) || 1}
                    nutrients={previewNutrition as any}
                    allergens={watch('allergens')}
                  />
                )}

                {!calculating && !previewNutrition && (
                  <p className="text-gray-500 text-center py-12">
                    Add components to see nutrition preview
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        </main>
      </div>
    </MobileRestrict>
  )
}
