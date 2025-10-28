'use client'

import { useState } from 'react'
import { ReportIssueButton } from './ReportIssueButton'

interface CalculationProvenanceModalProps {
  isOpen: boolean
  onClose: () => void
  dishName: string
  calculationData: any // Will be expanded with proper typing
}

interface IngredientBreakdown {
  rawInput: string
  canonical: string  // Just the base string, not an object
  selectedUSDA: {
    fdcId: number
    description: string
    dataType: string
  }
  scoreBreakdown: {
    baseType: 'all_purpose' | 'specialty' | 'unknown'
    positives: string[]
    negatives: string[]
    tiers: Array<{name: string; delta: number}>
    finalScore: number
  }
  quantity?: number
  unit?: string
  per100g?: { kcal: number; carbs: number; protein: number; fat: number }
  scaled?: { kcal: number; carbs: number; protein: number; fat: number }
  yieldFactor?: number
}

interface DataUsed {
  field: string
  value: number
  unit: string
  source: string
}

interface MathStep {
  description: string
  formula: string
  result: string
}

export default function CalculationProvenanceModal({
  isOpen,
  onClose,
  dishName,
  calculationData
}: CalculationProvenanceModalProps) {
  const [activeTab, setActiveTab] = useState<'ingredients' | 'data' | 'math'>('ingredients')

  if (!isOpen || !calculationData) return null

  const copyToClipboard = async (data: any) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      alert('Details copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            Calculation Provenance: {dishName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('ingredients')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'ingredients'
                ? 'border-b-2 border-emerald-500 text-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Ingredient Breakdown
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'data'
                ? 'border-b-2 border-emerald-500 text-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Data Used
          </button>
          <button
            onClick={() => setActiveTab('math')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'math'
                ? 'border-b-2 border-emerald-500 text-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Math Chain
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(95vh-200px)]">
          {activeTab === 'ingredients' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Per-Ingredient Analysis</h3>
                <button
                  onClick={() => copyToClipboard(calculationData)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Copy Details
                </button>
              </div>

              {!calculationData.ingredients || calculationData.ingredients.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg mb-2">No ingredients found</p>
                  <p className="text-gray-400 text-sm">This dish may not have any USDA-matched ingredients to analyze.</p>
                </div>
              ) : (
                <>
              {calculationData.ingredients?.map((ingredient: IngredientBreakdown, index: number) => {
                // Generate layperson summary
                const laypersonSummary = `• You entered: "${ingredient.rawInput}"
• Source: "USDA ${ingredient.selectedUSDA.dataType} / FDC ${ingredient.selectedUSDA.fdcId}"
• Conversions used: 1 cup = 125 g → scaled to ${ingredient.quantity || 100} g
• Per 100 g: kcal=${ingredient.per100g?.kcal || 0}, carbs=${ingredient.per100g?.carbs || 0}g, protein=${ingredient.per100g?.protein || 0}g, fat=${ingredient.per100g?.fat || 0}g
• Scaled to ${ingredient.quantity || 100} g: kcal=${ingredient.scaled?.kcal || 0}, carbs=${ingredient.scaled?.carbs || 0}g, protein=${ingredient.scaled?.protein || 0}g, fat=${ingredient.scaled?.fat || 0}g
• Yield/Waste factor: ${ingredient.yieldFactor || 1.0}`;

                return (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-medium text-gray-900">Ingredient {index + 1}</h4>
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
                      totals={calculationData.finalNutrition || {}}
                      laypersonSummary={laypersonSummary}
                      buttonText="Report issue"
                      buttonClassName="rounded-full px-3 py-1 text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                      onReportSubmitted={(reportId) => {
                        console.log('Report submitted:', reportId);
                      }}
                    />
                  </div>

                  {/* Layperson Breakdown */}
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h5 className="font-medium text-blue-900 mb-2 text-sm">Plain-English Summary</h5>
                    <ul className="space-y-1 text-sm text-blue-800">
                      <li>• You entered: <span className="font-mono text-xs">"{ingredient.rawInput}"</span></li>
                      <li>• Source: USDA {ingredient.selectedUSDA.dataType} / FDC {ingredient.selectedUSDA.fdcId}</li>
                      <li>• Conversions used: 1 cup = 125 g → scaled to {ingredient.quantity || 100} g</li>
                      <li>• Per 100 g: kcal={ingredient.per100g?.kcal || 0}, carbs={ingredient.per100g?.carbs || 0}g, protein={ingredient.per100g?.protein || 0}g, fat={ingredient.per100g?.fat || 0}g</li>
                      <li>• Scaled to {ingredient.quantity || 100} g: kcal={ingredient.scaled?.kcal || 0}, carbs={ingredient.scaled?.carbs || 0}g, protein={ingredient.scaled?.protein || 0}g, fat={ingredient.scaled?.fat || 0}g</li>
                      <li>• Yield/Waste factor: {ingredient.yieldFactor || 1.0}</li>
                    </ul>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Input Processing</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Raw Input:</span>
                          <code className="ml-2 bg-gray-100 px-2 py-1 rounded text-xs">
                            {ingredient.rawInput}
                          </code>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Canonical Base:</span>
                          <code className="ml-2 bg-blue-100 px-2 py-1 rounded text-xs">
                            {ingredient.canonical}
                          </code>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">USDA Selection</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">FDC ID:</span>
                          <span className="ml-2 text-emerald-600 font-mono">
                            {ingredient.selectedUSDA.fdcId}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Description:</span>
                          <span className="ml-2 text-gray-800">
                            {ingredient.selectedUSDA.description}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Data Type:</span>
                          <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                            ingredient.selectedUSDA.dataType === 'Foundation'
                              ? 'bg-green-100 text-green-800'
                              : ingredient.selectedUSDA.dataType === 'SR Legacy'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {ingredient.selectedUSDA.dataType}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-2">Scoring Breakdown</h4>
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Base Type:</span>
                        <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                          ingredient.scoreBreakdown.baseType === 'all_purpose'
                            ? 'bg-green-100 text-green-800'
                            : ingredient.scoreBreakdown.baseType === 'specialty'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {ingredient.scoreBreakdown.baseType}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Final Score:</span>
                        <span className="ml-2 font-mono text-lg font-bold text-emerald-600">
                          {ingredient.scoreBreakdown.finalScore}
                        </span>
                      </div>
                      <div>
                        <button className="text-sm text-blue-600 hover:text-blue-800 underline">
                          Choose Different Match
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid md:grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium text-green-700 text-sm">Positives:</span>
                        <ul className="mt-1 space-y-1">
                          {ingredient.scoreBreakdown.positives.map((pos, i) => (
                            <li key={i} className="text-xs text-green-600 flex items-center">
                              <span className="w-1 h-1 bg-green-500 rounded-full mr-2"></span>
                              {pos}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="font-medium text-red-700 text-sm">Negatives:</span>
                        <ul className="mt-1 space-y-1">
                          {ingredient.scoreBreakdown.negatives.map((neg, i) => (
                            <li key={i} className="text-xs text-red-600 flex items-center">
                              <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                              {neg}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-3">
                      <span className="font-medium text-gray-700 text-sm">Score Tiers:</span>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {ingredient.scoreBreakdown.tiers.map((tier, i) => (
                          <span
                            key={i}
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              tier.delta > 0 ? 'bg-green-100 text-green-800' :
                              tier.delta < 0 ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {tier.name}: {tier.delta > 0 ? '+' : ''}{tier.delta}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
              })}
              </>
              )}
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Data Sources Used</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Field</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Value</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Unit</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {calculationData.dataUsed?.map((data: DataUsed, index: number) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">{data.field}</td>
                        <td className="px-4 py-2 text-sm font-mono text-gray-900">{data.value}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{data.unit}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{data.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'math' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Calculation Chain</h3>
              <div className="space-y-3">
                {calculationData.mathChain?.map((step: MathStep, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-gray-700 mb-2">{step.description}</p>
                        <code className="text-sm bg-gray-100 px-3 py-2 rounded block font-mono">
                          {step.formula}
                        </code>
                      </div>
                      <div className="ml-4 text-right">
                        <span className="text-lg font-bold text-emerald-600">
                          {step.result}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Route Stamp</h4>
                <div className="text-sm text-blue-800 font-mono">
                  <div>Route: {calculationData._stamp?.routeId}</div>
                  <div>SHA: {calculationData._stamp?.sha?.substring(0, 8)}</div>
                  <div>Timestamp: {calculationData._stamp?.timestamp}</div>
                  <div>Yield Multiplier: {calculationData.yieldMultiplier}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}