'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Modal from '@/components/Modal'
import MobileRestrict from '@/components/MobileRestrict'
import { parseSmartRecipe, SmartParseResult } from '@/lib/smartRecipeParser'
import { validateRecipeTextLength } from '@/lib/security'

export default function RecipeImporterPage() {
  const router = useRouter()
  const [recipeText, setRecipeText] = useState('')
  const [parsing, setParsing] = useState(false)
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
  
  // On mount, restore recipe text if returning from review page
  useEffect(() => {
    const stored = sessionStorage.getItem('originalRecipeText')
    if (stored) {
      setRecipeText(stored)
    }
  }, [])

  const handleParse = () => {
    if (!recipeText.trim()) {
      setModal({
        isOpen: true,
        type: 'warning',
        title: 'No Recipe Text',
        message: 'Please paste a recipe before continuing.'
      })
      return
    }

    // Validate recipe length
    const validation = validateRecipeTextLength(recipeText)
    if (!validation.valid) {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Recipe Too Long',
        message: validation.error || 'The recipe text is too long to process.'
      })
      return
    }

    setParsing(true)
    // Small delay for UX (shows we're processing)
    setTimeout(() => {
      const result = parseSmartRecipe(recipeText)
      // Store BOTH result AND original text in sessionStorage
      sessionStorage.setItem('parsedRecipe', JSON.stringify(result))
      sessionStorage.setItem('originalRecipeText', recipeText)
      router.push('/import/review')
    }, 300)
  }

  return (
    <MobileRestrict>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Recipe Importer
          </h1>
          <p className="text-gray-600 text-lg">
            Paste your complete recipe below. The app will automatically detect sub-recipes 
            (ingredients with components in parentheses) and create them for you.
          </p>
        </div>

        {/* Instructions Card */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-blue-900 mb-3 flex items-center gap-2">
            <span className="text-2xl">💡</span>
            How to Format Your Recipe
          </h2>
          <div className="space-y-3 text-blue-900">
            <div>
              <strong>1. Recipe Name:</strong> First line is your dish name
            </div>
            <div>
              <strong>2. Ingredients:</strong> One per line with quantity and unit
            </div>
            <div>
              <strong>3. Sub-Recipes:</strong> Use parentheses to define components
            </div>
          </div>
          
          <div className="mt-4 bg-white rounded-lg p-4 font-mono text-sm">
            <div className="text-gray-500 mb-2">Example:</div>
            <div className="text-gray-900">
              Chicken Tacos<br/>
              <br/>
              2 cups shredded chicken<br/>
              1 cup salsa verde (1/2 cup tomatillos, 1/4 cup onions, 2 tbsp cilantro, 1 jalapeño)<br/>
              8 corn tortillas<br/>
              1/2 cup cheese
            </div>
          </div>
        </div>

        {/* Paste Area */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Paste Your Recipe Here
          </label>
          
          {/* Live Validation Feedback */}
          {recipeText.trim() && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                {recipeText.split('\n').filter(l => l.trim()).length > 0 && (
                  <span className="text-green-700">✓ Recipe name detected</span>
                )}
                {recipeText.split('\n').filter(l => l.trim()).length > 1 && (
                  <span className="text-green-700">
                    • ✓ {recipeText.split('\n').filter(l => l.trim()).length - 1} ingredient{recipeText.split('\n').filter(l => l.trim()).length - 1 > 1 ? 's' : ''} found
                  </span>
                )}
                {recipeText.match(/\([^)]+\)/g) && (
                  <span className="text-blue-700">
                    • 🔍 {recipeText.match(/\([^)]+\)/g)!.length} potential sub-recipe{recipeText.match(/\([^)]+\)/g)!.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          )}
          
          <textarea
            value={recipeText}
            onChange={(e) => setRecipeText(e.target.value)}
            onKeyDown={(e) => {
              // Ctrl/Cmd + Enter to parse
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault()
                handleParse()
              }
            }}
            placeholder="Paste your recipe here...

Example:
Chicken Tacos

2 cups shredded chicken
1 cup salsa verde (1/2 cup tomatillos, 1/4 cup onions, 2 tbsp cilantro, 1 jalapeño)
8 corn tortillas
1/2 cup cheese"
            className="w-full h-96 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono text-sm resize-none"
          />
          <div className="mt-2 flex justify-between items-center text-sm text-gray-500">
            <span>{recipeText.split('\n').filter(l => l.trim()).length} lines</span>
            <span className="text-xs text-gray-400">💡 Tip: Press Ctrl/Cmd + Enter to parse</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleParse}
            disabled={parsing || !recipeText.trim()}
            className="flex-1 px-8 py-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-lg font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {parsing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Parsing Recipe...
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Parse Recipe
              </>
            )}
          </button>
          
          <button
            onClick={() => {
              setModal({
                isOpen: true,
                type: 'confirm',
                title: 'Clear Recipe',
                message: 'Are you sure you want to clear the recipe text?',
                onConfirm: () => setRecipeText('')
              })
            }}
            disabled={!recipeText}
            className="px-6 py-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear
          </button>
        </div>

        {/* Quick Links */}
        <div className="mt-8 flex justify-center gap-4 text-sm">
          <button
            onClick={() => router.push('/')}
            className="text-emerald-600 hover:text-emerald-700 font-medium"
          >
            ← Back to Home
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={() => router.push('/sub-recipes')}
            className="text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Sub-Recipes
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={() => router.push('/final-dishes')}
            className="text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Final Dishes
          </button>
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
        />
      </div>
    </MobileRestrict>
  )
}
