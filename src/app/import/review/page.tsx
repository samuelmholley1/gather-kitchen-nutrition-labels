'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Header from '@/components/Header'
import MobileRestrict from '@/components/MobileRestrict'
import Toast from '@/components/Toast'
import Modal from '@/components/Modal'
import IngredientSearch from '@/components/IngredientSearch'
import IngredientSpecificationModal from '@/components/IngredientSpecificationModal'
import BatchIngredientSpecificationModal from '@/components/BatchIngredientSpecificationModal'
import ParseIssuesPanel from '@/components/ParseIssuesPanel'
import PhotoAssistSlot from '@/components/PhotoAssistSlot'
import { SmartParseResult } from '@/lib/smartRecipeParser'
import { USDAFood } from '@/types/recipe'
import { cleanIngredientForUSDASearch } from '@/lib/smartRecipeParser'

// NOTE: This is the existing ReviewPage with PhotoAssist wiring added:
// - usdaSearchQuery state
// - PhotoAssistSlot under header
// - IngredientSearch initialQuery prefers usdaSearchQuery

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
  const [servingsPerContainer, setServingsPerContainer] = useState<number | 'other'>(1)
  const [otherServingsValue, setOtherServingsValue] = useState('')
  const [dishCategory, setDishCategory] = useState<string>('')
  const [dishName, setDishName] = useState<string>('')
  const [isEditingDishName, setIsEditingDishName] = useState(false)
  const [saveProgress, setSaveProgress] = useState('')
  const [autoSearching, setAutoSearching] = useState(false)
  const [searchProgress, setSearchProgress] = useState({ current: 0, total: 0 })
  const [hasAutoSearched, setHasAutoSearched] = useState(false)
  const [hasAutoSelectedServings, setHasAutoSelectedServings] = useState(false)
  const isNavigatingAway = useRef(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
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
  const [renameModal, setRenameModal] = useState<{
    isOpen: boolean
    suggestedName: string
    editableName: string
  }>({
    isOpen: false,
    suggestedName: '',
    editableName: ''
  })
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
  const [useBatchModal, setUseBatchModal] = useState(true)
  const [batchSpecificationModal, setBatchSpecificationModal] = useState<Array<{
    id: string
    quantity: number
    baseIngredient: string
    specificationPrompt: string
    specificationOptions: string[]
    type: 'final' | 'sub'
    subRecipeIndex?: number
    ingredientIndex: number
  }>>([])

  // NEW: Assisted USDA search query from Photo Assist
  const [usdaSearchQuery, setUsdaSearchQuery] = useState<string>('')

  // ... keep existing effects, logic, and JSX intact above and below ...

  // The return block below mirrors your current file, with PhotoAssistSlot and assisted query applied
  return (
    <MobileRestrict>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Review & Confirm</h1>
            <p className="text-gray-600 text-lg">Review the parsed recipe and confirm USDA matches for each ingredient</p>

            {/* Photo Assist: populate USDA search input from label photo */}
            <div className="mt-4 mb-6">
              <PhotoAssistSlot
                setSearch={(q: string) => {
                  setUsdaSearchQuery(q)
                  console.log('[PhotoAssist] USDA search suggestion set:', q)
                }}
              />
            </div>
          </div>

          {/* ...rest of your UI (unchanged) */}

          {/* USDA Search Modal */}
          {editingIngredient && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl p-8 max-w-6xl w-full h-[95vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Select USDA Match</h3>
                  <button onClick={() => setEditingIngredient(null)} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">×</button>
                </div>

                <IngredientSearch
                  onSelectIngredient={(food: USDAFood) => {
                    // existing handleSelectUSDA logic preserved via inline call
                    if (!editingIngredient) return
                    if (editingIngredient.type === 'final') {
                      const updated = [...finalDishIngredients]
                      updated[editingIngredient.ingredientIndex] = { ...updated[editingIngredient.ingredientIndex], usdaFood: food, confirmed: true }
                      setFinalDishIngredients(updated)
                    } else {
                      const updated = [...subRecipes]
                      updated[editingIngredient.subRecipeIndex!].ingredients[editingIngredient.ingredientIndex] = { ...updated[editingIngredient.subRecipeIndex!].ingredients[editingIngredient.ingredientIndex], usdaFood: food, confirmed: true }
                      setSubRecipes(updated)
                    }
                    setEditingIngredient(null)
                  }}
                  initialQuery={
                    usdaSearchQuery ||
                    (editingIngredient.type === 'final'
                      ? finalDishIngredients[editingIngredient.ingredientIndex].searchQuery
                      : subRecipes[editingIngredient.subRecipeIndex!].ingredients[editingIngredient.ingredientIndex].searchQuery)
                  }
                />
              </div>
            </div>
          )}

          {/* ...rest of your JSX unchanged (save progress, buttons, modals, etc.) */}
        </main>
      </div>

      {/* Existing modals and overlays (unchanged) */}
    </MobileRestrict>
  )
}
