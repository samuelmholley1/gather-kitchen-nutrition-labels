'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import NutritionLabel from '@/components/NutritionLabel'
import Header from '@/components/Header'
import Modal from '@/components/Modal'

interface FinalDish {
  id: string
  name: string
  components: any[]
  totalWeight: number
  servingSize: number
  servingsPerContainer: number
  nutritionLabel: any
  allergens: string[]
  category: string
  status: string
  createdAt: string
}

export default function FinalDishesPage() {
  const [finalDishes, setFinalDishes] = useState<FinalDish[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [viewingLabel, setViewingLabel] = useState<FinalDish | null>(null)
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
    fetchFinalDishes()
  }, [])

  const fetchFinalDishes = async () => {
    try {
      const response = await fetch('/api/final-dishes')
      if (response.ok) {
        const data = await response.json()
        setFinalDishes(data.finalDishes || [])
      }
    } catch (error) {
      console.error('Failed to fetch final dishes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Delete Final Dish',
      message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/final-dishes/${id}`, {
            method: 'DELETE'
          })

          if (response.ok) {
            setFinalDishes(finalDishes.filter(dish => dish.id !== id))
            setModal({
              isOpen: true,
              type: 'success',
              title: 'Deleted',
              message: `"${name}" has been deleted successfully.`
            })
          } else {
            setModal({
              isOpen: true,
              type: 'error',
              title: 'Delete Failed',
              message: 'Unable to delete the final dish. Please try again.'
            })
          }
        } catch (error) {
          console.error('Delete error:', error)
          setModal({
            isOpen: true,
            type: 'error',
            title: 'Error',
            message: 'An unexpected error occurred while deleting the dish.'
          })
        }
      }
    })
  }

  // Filter final dishes
  const filteredDishes = finalDishes.filter(dish => {
    const matchesSearch = dish.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || dish.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Get unique categories
  const categories = Array.from(new Set(finalDishes.map(dish => dish.category).filter(Boolean)))

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50">
        <Header />
        <main className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Final Dishes
              </h1>
              <p className="text-gray-600">
                Complete menu items with FDA-compliant nutrition labels
              </p>
            </div>
            <Link
              href="/final-dishes/new"
              className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-lg flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Final Dish
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
              href="/sub-recipes"
              className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
            >
              Sub-Recipes
            </Link>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="mb-6 flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search final dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Final Dishes Grid */}
        {filteredDishes.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery || selectedCategory ? 'No dishes found' : 'No final dishes yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || selectedCategory
                ? 'Try adjusting your filters'
                : 'Create your first final dish to get started'}
            </p>
            {!searchQuery && !selectedCategory && (
              <Link
                href="/final-dishes/new"
                className="inline-block px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Create Final Dish
              </Link>
            )}
          </div>
        )}

        {filteredDishes.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDishes.map(dish => (
              <div
                key={dish.id}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {dish.name}
                    </h3>
                    {dish.category && (
                      <span className="inline-block px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
                        {dish.category}
                      </span>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    dish.status === 'Active'
                      ? 'bg-green-100 text-green-700'
                      : dish.status === 'Draft'
                      ? 'bg-gray-100 text-gray-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {dish.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Components:</span>
                    <span className="font-medium text-gray-900">{dish.components.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Serving Size:</span>
                    <span className="font-medium text-gray-900">
                      {dish.servingSize}g 
                      <span className="text-xs text-gray-500 ml-1">
                        ({dish.servingsPerContainer} {dish.servingsPerContainer === 1 ? 'serving' : 'servings'}/container)
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Calories:</span>
                    <span className="font-medium text-gray-900">
                      {Math.round(dish.nutritionLabel?.calories || 0)} kcal
                      <span className="text-xs text-gray-500 ml-1">per serving</span>
                    </span>
                  </div>
                  {dish.allergens && dish.allergens.length > 0 && (
                    <div className="pt-2 border-t">
                      <span className="text-red-600 font-medium">⚠️ Allergens:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {dish.allergens.map(allergen => (
                          <span key={allergen} className="px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded">
                            {allergen}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setViewingLabel(dish)}
                    className="flex-1 px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    View Label
                  </button>
                  <button
                    onClick={() => handleDelete(dish.id, dish.name)}
                    className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Nutrition Label Modal */}
      {viewingLabel && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingLabel(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white z-10 pb-4 border-b">
              <h2 className="text-2xl font-bold text-gray-900">
                {viewingLabel.name}
              </h2>
              <button
                onClick={() => setViewingLabel(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="flex justify-center">
              <NutritionLabel
                dishName={viewingLabel.name}
                servingSize={`${viewingLabel.servingSize}g`}
                servingsPerContainer={viewingLabel.servingsPerContainer}
                nutrients={viewingLabel.nutritionLabel}
                allergens={viewingLabel.allergens}
              />
            </div>
          </div>
        </div>
      )}

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
