'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from "next/link"
import Header from "@/components/Header"
import MobileRestrict from '@/components/MobileRestrict'
import { parseSmartRecipe } from '@/lib/smartRecipeParser'
import { validateRecipeTextLength } from '@/lib/security'

export default function Home() {
  const router = useRouter()
  const [recipeText, setRecipeText] = useState('')
  const [parsing, setParsing] = useState(false)
  
  // On mount, restore recipe text if returning from review page
  useEffect(() => {
    const stored = sessionStorage.getItem('originalRecipeText')
    if (stored) {
      setRecipeText(stored)
    }
  }, [])

  const handleParse = () => {
    if (!recipeText.trim()) {
      alert('Please paste a recipe first')
      return
    }

    // Validate recipe length
    const validation = validateRecipeTextLength(recipeText)
    if (!validation.valid) {
      alert(validation.error)
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
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-black text-gray-900 mb-3">
            🚀 Smart Recipe Importer
          </h1>
          <p className="text-gray-600 text-xl">
            Paste your recipe and get instant nutrition labels
          </p>
        </div>

        {/* MAIN ATTRACTION - Paste Area */}
        <div className="bg-gradient-to-br from-white to-emerald-50 rounded-2xl shadow-2xl p-8 mb-6 border-4 border-emerald-400">
          <label className="block text-2xl font-bold text-emerald-900 mb-4 text-center">
            📋 Paste Your Recipe Here
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
            className="w-full h-[500px] px-6 py-4 border-4 border-emerald-300 rounded-xl focus:ring-4 focus:ring-emerald-400 focus:border-emerald-500 font-mono text-base resize-none shadow-inner"
          />
          <div className="mt-3 flex justify-between items-center text-sm">
            <span className="text-emerald-700 font-medium">{recipeText.split('\n').filter(l => l.trim()).length} lines</span>
            <span className="text-xs text-gray-500">💡 Tip: Press Ctrl/Cmd + Enter to parse</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={handleParse}
            disabled={parsing || !recipeText.trim()}
            className="flex-1 px-8 py-5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all text-xl font-bold shadow-2xl hover:shadow-emerald-500/50 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {parsing ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                Parsing Recipe...
              </>
            ) : (
              <>
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Parse Recipe →
              </>
            )}
          </button>
          
          <button
            onClick={() => {
              if (confirm('Are you sure you want to clear the recipe text?')) {
                setRecipeText('')
              }
            }}
            disabled={!recipeText}
            className="px-8 py-5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear
          </button>
        </div>

        {/* Compact Instructions */}
        <details className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <summary className="text-sm font-semibold text-blue-900 cursor-pointer hover:text-blue-700 flex items-center gap-2">
            <span>💡</span>
            <span>How to Format Your Recipe (click to expand)</span>
          </summary>
          <div className="mt-3 space-y-2 text-sm text-blue-900">
            <div><strong>1. Recipe Name:</strong> First line is your dish name</div>
            <div><strong>2. Ingredients:</strong> One per line with quantity and unit</div>
            <div><strong>3. Sub-Recipes:</strong> Use parentheses for components</div>
            <div className="mt-2 text-xs text-blue-700">
              Example: <code className="bg-white px-1 rounded">1 cup salsa verde (1/2 cup tomatillos, 1/4 cup onions)</code>
            </div>
          </div>
        </details>

        {/* Quick Links */}
        <div className="mt-8 flex justify-center gap-4 text-sm">
          <Link
            href="/sub-recipes/new"
            className="text-emerald-600 hover:text-emerald-700 font-medium"
          >
            ➕ Add Recipe Manually
          </Link>
          <span className="text-gray-400">|</span>
          <Link
            href="/sub-recipes"
            className="text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Sub-Recipes
          </Link>
          <span className="text-gray-400">|</span>
          <Link
            href="/final-dishes"
            className="text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Final Dishes
          </Link>
        </div>
        </main>
      </div>
    </MobileRestrict>
  )
}
