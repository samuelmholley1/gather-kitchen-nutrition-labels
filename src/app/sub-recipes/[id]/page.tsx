'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { SubRecipe } from '@/types/recipe'

export default function SubRecipeDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [subRecipe, setSubRecipe] = useState<SubRecipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSubRecipe()
  }, [params.id])

  const fetchSubRecipe = async () => {
    try {
      const response = await fetch(`/api/sub-recipes/${params.id}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Sub-recipe not found')
        } else {
          setError('Failed to load sub-recipe')
        }
        return
      }

      const data = await response.json()
      if (data.success && data.subRecipe) {
        setSubRecipe(data.subRecipe)
      }
    } catch (err) {
      console.error('Error fetching sub-recipe:', err)
      setError('Network error - please try again')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!subRecipe) return
    
    if (!confirm(`Are you sure you want to delete "${subRecipe.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/sub-recipes/${params.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('Sub-recipe deleted successfully')
        router.push('/sub-recipes')
      } else {
        throw new Error('Delete failed')
      }
    } catch (err) {
      console.error('Delete error:', err)
      alert('Failed to delete sub-recipe. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50">
        <Header />
        <main className="container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading sub-recipe...</p>
          </div>
        </main>
      </div>
    )
  }

  if (error || !subRecipe) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <svg className="w-20 h-20 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {error || 'Sub-Recipe Not Found'}
            </h1>
            <p className="text-gray-600 mb-6">
              This sub-recipe may have been deleted or the link is incorrect.
            </p>
            <Link
              href="/sub-recipes"
              className="inline-block px-8 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold"
            >
              ← Back to Sub-Recipes
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/sub-recipes"
            className="text-emerald-600 hover:text-emerald-700 text-sm font-medium mb-4 inline-block"
          >
            ← Back to Sub-Recipes
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {subRecipe.name}
              </h1>
              {subRecipe.category && (
                <span className="inline-block bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-medium">
                  {subRecipe.category}
                </span>
              )}
            </div>
            
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <p className="text-gray-600 text-sm mb-2">Ingredients</p>
            <p className="text-3xl font-bold text-emerald-600">{subRecipe.ingredients.length}</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <p className="text-gray-600 text-sm mb-2">Serving Size</p>
            <p className="text-3xl font-bold text-blue-600">{subRecipe.servingSize}g</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <p className="text-gray-600 text-sm mb-2">Servings</p>
            <p className="text-3xl font-bold text-purple-600">{subRecipe.servingsPerRecipe}</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <p className="text-gray-600 text-sm mb-2">Yield</p>
            <p className="text-3xl font-bold text-amber-600">{subRecipe.yieldPercentage.toFixed(0)}%</p>
          </div>
        </div>

        {/* Ingredients List */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ingredients</h2>
          <div className="space-y-3">
            {subRecipe.ingredients.map((ing, idx) => (
              <div key={ing.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <span className="text-emerald-600 font-bold w-8">{idx + 1}.</span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{ing.name}</p>
                  <p className="text-sm text-gray-600">
                    {ing.quantity} {ing.unit}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Nutrition Profile */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Nutrition Facts (per serving)</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Calories</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(subRecipe.nutritionProfile.calories)}</p>
            </div>
            
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Protein</p>
              <p className="text-2xl font-bold text-gray-900">{subRecipe.nutritionProfile.protein.toFixed(1)}g</p>
            </div>
            
            <div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Total Fat</p>
              <p className="text-2xl font-bold text-gray-900">{subRecipe.nutritionProfile.totalFat.toFixed(1)}g</p>
            </div>
            
            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Carbohydrates</p>
              <p className="text-2xl font-bold text-gray-900">{subRecipe.nutritionProfile.totalCarbohydrate.toFixed(1)}g</p>
            </div>
          </div>

          {/* Additional nutrients */}
          <div className="mt-6 grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Saturated Fat</span>
              <span className="font-medium">{subRecipe.nutritionProfile.saturatedFat.toFixed(1)}g</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Cholesterol</span>
              <span className="font-medium">{subRecipe.nutritionProfile.cholesterol.toFixed(1)}mg</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Sodium</span>
              <span className="font-medium">{subRecipe.nutritionProfile.sodium.toFixed(1)}mg</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Dietary Fiber</span>
              <span className="font-medium">{subRecipe.nutritionProfile.dietaryFiber.toFixed(1)}g</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Total Sugars</span>
              <span className="font-medium">{subRecipe.nutritionProfile.totalSugars.toFixed(1)}g</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Added Sugars</span>
              <span className="font-medium">{subRecipe.nutritionProfile.addedSugars.toFixed(1)}g</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {subRecipe.notes && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="text-lg font-bold text-blue-900 mb-2">Notes</h3>
            <p className="text-blue-800">{subRecipe.notes}</p>
          </div>
        )}

        {/* Metadata */}
        <div className="mt-8 text-sm text-gray-500 flex gap-6">
          <div>
            <span className="font-medium">Created:</span> {new Date(subRecipe.createdAt).toLocaleString()}
          </div>
          <div>
            <span className="font-medium">Updated:</span> {new Date(subRecipe.updatedAt).toLocaleString()}
          </div>
        </div>
      </main>
    </div>
  )
}
