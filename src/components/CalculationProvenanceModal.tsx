'use client'

import { useState } from 'react'
import { ReportIssueButton } from './ReportIssueButton'

interface CalculationProvenanceModalProps {
  isOpen: boolean
  onClose: () => void
  dishName: string
  calculationData: any
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
  calculationData
}: CalculationProvenanceModalProps) {
  const [isReverting, setIsReverting] = useState(false)

  // Helper function to safely get nutrition values
  const safeNutrition = (nutrition: any): NutritionValues => ({
    kcal: nutrition?.kcal ?? 0,
    carbs: nutrition?.carbs ?? 0,
    protein: nutrition?.protein ?? 0,
    fat: nutrition?.fat ?? 0
  })

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

  if (!isOpen || !calculationData) return null

  const ingredients: IngredientBreakdown[] = calculationData.ingredients || []
  
  // Calculate running totals
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
                    <th className="text-left p-3 font-semibold text-gray-700 bg-gray-50">Scaled Nutrition</th>
                    <th className="text-left p-3 font-semibold text-gray-700 bg-gray-50">Running Total</th>
                    <th className="text-center p-3 font-semibold text-gray-700 bg-gray-50">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((ingredient, index) => {
                    const per100g = safeNutrition(ingredient.per100g)
                    const scaled = safeNutrition(ingredient.scaled)
                    const running = runningTotals[index] || { kcal: 0, carbs: 0, protein: 0, fat: 0 }

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
                          <div className="font-medium text-gray-900">{ingredient.canonical || 'Unknown ingredient'}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {ingredient.quantity || 0} {ingredient.unit || 'g'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            USDA {ingredient.selectedUSDA?.dataType || 'Unknown'} • FDC {ingredient.selectedUSDA?.fdcId || 'N/A'}
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

                        {/* Column 3: Scaled Nutrition */}
                        <td className="p-3 align-top">
                          <div className="text-sm space-y-1 font-medium text-emerald-700">
                            <div>{scaled.kcal.toFixed(1)} kcal</div>
                            <div>{scaled.carbs.toFixed(1)}g carbs</div>
                            <div>{scaled.protein.toFixed(1)}g protein</div>
                            <div>{scaled.fat.toFixed(1)}g fat</div>
                          </div>
                        </td>

                        {/* Column 4: Running Total */}
                        <td className="p-3 align-top">
                          <div className="text-sm space-y-1 font-semibold text-blue-700">
                            <div>{running.kcal.toFixed(1)} kcal</div>
                            <div>{running.carbs.toFixed(1)}g carbs</div>
                            <div>{running.protein.toFixed(1)}g protein</div>
                            <div>{running.fat.toFixed(1)}g fat</div>
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
                    <td className="p-4 font-bold text-gray-900">FINAL DISH TOTAL</td>
                    <td className="p-4 text-sm text-gray-500">—</td>
                    <td className="p-4 text-sm text-gray-500">—</td>
                    <td className="p-4">
                      <div className="text-sm space-y-1 font-bold text-blue-900">
                        <div>{finalNutrition.kcal.toFixed(1)} kcal</div>
                        <div>{finalNutrition.carbs.toFixed(1)}g carbs</div>
                        <div>{finalNutrition.protein.toFixed(1)}g protein</div>
                        <div>{finalNutrition.fat.toFixed(1)}g fat</div>
                      </div>
                      
                      {/* Show warning if mismatch detected */}
                      {hasMismatch && storedNutrition && (
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