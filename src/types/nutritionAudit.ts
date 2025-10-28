/**
 * Types for nutrition label audit trail and version control
 * 
 * Enterprise-grade tracking of manual edits vs calculated values
 * for compliance, transparency, and data integrity.
 * 
 * IMPLEMENTATION NOTE: All this data is stored in the existing 
 * NutritionProfile JSON field in Airtable - NO SCHEMA CHANGES NEEDED!
 * 
 * Structure in Airtable:
 * NutritionProfile: {
 *   values: { kcal: 385, carbs: 76, ... },          // Displayed on label
 *   source: 'calculated',                            // or 'manual_override'
 *   calculatedValues: { kcal: 380, carbs: 75, ... }, // Auto-calculated
 *   lastCalculated: '2025-10-27T12:00:00Z',
 *   manualEditMetadata?: { ... }                     // If manually edited
 * }
 * 
 * Backwards compatible: Old records with just { kcal, carbs, ... } 
 * are treated as calculated values.
 */

export type NutritionSource = 'calculated' | 'manual_override'

export interface NutritionValues {
  kcal: number
  carbs: number
  protein: number
  fat: number
  saturatedFat?: number
  transFat?: number
  cholesterol?: number
  sodium?: number
  fiber?: number
  sugars?: number
  addedSugars?: number
  vitaminD?: number
  calcium?: number
  iron?: number
  potassium?: number
}

export interface ManualEditMetadata {
  timestamp: string // ISO 8601 format
  editedBy?: string // User ID or email (future: add auth)
  reason: string // Required explanation for override
  editedFields: string[] // e.g., ['kcal', 'protein']
  previousValues?: Partial<NutritionValues> // Values before edit
}

export interface NutritionLabelData {
  // What's displayed on the label (may be manual or calculated)
  values: NutritionValues
  
  // Always auto-calculated from ingredients, never manually edited
  calculatedValues: NutritionValues
  
  // Source of the displayed values
  source: NutritionSource
  
  // When calculated values were last computed
  lastCalculated: string // ISO 8601
  
  // If source is 'manual_override', this contains edit details
  manualEditMetadata?: ManualEditMetadata
}

/**
 * Helper to normalize nutrition profile data
 * Handles both new format (with metadata) and legacy format (just values)
 */
export function normalizeNutritionProfile(data: any): NutritionLabelData {
  // New format: has 'values' property
  if (data && typeof data === 'object' && 'values' in data) {
    return {
      values: data.values || {},
      calculatedValues: data.calculatedValues || data.values || {},
      source: data.source || 'calculated',
      lastCalculated: data.lastCalculated || new Date().toISOString(),
      manualEditMetadata: data.manualEditMetadata
    }
  }
  
  // Legacy format: just nutrition values directly
  // Treat as calculated values
  const nutritionValues = data || {}
  return {
    values: nutritionValues,
    calculatedValues: nutritionValues,
    source: 'calculated',
    lastCalculated: new Date().toISOString()
  }
}

export interface NutritionDiscrepancy {
  field: string
  calculated: number
  displayed: number
  difference: number
  percentDiff: number
  exceedsTolerance: boolean
}

/**
 * Calculate discrepancies between calculated and displayed nutrition values
 * @param calculated Auto-calculated values from ingredients
 * @param displayed Values shown on the label (may be manual)
 * @param tolerancePercent Threshold for significant difference (default 1%)
 * @returns Array of discrepancies
 */
export function findNutritionDiscrepancies(
  calculated: NutritionValues,
  displayed: NutritionValues,
  tolerancePercent: number = 1
): NutritionDiscrepancy[] {
  const discrepancies: NutritionDiscrepancy[] = []
  
  const fields = Object.keys(calculated) as Array<keyof NutritionValues>
  
  for (const field of fields) {
    const calcValue = calculated[field] || 0
    const dispValue = displayed[field] || 0
    
    if (calcValue === 0 && dispValue === 0) continue
    
    const diff = Math.abs(dispValue - calcValue)
    const percentDiff = calcValue > 0 ? (diff / calcValue) * 100 : 0
    const tolerance = Math.max(1, calcValue * (tolerancePercent / 100))
    
    if (diff > tolerance) {
      discrepancies.push({
        field,
        calculated: calcValue,
        displayed: dispValue,
        difference: diff,
        percentDiff,
        exceedsTolerance: true
      })
    }
  }
  
  return discrepancies
}

/**
 * Format nutrition field name for display
 */
export function formatNutritionFieldName(field: string): string {
  const nameMap: Record<string, string> = {
    kcal: 'Calories',
    carbs: 'Carbohydrates',
    protein: 'Protein',
    fat: 'Total Fat',
    saturatedFat: 'Saturated Fat',
    transFat: 'Trans Fat',
    cholesterol: 'Cholesterol',
    sodium: 'Sodium',
    fiber: 'Dietary Fiber',
    sugars: 'Total Sugars',
    addedSugars: 'Added Sugars',
    vitaminD: 'Vitamin D',
    calcium: 'Calcium',
    iron: 'Iron',
    potassium: 'Potassium'
  }
  
  return nameMap[field] || field
}
