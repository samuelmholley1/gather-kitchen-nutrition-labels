/**
 * Nutrition Calculator
 * 
 * Core business logic for calculating nutrition facts from ingredients.
 * Implements Risk Mitigation #1: 4-tier unit conversion priority system.
 * 
 * Priority Order:
 * 1. Custom conversions (from SubRecipe.CustomConversions)
 * 2. USDA portion data (from FoodData Central)
 * 3. Standard conversions (STANDARD_CONVERSIONS constant)
 * 4. Unknown unit error (cannot calculate)
 */

import type {
  Ingredient,
  NutrientProfile,
  USDAFood,
  FoodPortion,
} from '@/types/nutrition'
import { STANDARD_CONVERSIONS, TYPICAL_YIELDS, initializeNutrientProfile } from '@/types/nutrition'

// ============================================================================
// UNIT CONVERSION (4-Tier Priority System)
// ============================================================================

/**
 * Convert ingredient quantity to grams using 4-tier priority system
 * 
 * @param ingredient - Ingredient with quantity and unit
 * @param usdaFood - USDA food data (for tier 2)
 * @param customConversions - Custom conversions (for tier 1)
 * @returns Weight in grams
 * @throws Error if unit cannot be converted
 */
export function convertToGrams(
  ingredient: Ingredient,
  customConversions?: Record<string, number>
): number {
  const { quantity, unit, fdcId, nutrientProfile } = ingredient
  
  // Tier 0: Already in grams
  if (unit === 'g' || unit === 'gram' || unit === 'grams') {
    return quantity
  }
  
  // Tier 1: Custom conversions (highest priority)
  if (customConversions && fdcId) {
    const key = `${fdcId}:${unit}`
    if (customConversions[key]) {
      return quantity * customConversions[key]
    }
  }
  
  // Tier 2: USDA portion data (would come from nutrient profile metadata)
  // Note: In actual implementation, this would fetch from USDACache table
  // For now, this is a placeholder for future USDA portion lookup
  
  // Tier 3: Standard conversions
  const standardKey = unit.toLowerCase()
  if (STANDARD_CONVERSIONS[standardKey]) {
    return quantity * STANDARD_CONVERSIONS[standardKey]
  }
  
  // Tier 4: Unknown unit - cannot calculate
  throw new Error(
    `Cannot convert unit "${unit}" for ingredient "${ingredient.name}". ` +
    `Please add a custom conversion or use grams.`
  )
}

/**
 * Find matching USDA portion by unit string
 * 
 * @param unit - Unit string (e.g., "cup", "tbsp", "medium")
 * @param portions - USDA food portions
 * @returns Matching portion or undefined
 */
function findMatchingPortion(
  unit: string,
  portions: FoodPortion[]
): FoodPortion | undefined {
  const normalized = unit.toLowerCase().trim()
  
  return portions.find((portion) => {
    const measureName = portion.measureUnit?.name?.toLowerCase() || ''
    const measureAbbr = portion.measureUnit?.abbreviation?.toLowerCase() || ''
    const modifier = portion.modifier?.toLowerCase() || ''
    
    // Exact match on measure name
    if (measureName === normalized) return true
    
    // Exact match on abbreviation
    if (measureAbbr === normalized) return true
    
    // Exact match on modifier
    if (modifier === normalized) return true
    
    // Partial match (e.g., "cup" matches "1 cup")
    if (measureName.includes(normalized)) return true
    if (measureAbbr.includes(normalized)) return true
    if (modifier.includes(normalized)) return true
    
    return false
  })
}

// ============================================================================
// NUTRITION CALCULATION
// ============================================================================

/**
 * Calculate nutrition profile from a list of ingredients
 * 
 * @param ingredients - List of ingredients with nutrient profiles
 * @param customConversions - Optional custom unit conversions
 * @returns Nutrition profile per 100g
 */
export function calculateNutritionProfile(
  ingredients: Ingredient[],
  customConversions?: Record<string, number>
): NutrientProfile {
  // Initialize empty profile with all nutrients
  const profile = initializeNutrientProfile()
  
  let totalWeight = 0
  
  // Sum nutrients from each ingredient
  for (const ingredient of ingredients) {
    const weightInGrams = convertToGrams(
      ingredient,
      customConversions
    )
    
    totalWeight += weightInGrams
    
    // Scale nutrient profile (which is per 100g) to ingredient weight
    const scaleFactor = weightInGrams / 100
    
    const nutrients = ingredient.nutrientProfile
    if (!nutrients) continue
    
    // Add each nutrient (data is per 100g)
    profile.calories += (nutrients.calories || 0) * scaleFactor
    profile.totalFat += (nutrients.totalFat || 0) * scaleFactor
    profile.saturatedFat += (nutrients.saturatedFat || 0) * scaleFactor
    profile.transFat += (nutrients.transFat || 0) * scaleFactor
    profile.cholesterol += (nutrients.cholesterol || 0) * scaleFactor
    profile.sodium += (nutrients.sodium || 0) * scaleFactor
    profile.totalCarbohydrate += (nutrients.totalCarbohydrate || 0) * scaleFactor
    profile.dietaryFiber += (nutrients.dietaryFiber || 0) * scaleFactor
    
    // Debug sugar calculation
    const ingredientName = ingredient.name || 'unknown'
    const fdcId = ingredient.fdcId
    if (nutrients.totalSugars !== undefined && nutrients.totalSugars > 0) {
      console.log(`🍬 SUGAR DEBUG [${ingredientName}${fdcId ? ` FDC:${fdcId}` : ''}]: totalSugars=${nutrients.totalSugars}g/100g, weight=${weightInGrams.toFixed(2)}g, scaleFactor=${scaleFactor.toFixed(3)}, contribution=${(nutrients.totalSugars * scaleFactor).toFixed(2)}g`)
    } else if (nutrients.totalSugars === 0 || nutrients.totalSugars === undefined) {
      console.log(`⚠️ SUGAR WARNING [${ingredientName}${fdcId ? ` FDC:${fdcId}` : ''}]: totalSugars is ${nutrients.totalSugars} (missing or zero in USDA data), carbs=${nutrients.totalCarbohydrate}`)
    }
    
    profile.totalSugars += (nutrients.totalSugars || 0) * scaleFactor
    profile.addedSugars += (nutrients.addedSugars || 0) * scaleFactor
    profile.protein += (nutrients.protein || 0) * scaleFactor
    profile.vitaminD += (nutrients.vitaminD || 0) * scaleFactor
    profile.vitaminA += (nutrients.vitaminA || 0) * scaleFactor
    profile.vitaminC += (nutrients.vitaminC || 0) * scaleFactor
    profile.vitaminE += (nutrients.vitaminE || 0) * scaleFactor
    profile.vitaminK += (nutrients.vitaminK || 0) * scaleFactor
    profile.thiamin += (nutrients.thiamin || 0) * scaleFactor
    profile.riboflavin += (nutrients.riboflavin || 0) * scaleFactor
    profile.niacin += (nutrients.niacin || 0) * scaleFactor
    profile.vitaminB6 += (nutrients.vitaminB6 || 0) * scaleFactor
    profile.folate += (nutrients.folate || 0) * scaleFactor
    profile.vitaminB12 += (nutrients.vitaminB12 || 0) * scaleFactor
    profile.calcium += (nutrients.calcium || 0) * scaleFactor
    profile.iron += (nutrients.iron || 0) * scaleFactor
    profile.magnesium += (nutrients.magnesium || 0) * scaleFactor
    profile.phosphorus += (nutrients.phosphorus || 0) * scaleFactor
    profile.potassium += (nutrients.potassium || 0) * scaleFactor
    profile.zinc += (nutrients.zinc || 0) * scaleFactor
    profile.copper += (nutrients.copper || 0) * scaleFactor
    profile.manganese += (nutrients.manganese || 0) * scaleFactor
    profile.selenium += (nutrients.selenium || 0) * scaleFactor
  }
  
  // Convert to per-100g basis
  if (totalWeight === 0) {
    throw new Error('Cannot calculate nutrition: total weight is zero')
  }
  
  const per100gFactor = 100 / totalWeight
  
  // Scale all nutrients to per-100g and validate
  for (const key of Object.keys(profile) as Array<keyof NutrientProfile>) {
    const scaledValue = profile[key] * per100gFactor
    
    // Validate: nutrition values should never be negative (USDA data errors)
    if (scaledValue < 0) {
      console.warn(`⚠️ USDA DATA ERROR: Negative value for ${key} (${scaledValue}). Setting to 0.`)
      profile[key] = 0
    } else {
      profile[key] = scaledValue
    }
    
    // Validate: extremely high values likely indicate data errors
    const MAX_VALUES: Partial<Record<keyof NutrientProfile, number>> = {
      calories: 9000,  // Pure fat is ~900 cal/100g, so 9000 is extreme
      totalFat: 100,   // Can't exceed 100g per 100g
      protein: 100,    // Can't exceed 100g per 100g
      totalCarbohydrate: 100,  // Can't exceed 100g per 100g
      sodium: 100000,  // 100g of pure salt = ~39g sodium, so 100g is extreme
      cholesterol: 3000 // Even pure egg yolk is ~1200mg/100g
    }
    
    const maxValue = MAX_VALUES[key]
    if (maxValue && profile[key] > maxValue) {
      console.warn(`⚠️ USDA DATA ERROR: Extremely high value for ${key} (${profile[key]}). This likely indicates a data error. Please verify ingredient data.`)
    }
  }
  
  return profile
}

// ============================================================================
// COOKING YIELD ADJUSTMENT (Risk Mitigation #2)
// ============================================================================

/**
 * Apply cooking yield to nutrition profile
 * 
 * When cooking causes moisture loss, nutrients become more concentrated.
 * 
 * Example: 100g raw chicken → 75g cooked chicken
 * Yield multiplier: 0.75
 * Protein: 20g per 100g raw → 26.67g per 100g cooked
 * 
 * @param profile - Nutrition profile per 100g raw
 * @param yieldMultiplier - Final weight / initial weight (e.g., 0.75)
 * @returns Adjusted nutrition profile per 100g cooked
 */
export function applyYieldAdjustment(
  profile: NutrientProfile,
  yieldMultiplier: number
): NutrientProfile {
  if (yieldMultiplier <= 0 || yieldMultiplier > 2) {
    throw new Error(
      `Invalid yield multiplier: ${yieldMultiplier}. ` +
      `Must be between 0 and 2 (0% to 200% of original weight).`
    )
  }
  
  // Nutrients concentrate as water is lost
  const concentrationFactor = 1 / yieldMultiplier
  
  const adjusted = initializeNutrientProfile()
  
  // Apply concentration to all nutrients
  for (const key of Object.keys(profile) as Array<keyof NutrientProfile>) {
    adjusted[key] = profile[key] * concentrationFactor
  }
  
  return adjusted
}

/**
 * Get typical yield multiplier for cooking method
 * 
 * @param method - Cooking method (e.g., "roasted", "braised")
 * @returns Yield multiplier or undefined if method not found
 */
export function getTypicalYield(method: string): number | undefined {
  const normalized = method.toLowerCase().trim()
  return TYPICAL_YIELDS[normalized]
}

// ============================================================================
// SERVING SIZE CALCULATION
// ============================================================================

/**
 * Scale nutrition profile to specific serving size
 * 
 * @param profile - Nutrition profile per 100g
 * @param servingSizeGrams - Serving size in grams
 * @returns Nutrition profile for serving
 */
export function scaleToServing(
  profile: NutrientProfile,
  servingSizeGrams: number
): NutrientProfile {
  const scaleFactor = servingSizeGrams / 100
  
  const scaled = initializeNutrientProfile()
  
  // Scale all nutrients to serving size
  for (const key of Object.keys(profile) as Array<keyof NutrientProfile>) {
    scaled[key] = profile[key] * scaleFactor
  }
  
  return scaled
}

/**
 * Calculate servings per container
 * 
 * @param totalWeight - Total weight of dish in grams
 * @param servingSize - Single serving size in grams
 * @returns Number of servings (rounded to 1 decimal)
 */
export function calculateServings(
  totalWeight: number,
  servingSize: number
): number {
  if (servingSize <= 0) {
    throw new Error('Serving size must be greater than 0')
  }
  
  const servings = totalWeight / servingSize
  return Math.round(servings * 10) / 10 // Round to 1 decimal
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate that an ingredient has all required data
 * 
 * @param ingredient - Ingredient to validate
 * @throws Error if validation fails
 */
export function validateIngredient(ingredient: Ingredient): void {
  if (!ingredient.name) {
    throw new Error('Ingredient name is required')
  }
  
  if (ingredient.quantity <= 0) {
    throw new Error(`Invalid quantity for ${ingredient.name}: ${ingredient.quantity}`)
  }
  
  if (!ingredient.unit) {
    throw new Error(`Unit is required for ${ingredient.name}`)
  }
  
  if (!ingredient.fdcId) {
    throw new Error(`USDA FDC ID is required for ${ingredient.name}`)
  }
  
  if (!ingredient.nutrientProfile) {
    throw new Error(`Nutrient profile is missing for ${ingredient.name}`)
  }
}

/**
 * Validate nutrition profile values
 * 
 * @param profile - Nutrition profile to validate
 * @throws Error if validation fails
 */
export function validateNutritionProfile(profile: NutrientProfile): void {
  // Check for negative values
  for (const [key, value] of Object.entries(profile)) {
    if (value < 0) {
      throw new Error(`Invalid ${key}: ${value} (cannot be negative)`)
    }
  }
  
  // Sanity checks
  if (profile.calories > 9000) {
    throw new Error(`Calories per 100g seems too high: ${profile.calories}`)
  }
  
  if (profile.saturatedFat > profile.totalFat) {
    throw new Error(
      `Saturated fat (${profile.saturatedFat}g) cannot exceed total fat (${profile.totalFat}g)`
    )
  }
  
  if (profile.addedSugars > profile.totalSugars) {
    throw new Error(
      `Added sugars (${profile.addedSugars}g) cannot exceed total sugars (${profile.totalSugars}g)`
    )
  }
}
