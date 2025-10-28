/**
 * Nutrition Label Audit Trail Utilities
 * 
 * Helper functions for managing nutrition label versioning,
 * manual edits, and audit trails without Airtable schema changes.
 */

import type {
  NutritionValues,
  NutritionLabelData,
  ManualEditMetadata,
  NutritionSource
} from '@/types/nutritionAudit'

/**
 * Create a new nutrition label data structure from calculated values
 */
export function createNutritionLabelData(
  calculatedValues: NutritionValues
): NutritionLabelData {
  return {
    values: calculatedValues,
    calculatedValues: calculatedValues,
    source: 'calculated',
    lastCalculated: new Date().toISOString()
  }
}

/**
 * Apply manual override to nutrition label
 * Creates audit trail and preserves calculated values
 */
export function applyManualOverride(
  currentData: NutritionLabelData,
  newValues: Partial<NutritionValues>,
  reason: string,
  editedBy?: string
): NutritionLabelData {
  // Determine which fields were edited
  const editedFields: string[] = []
  const previousValues: Partial<NutritionValues> = {}
  
  for (const key of Object.keys(newValues) as Array<keyof NutritionValues>) {
    if (newValues[key] !== undefined && newValues[key] !== currentData.values[key]) {
      editedFields.push(key)
      previousValues[key] = currentData.values[key]
    }
  }
  
  const metadata: ManualEditMetadata = {
    timestamp: new Date().toISOString(),
    editedBy,
    reason,
    editedFields,
    previousValues
  }
  
  return {
    values: { ...currentData.values, ...newValues },
    calculatedValues: currentData.calculatedValues, // Never changes
    source: 'manual_override',
    lastCalculated: currentData.lastCalculated,
    manualEditMetadata: metadata
  }
}

/**
 * Revert to calculated values
 * Removes manual override and restores auto-calculated nutrition
 */
export function revertToCalculated(
  currentData: NutritionLabelData
): NutritionLabelData {
  return {
    values: currentData.calculatedValues,
    calculatedValues: currentData.calculatedValues,
    source: 'calculated',
    lastCalculated: currentData.lastCalculated
    // manualEditMetadata is removed
  }
}

/**
 * Update calculated values (after ingredient changes)
 * Preserves manual overrides if they exist
 */
export function updateCalculatedValues(
  currentData: NutritionLabelData,
  newCalculatedValues: NutritionValues
): NutritionLabelData {
  // If currently showing calculated values, update display too
  if (currentData.source === 'calculated') {
    return {
      values: newCalculatedValues,
      calculatedValues: newCalculatedValues,
      source: 'calculated',
      lastCalculated: new Date().toISOString()
    }
  }
  
  // If manual override exists, keep it but update calculated values
  return {
    ...currentData,
    calculatedValues: newCalculatedValues,
    lastCalculated: new Date().toISOString()
  }
}

/**
 * Check if nutrition label has been manually edited
 */
export function hasManualOverride(data: NutritionLabelData): boolean {
  return data.source === 'manual_override'
}

/**
 * Get human-readable summary of manual edit
 */
export function getEditSummary(data: NutritionLabelData): string | null {
  if (!data.manualEditMetadata) return null
  
  const { editedFields, timestamp, reason } = data.manualEditMetadata
  const date = new Date(timestamp).toLocaleDateString()
  const fields = editedFields.join(', ')
  
  return `Manually edited ${fields} on ${date}. Reason: ${reason}`
}

/**
 * Calculate discrepancy percentage between calculated and displayed
 */
export function calculateDiscrepancyPercent(
  calculated: number,
  displayed: number
): number {
  if (calculated === 0) return displayed === 0 ? 0 : 100
  return Math.abs(((displayed - calculated) / calculated) * 100)
}

/**
 * Check if discrepancy exceeds tolerance threshold
 */
export function exceedsTolerance(
  calculated: number,
  displayed: number,
  tolerancePercent: number = 1
): boolean {
  const diff = Math.abs(displayed - calculated)
  const tolerance = Math.max(1, calculated * (tolerancePercent / 100))
  return diff > tolerance
}
