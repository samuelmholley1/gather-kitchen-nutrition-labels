'use client'

import { useState } from 'react'
import { ReportIssueButton } from './ReportIssueButton'

interface CalculationProvenanceModalProps {
  isOpen: boolean
  onClose: () => void
  dishName: string
  calculationData: any
  isLoading?: boolean
}

interface IngredientBreakdown {
  rawInput: string
  canonical: string
  selectedUSDA: {
    fdcId: number
    description: string
    dataType: string
  }
  quantity?: number
  unit?: string
  per100g?: { kcal: number; carbs: number; protein: number; fat: number }
  scaled?: { kcal: number; carbs: number; protein: number; fat: number }
  yieldFactor?: number
}

interface NutritionValues {
  kcal: number
  carbs: number
  protein: number
  fat: number
}

export default function CalculationProvenanceModal({
  isOpen,
  onClose,
  dishName,
  calculationData,
  isLoading = false
}: CalculationProvenanceModalProps) {
  const [isReverting, setIsReverting] = useState(false)
  const [editingIngredient, setEditingIngredient] = useState<number | null>(null)
  const [editedQuantity, setEditedQuantity] = useState<string>('')
  const [editedUnit, setEditedUnit] = useState<string>('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editingTotals, setEditingTotals] = useState(false)
  const [editedTotals, setEditedTotals] = useState({ kcal: '', carbs: '', protein: '', fat: '' })
  const [editReason, setEditReason] = useState('')
  const [editingUSDA, setEditingUSDA] = useState<number | null>(null)
  const [usdaSearchQuery, setUsdaSearchQuery] = useState('')
  const [usdaSearchResults, setUsdaSearchResults] = useState<any[]>([])
  const [isSearchingUSDA, setIsSearchingUSDA] = useState(false)

  // Helper function to safely get nutrition values
  const safeNutrition = (nutrition: any): NutritionValues => ({
    kcal: nutrition?.kcal ?? 0,
    carbs: nutrition?.carbs ?? 0,
    protein: nutrition?.protein ?? 0,
    fat: nutrition?.fat ?? 0
  })

  // Show loading state if modal is open but no data yet
  if (isOpen && (isLoading || !calculationData)) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Loading Calculations</h3>
              <p className="text-sm text-gray-600 mt-2">Retrieving calculations may take a few moments...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!isOpen || !calculationData) return null

  const handleRevertToCalculated = async () => {
    if (!calculationData?.dishId) return

    setIsReverting(true)
    try {
      const response = await fetch(`/api/final-dishes/${calculationData.dishId}/revert-to-calculated`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'User chose to revert to calculated values from provenance modal'
        })
      })

      if (response.ok) {
        // Refresh the page to show updated values
        window.location.reload()
      } else {
        console.error('Failed to revert to calculated values')
        alert('Failed to revert to calculated values. Please try again.')
      }
    } catch (error) {
      console.error('Error reverting to calculated values:', error)
      alert('Error reverting to calculated values. Please try again.')
    } finally {
      setIsReverting(false)
    }
  }

  const handleEditIngredient = (index: number, quantity: number | undefined, unit: string | undefined) => {
    setEditingIngredient(index)
    setEditedQuantity(String(quantity || 0))
    setEditedUnit(unit || 'g')
  }

  const handleCancelEdit = () => {
    setEditingIngredient(null)
    setEditedQuantity('')
    setEditedUnit('')
  }

  const handleSaveIngredientEdit = async (index: number) => {
    if (!calculationData?.dishId || editingIngredient === null) return

    const newQuantity = parseFloat(editedQuantity)
    if (isNaN(newQuantity) || newQuantity <= 0) {
      alert('Please enter a valid positive quantity')
      return
    }

    setIsSavingEdit(true)
    try {
      // Update the component in Airtable
      const response = await fetch(`/api/final-dishes/${calculationData.dishId}/update-component`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          componentIndex: index,
          quantity: newQuantity,
          unit: editedUnit,
          reason: `Updated ${ingredients[index].canonical} from ${ingredients[index].quantity}${ingredients[index].unit} to ${newQuantity}${editedUnit}`
        })
      })

      if (response.ok) {
        // Refresh the page to show updated calculations
        window.location.reload()
      } else {
        console.error('Failed to save ingredient edit')
        alert('Failed to save ingredient edit. Please try again.')
      }
    } catch (error) {
      console.error('Error saving ingredient edit:', error)
      alert('Error saving ingredient edit. Please try again.')
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleEditTotals = (nutrition: NutritionValues) => {
    setEditingTotals(true)
    setEditedTotals({
      kcal: String(nutrition.kcal),
      carbs: String(nutrition.carbs),
      protein: String(nutrition.protein),
      fat: String(nutrition.fat)
    })
    setEditReason('')
  }

  const handleCancelTotalsEdit = () => {
    setEditingTotals(false)
    setEditedTotals({ kcal: '', carbs: '', protein: '', fat: '' })
    setEditReason('')
  }

  const handleSaveTotalsEdit = async () => {
    if (!calculationData?.dishId) return
    if (!editReason.trim()) {
      alert('Please provide a reason for the manual edit')
      return
    }

    const newKcal = parseFloat(editedTotals.kcal)
    const newCarbs = parseFloat(editedTotals.carbs)
    const newProtein = parseFloat(editedTotals.protein)
    const newFat = parseFloat(editedTotals.fat)

    if (isNaN(newKcal) || isNaN(newCarbs) || isNaN(newProtein) || isNaN(newFat)) {
      alert('Please enter valid numbers for all nutrition fields')
      return
    }

    setIsSavingEdit(true)
    try {
      const response = await fetch(`/api/final-dishes/${calculationData.dishId}/manual-override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overrides: {
            calories: String(newKcal),
            totalCarbohydrate: String(newCarbs),
            protein: String(newProtein),
            totalFat: String(newFat)
          },
          reason: editReason.trim()
        })
      })

      if (response.ok) {
        window.location.reload()
      } else {
        console.error('Failed to save totals edit')
        alert('Failed to save totals edit. Please try again.')
      }
    } catch (error) {
      console.error('Error saving totals edit:', error)
      alert('Error saving totals edit. Please try again.')
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleEditUSDA = (index: number, currentName: string) => {
    setEditingUSDA(index)
    setUsdaSearchQuery(currentName)
    setUsdaSearchResults([])
  }

  const handleCancelUSDAEdit = () => {
    setEditingUSDA(null)
    setUsdaSearchQuery('')
    setUsdaSearchResults([])
  }

  const handleSearchUSDA = async () => {
    if (!usdaSearchQuery.trim()) return

    setIsSearchingUSDA(true)
    try {
      const response = await fetch(`/api/usda/search?q=${encodeURIComponent(usdaSearchQuery)}`)
      if (response.ok) {
        const data = await response.json()
        setUsdaSearchResults(data.foods || [])
      } else {
        alert('Failed to search USDA database')
      }
    } catch (error) {
      console.error('USDA search error:', error)
      alert('Error searching USDA database')
    } finally {
      setIsSearchingUSDA(false)
    }
  }

  const handleSelectUSDA = async (index: number, food: any) => {
    if (!calculationData?.dishId) return

    const reason = window.prompt(
      `Changing from "${ingredients[index].selectedUSDA?.description}" to "${food.description}"\n\nReason for change:`
    )
    
    if (!reason?.trim()) {
      alert('Reason is required to change USDA match')
      return
    }

    setIsSavingEdit(true)
    try {
      const response = await fetch(`/api/final-dishes/${calculationData.dishId}/update-usda-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          componentIndex: index,
          fdcId: food.fdcId,
          name: food.description,
          dataType: food.dataType,
          reason: reason.trim()
        })
      })

      if (response.ok) {
        window.location.reload()
      } else {
        console.error('Failed to update USDA match')
        alert('Failed to update USDA match. Please try again.')
      }
    } catch (error) {
      console.error('Error updating USDA match:', error)
      alert('Error updating USDA match. Please try again.')
    } finally {
      setIsSavingEdit(false)
    }
  }

  if (!isOpen || !calculationData) return null

  const ingredients: IngredientBreakdown[] = calculationData.ingredients || []
  const servingsPerContainer = calculationData.servingsPerContainer || 1
  
  // Calculate running totals (per entire recipe)
  const runningTotals: NutritionValues[] = []
  let cumulative: NutritionValues = { kcal: 0, carbs: 0, protein: 0, fat: 0 }
  
  ingredients.forEach((ing) => {
    const scaled = safeNutrition(ing.scaled)
    cumulative = {
      kcal: cumulative.kcal + scaled.kcal,
      carbs: cumulative.carbs + scaled.carbs,
      protein: cumulative.protein + scaled.protein,
      fat: cumulative.fat + scaled.fat
    }
    runningTotals.push({ ...cumulative })
  })

  // Use cumulative total (sum of all ingredients) as final total
  // If finalNutrition exists from backend, we can compare them
  const calculatedTotal = cumulative
  
  // Divide by servings to get per-serving values
  const divideByServings = (nutrition: NutritionValues): NutritionValues => ({
    kcal: nutrition.kcal / servingsPerContainer,
    carbs: nutrition.carbs / servingsPerContainer,
    protein: nutrition.protein / servingsPerContainer,
    fat: nutrition.fat / servingsPerContainer
  })
  
  // Handle new audit trail format
  const nutritionData = calculationData.finalNutrition
  const storedNutrition = nutritionData?.values ? safeNutrition(nutritionData.values) : null
  const calculatedNutrition = nutritionData?.calculatedValues ? safeNutrition(nutritionData.calculatedValues) : calculatedTotal
  const hasManualOverride = nutritionData?.source === 'manual_override'
  const editMetadata = nutritionData?.manualEditMetadata
  
  // Check if there's a discrepancy between calculated and displayed values
  const hasMismatch = storedNutrition && (
    Math.abs(calculatedNutrition.kcal - storedNutrition.kcal) > Math.max(1, storedNutrition.kcal * 0.01) ||
    Math.abs(calculatedNutrition.carbs - storedNutrition.carbs) > Math.max(1, storedNutrition.carbs * 0.01) ||
    Math.abs(calculatedNutrition.protein - storedNutrition.protein) > Math.max(1, storedNutrition.protein * 0.01) ||
    Math.abs(calculatedNutrition.fat - storedNutrition.fat) > Math.max(1, storedNutrition.fat * 0.01)
  )
  
  const finalNutrition = storedNutrition || calculatedTotal
  const finalNutritionPerServing = divideByServings(finalNutrition)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            Calculations: {dishName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(95vh-140px)]">
          {ingredients.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-2">No ingredients found</p>
              <p className="text-gray-400 text-sm">This dish may not have any USDA-matched ingredients to analyze.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left p-3 font-semibold text-gray-700 bg-gray-50">Ingredient + Quantity</th>
                    <th className="text-left p-3 font-semibold text-gray-700 bg-gray-50">Per 100g</th>
                    <th className="text-left p-3 font-semibold text-gray-700 bg-gray-50">
                      Per Serving
                      <div className="text-xs font-normal text-gray-500">({servingsPerContainer} servings total)</div>
                    </th>
                    <th className="text-left p-3 font-semibold text-gray-700 bg-gray-50">Running Total<br/><span className="text-xs font-normal text-gray-500">(per serving)</span></th>
                    <th className="text-center p-3 font-semibold text-gray-700 bg-gray-50">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((ingredient, index) => {
                    const per100g = safeNutrition(ingredient.per100g)
                    const scaled = safeNutrition(ingredient.scaled)
                    const scaledPerServing = divideByServings(scaled)
                    const running = runningTotals[index] || { kcal: 0, carbs: 0, protein: 0, fat: 0 }
                    const runningPerServing = divideByServings(running)

                    const laypersonSummary = `• You entered: "${ingredient.rawInput}"
• Source: "USDA ${ingredient.selectedUSDA?.dataType || 'Unknown'} / FDC ${ingredient.selectedUSDA?.fdcId || 'N/A'}"
• Conversions used: 1 cup = 125 g → scaled to ${ingredient.quantity || 100} g
• Per 100 g: kcal=${per100g.kcal}, carbs=${per100g.carbs}g, protein=${per100g.protein}g, fat=${per100g.fat}g
• Scaled to ${ingredient.quantity || 100} g: kcal=${scaled.kcal}, carbs=${scaled.carbs}g, protein=${scaled.protein}g, fat=${scaled.fat}g
• Yield/Waste factor: ${ingredient.yieldFactor || 1.0}`

                    return (
                      <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                        {/* Column 1: Ingredient + Quantity */}
                        <td className="p-3 align-top">
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{ingredient.canonical || 'Unknown ingredient'}</div>
                              <div className="text-sm text-gray-600 mt-1">
                                {editingIngredient === index ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={editedQuantity}
                                      onChange={(e) => setEditedQuantity(e.target.value)}
                                      className="w-20 px-2 py-1 border border-blue-500 rounded focus:ring-2 focus:ring-blue-300"
                                      autoFocus
                                    />
                                    <input
                                      type="text"
                                      value={editedUnit}
                                      onChange={(e) => setEditedUnit(e.target.value)}
                                      className="w-16 px-2 py-1 border border-blue-500 rounded focus:ring-2 focus:ring-blue-300"
                                      placeholder="unit"
                                    />
                                    <button
                                      onClick={() => handleSaveIngredientEdit(index)}
                                      disabled={isSavingEdit}
                                      className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                                    >
                                      {isSavingEdit ? '...' : '✓'}
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span>{ingredient.quantity || 0} {ingredient.unit || 'g'}</span>
                                    <button
                                      onClick={() => handleEditIngredient(index, ingredient.quantity, ingredient.unit)}
                                      className="text-blue-600 hover:text-blue-800"
                                      title="Edit quantity/unit"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                      </svg>
                                    </button>
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                <span>USDA {ingredient.selectedUSDA?.dataType || 'Unknown'} • FDC {ingredient.selectedUSDA?.fdcId || 'N/A'}</span>
                                {editingUSDA !== index && (
                                  <button
                                    onClick={() => handleEditUSDA(index, ingredient.canonical || '')}
                                    className="text-blue-600 hover:text-blue-800"
                                    title="Change USDA match"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                              {editingUSDA === index && (
                                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                                  <div className="text-xs font-semibold text-gray-700 mb-2">Change USDA Match:</div>
                                  <div className="flex gap-2 mb-2">
                                    <input
                                      type="text"
                                      value={usdaSearchQuery}
                                      onChange={(e) => setUsdaSearchQuery(e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && handleSearchUSDA()}
                                      placeholder="Search USDA database..."
                                      className="flex-1 px-2 py-1 border border-blue-300 rounded text-sm"
                                    />
                                    <button
                                      onClick={handleSearchUSDA}
                                      disabled={isSearchingUSDA}
                                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                                    >
                                      {isSearchingUSDA ? '...' : 'Search'}
                                    </button>
                                    <button
                                      onClick={handleCancelUSDAEdit}
                                      className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                  {usdaSearchResults.length > 0 && (
                                    <div className="max-h-48 overflow-y-auto border border-blue-200 rounded">
                                      {usdaSearchResults.slice(0, 10).map((food, idx) => (
                                        <button
                                          key={idx}
                                          onClick={() => handleSelectUSDA(index, food)}
                                          className="w-full text-left px-2 py-2 hover:bg-blue-100 border-b border-blue-100 last:border-b-0"
                                        >
                                          <div className="text-xs font-medium text-gray-900">{food.description}</div>
                                          <div className="text-xs text-gray-600">
                                            {food.dataType} • FDC {food.fdcId}
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  {usdaSearchResults.length === 0 && usdaSearchQuery && !isSearchingUSDA && (
                                    <div className="text-xs text-gray-500 mt-2">No results found. Try a different search.</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Column 2: Per 100g */}
                        <td className="p-3 align-top">
                          <div className="text-sm space-y-1">
                            <div><span className="font-medium">Kcal:</span> {per100g.kcal.toFixed(1)}</div>
                            <div><span className="font-medium">Carbs:</span> {per100g.carbs.toFixed(1)}g</div>
                            <div><span className="font-medium">Protein:</span> {per100g.protein.toFixed(1)}g</div>
                            <div><span className="font-medium">Fat:</span> {per100g.fat.toFixed(1)}g</div>
                          </div>
                        </td>

                        {/* Column 3: Scaled Nutrition (Per Serving) */}
                        <td className="p-3 align-top">
                          <div className="text-sm space-y-1 font-medium text-emerald-700">
                            <div>{scaledPerServing.kcal.toFixed(1)} kcal</div>
                            <div>{scaledPerServing.carbs.toFixed(1)}g carbs</div>
                            <div>{scaledPerServing.protein.toFixed(1)}g protein</div>
                            <div>{scaledPerServing.fat.toFixed(1)}g fat</div>
                          </div>
                        </td>

                        {/* Column 4: Running Total (Per Serving) */}
                        <td className="p-3 align-top">
                          <div className="text-sm space-y-1 font-semibold text-blue-700">
                            <div>{runningPerServing.kcal.toFixed(1)} kcal</div>
                            <div>{runningPerServing.carbs.toFixed(1)}g carbs</div>
                            <div>{runningPerServing.protein.toFixed(1)}g protein</div>
                            <div>{runningPerServing.fat.toFixed(1)}g fat</div>
                          </div>
                        </td>

                        {/* Column 5: Actions */}
                        <td className="p-3 align-top text-center">
                          <ReportIssueButton
                            recipeId={calculationData.dishId || 'unknown'}
                            recipeName={dishName}
                            version="1.0"
                            context="ingredient"
                            preselectedIngredient={{
                              id: `ing-${index}`,
                              name: ingredient.canonical,
                              quantity: ingredient.quantity || 100,
                              units: ingredient.unit || 'g'
                            }}
                            breakdownSnapshot={calculationData}
                            totals={finalNutrition}
                            laypersonSummary={laypersonSummary}
                            buttonText="Report"
                            buttonClassName="rounded-full px-3 py-1 text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                            onReportSubmitted={(reportId) => {
                              console.log('Report submitted:', reportId)
                            }}
                          />
                        </td>
                      </tr>
                    )
                  })}

                  {/* Final Totals Row */}
                  <tr className="border-t-2 border-gray-400 bg-blue-50">
                    <td className="p-4 font-bold text-gray-900">
                      FINAL PER SERVING
                      <div className="text-xs font-normal text-gray-500">({servingsPerContainer} servings)</div>
                    </td>
                    <td className="p-4 text-sm text-gray-500">—</td>
                    <td className="p-4 text-sm text-gray-500">—</td>
                    <td className="p-4">
                      {editingTotals ? (
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-gray-700 mb-2">Edit Final Totals:</div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <label className="flex items-center gap-1">
                              <span className="text-xs">Kcal:</span>
                              <input
                                type="number"
                                step="0.1"
                                value={editedTotals.kcal}
                                onChange={(e) => setEditedTotals({ ...editedTotals, kcal: e.target.value })}
                                className="w-20 px-2 py-1 border border-blue-500 rounded text-sm"
                              />
                            </label>
                            <label className="flex items-center gap-1">
                              <span className="text-xs">Carbs:</span>
                              <input
                                type="number"
                                step="0.1"
                                value={editedTotals.carbs}
                                onChange={(e) => setEditedTotals({ ...editedTotals, carbs: e.target.value })}
                                className="w-20 px-2 py-1 border border-blue-500 rounded text-sm"
                              />
                              <span className="text-xs">g</span>
                            </label>
                            <label className="flex items-center gap-1">
                              <span className="text-xs">Protein:</span>
                              <input
                                type="number"
                                step="0.1"
                                value={editedTotals.protein}
                                onChange={(e) => setEditedTotals({ ...editedTotals, protein: e.target.value })}
                                className="w-20 px-2 py-1 border border-blue-500 rounded text-sm"
                              />
                              <span className="text-xs">g</span>
                            </label>
                            <label className="flex items-center gap-1">
                              <span className="text-xs">Fat:</span>
                              <input
                                type="number"
                                step="0.1"
                                value={editedTotals.fat}
                                onChange={(e) => setEditedTotals({ ...editedTotals, fat: e.target.value })}
                                className="w-20 px-2 py-1 border border-blue-500 rounded text-sm"
                              />
                              <span className="text-xs">g</span>
                            </label>
                          </div>
                          <input
                            type="text"
                            placeholder="Reason for manual edit (required)"
                            value={editReason}
                            onChange={(e) => setEditReason(e.target.value)}
                            className="w-full px-2 py-1 border border-blue-500 rounded text-sm"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveTotalsEdit}
                              disabled={isSavingEdit || !editReason.trim()}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isSavingEdit ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                              onClick={handleCancelTotalsEdit}
                              className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="text-sm space-y-1 font-bold text-blue-900 flex-1">
                              <div>{finalNutritionPerServing.kcal.toFixed(1)} kcal</div>
                              <div>{finalNutritionPerServing.carbs.toFixed(1)}g carbs</div>
                              <div>{finalNutritionPerServing.protein.toFixed(1)}g protein</div>
                              <div>{finalNutritionPerServing.fat.toFixed(1)}g fat</div>
                            </div>
                            <button
                              onClick={() => handleEditTotals(finalNutritionPerServing)}
                              className="text-blue-600 hover:text-blue-800 self-start"
                              title="Edit final totals"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Show warning if mismatch detected */}
                      {!editingTotals && hasMismatch && storedNutrition && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
                          <div className="font-semibold text-yellow-900 mb-2">⚠️ Discrepancy Detected</div>
                          <div className="text-yellow-800 mb-3">
                            Stored label values differ from calculated totals. This may indicate manual edits or a calculation error.
                          </div>
                          
                          {hasManualOverride && editMetadata && (
                            <div className="mb-3 p-2 bg-yellow-100 rounded">
                              <div className="font-medium text-yellow-900">Manual Edit Details:</div>
                              <div className="text-yellow-800 text-xs mt-1">
                                Edited on {new Date(editMetadata.timestamp).toLocaleDateString()} by {editMetadata.editedBy || 'Unknown'}
                                <br />
                                Fields changed: {editMetadata.editedFields.join(', ')}
                                <br />
                                Reason: {editMetadata.reason}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex gap-2 mb-2">
                            <button 
                              onClick={handleRevertToCalculated}
                              disabled={isReverting}
                              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isReverting ? 'Reverting...' : 'Use Calculated Values'}
                            </button>
                            <button className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700">
                              Keep Manual Override
                            </button>
                          </div>
                          
                          <details>
                            <summary className="cursor-pointer text-yellow-700 hover:text-yellow-900 font-medium">View comparison</summary>
                            <div className="mt-2 grid grid-cols-2 gap-4 text-yellow-800">
                              <div>
                                <div className="font-medium mb-1">Calculated Values:</div>
                                <div>{calculatedNutrition.kcal.toFixed(1)} kcal</div>
                                <div>{calculatedNutrition.carbs.toFixed(1)}g carbs</div>
                                <div>{calculatedNutrition.protein.toFixed(1)}g protein</div>
                                <div>{calculatedNutrition.fat.toFixed(1)}g fat</div>
                              </div>
                              <div>
                                <div className="font-medium mb-1">Stored Values:</div>
                                <div>{storedNutrition.kcal.toFixed(1)} kcal</div>
                                <div>{storedNutrition.carbs.toFixed(1)}g carbs</div>
                                <div>{storedNutrition.protein.toFixed(1)}g protein</div>
                                <div>{storedNutrition.fat.toFixed(1)}g fat</div>
                              </div>
                            </div>
                          </details>
                        </div>
                      )}
                    </td>
                    <td className="p-4"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}