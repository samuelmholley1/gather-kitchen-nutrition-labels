'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Modal from '@/components/Modal'
import { SubRecipe } from '@/types/recipe'

export default function SubRecipesPage() {
  const [subRecipes, setSubRecipes] = useState<SubRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [modal, setModal] = useState<{
    isOpen: boolean
    type: 'info' | 'error' | 'warning' | 'success' | 'confirm'
    title: string
    message: string
    onConfirm?: () => void
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  })

  useEffect(() => {
    fetchSubRecipes()
  }, [])

  const fetchSubRecipes = async () => {
    try {
      const response = await fetch('/api/sub-recipes')
      const data = await response.json()
      
      if (data.success && data.subRecipes) {
        setSubRecipes(data.subRecipes)
      }
    } catch (error) {
      console.error('Error fetching sub-recipes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Delete Sub-Recipe',
      message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/sub-recipes/${id}`, {
            method: 'DELETE'
          })

          if (response.ok) {
            setSubRecipes(subRecipes.filter(sr => sr.id !== id))
            setModal({
              isOpen: true,
              type: 'success',
              title: 'Deleted',
              message: `"${name}" has been deleted successfully.`
            })
          } else {
            throw new Error('Delete failed')
          }
        } catch (error) {
          console.error('Delete error:', error)
          setModal({
            isOpen: true,
            type: 'error',
            title: 'Delete Failed',
            message: 'Unable to delete the sub-recipe. Please try again.'
          })
        }
      }
    })
  }

  // Filter sub-recipes
  const filteredRecipes = subRecipes.filter(sr => {
    const matchesSearch = sr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sr.category?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !categoryFilter || sr.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  // Get unique categories
  const categories = Array.from(new Set(subRecipes.map(sr => sr.category).filter(Boolean)))

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sub-recipes...</p>
        </div>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Sub-Recipes
              </h1>
              <p className="text-gray-600">
                Component recipes that can be reused in multiple final dishes
              </p>
            </div>
            
            <Link
              href="/sub-recipes/new"
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold shadow-lg flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Sub-Recipe
            </Link>
          </div>

          {/* Quick Links */}
          <div className="flex gap-3">
            <Link
              href="/"
              className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
            >
              ← Home
            </Link>
            <span className="text-gray-400">|</span>
            <Link
              href="/final-dishes"
              className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
            >
              Final Dishes →
            </Link>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or category..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Sub-Recipes Grid */}
        {filteredRecipes.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((subRecipe) => (
              <div
                key={subRecipe.id}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-500 to-blue-500 p-4 text-white">
                  <h3 className="text-xl font-bold mb-1">{subRecipe.name}</h3>
                  {subRecipe.category && (
                    <span className="text-xs bg-white/20 px-2 py-1 rounded">
                      {subRecipe.category}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-emerald-50 p-3 rounded-lg">
                      <p className="text-emerald-600 font-medium mb-1">Ingredients</p>
                      <p className="text-gray-900 font-bold text-lg">{subRecipe.ingredients.length}</p>
                    </div>
                    
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-blue-600 font-medium mb-1">Servings</p>
                      <p className="text-gray-900 font-bold text-lg">{subRecipe.servingsPerRecipe}</p>
                    </div>

                    <div className="bg-purple-50 p-3 rounded-lg">
                      <p className="text-purple-600 font-medium mb-1">Serving Size</p>
                      <p className="text-gray-900 font-bold">{subRecipe.servingSize}g</p>
                    </div>

                    <div className="bg-amber-50 p-3 rounded-lg">
                      <p className="text-amber-600 font-medium mb-1">Yield</p>
                      <p className="text-gray-900 font-bold">{subRecipe.yieldPercentage.toFixed(0)}%</p>
                    </div>
                  </div>

                  {/* Nutrition Preview */}
                  <div className="border-t pt-3">
                    <p className="text-xs font-medium text-gray-500 mb-2">Per Serving</p>
                    <div className="grid grid-cols-4 gap-2 text-xs text-center">
                      <div>
                        <p className="font-bold text-gray-900">{Math.round(subRecipe.nutritionProfile.calories)}</p>
                        <p className="text-gray-500">cal</p>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{subRecipe.nutritionProfile.protein.toFixed(1)}g</p>
                        <p className="text-gray-500">protein</p>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{subRecipe.nutritionProfile.totalFat.toFixed(1)}g</p>
                        <p className="text-gray-500">fat</p>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{subRecipe.nutritionProfile.totalCarbohydrate.toFixed(1)}g</p>
                        <p className="text-gray-500">carbs</p>
                      </div>
                    </div>
                  </div>

                  {/* Ingredients List */}
                  <div className="border-t pt-3">
                    <p className="text-xs font-medium text-gray-500 mb-2">Ingredients</p>
                    <ul className="text-xs text-gray-600 space-y-1 max-h-24 overflow-y-auto">
                      {subRecipe.ingredients.map((ing) => (
                        <li key={ing.id} className="truncate">
                          • {ing.name} ({ing.quantity} {ing.unit})
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t">
                    <Link
                      href={`/sub-recipes/${subRecipe.id}`}
                      className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium text-center"
                    >
                      View Details
                    </Link>
                    
                    <button
                      onClick={() => handleDelete(subRecipe.id, subRecipe.name)}
                      className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      title="Delete"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500">
                  Updated: {new Date(subRecipe.updatedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            {searchQuery || categoryFilter ? (
              <>
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Results Found</h3>
                <p className="text-gray-600 mb-4">
                  No sub-recipes match your search criteria
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setCategoryFilter('')
                  }}
                  className="text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Clear Filters
                </button>
              </>
            ) : (
              <>
                <svg className="w-20 h-20 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No Sub-Recipes Yet</h3>
                <p className="text-gray-600 mb-6">
                  Create your first sub-recipe to get started. Sub-recipes are component recipes
                  (like sauces, doughs, or bases) that you can reuse in multiple final dishes.
                </p>
                <Link
                  href="/sub-recipes/new"
                  className="inline-block px-8 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold"
                >
                  Create Your First Sub-Recipe
                </Link>
              </>
            )}
          </div>
        )}

        {/* Info Card */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-2">💡 What are Sub-Recipes?</h3>
          <p className="text-blue-800 text-sm">
            Sub-recipes are component recipes (sauces, doughs, marinades, etc.) that you use in multiple dishes. 
            Create them once with accurate nutrition data, then reuse them in your final dishes. This saves time 
            and ensures consistency across your menu.
          </p>
        </div>
      </main>

      {/* Modal for errors/confirmations */}
      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        onConfirm={modal.onConfirm}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        confirmText={modal.type === 'confirm' ? 'Delete' : 'OK'}
      />
    </div>
  )
}
