/**
 * Smart Recipe Saver - Handles saving parsed recipes to Airtable
 * Creates sub-recipes first, then creates final dish using them
 */

import { Ingredient, NutrientProfile } from '@/types/liturgist'
import { calculateNutritionProfile, convertToGrams } from './calculator'
import { transformNutrients } from './usda'
import { retryFetch } from './retry'

/**
 * Better fallback for unknown units
 * Uses reasonable estimates based on unit type instead of always 100g
 */
function getFallbackGrams(quantity: number, unit: string): number {
  const normalizedUnit = unit.toLowerCase().trim()
  
  // Volume-based units (assume water-like density)
  // NOTE: Volume-to-weight conversions are estimates based on water density (1g/ml)
  // Actual weight varies by ingredient (e.g., flour is ~120g/cup, sugar ~200g/cup)
  if (normalizedUnit.includes('cup')) {
    console.info(`📊 Volume conversion: "${unit}" → assuming water density. Actual weight varies by ingredient.`)
    return quantity * 236.588
  }
  if (normalizedUnit.includes('tbsp') || normalizedUnit.includes('tablespoon')) {
    console.info(`📊 Volume conversion: "${unit}" → assuming water density. Actual weight varies by ingredient.`)
    return quantity * 14.7868
  }
  if (normalizedUnit.includes('tsp') || normalizedUnit.includes('teaspoon')) {
    console.info(`📊 Volume conversion: "${unit}" → assuming water density. Actual weight varies by ingredient.`)
    return quantity * 4.92892
  }
  if (normalizedUnit.includes('ml') || normalizedUnit.includes('milliliter')) return quantity * 1
  if (normalizedUnit.includes('liter') || normalizedUnit === 'l') return quantity * 1000
  if (normalizedUnit.includes('fl oz') || normalizedUnit.includes('fluid ounce')) return quantity * 29.5735
  if (normalizedUnit.includes('pint')) return quantity * 473.176
  if (normalizedUnit.includes('quart')) return quantity * 946.353
  if (normalizedUnit.includes('gallon')) return quantity * 3785.41
  
  // Weight-based units
  if (normalizedUnit.includes('oz') || normalizedUnit.includes('ounce')) return quantity * 28.3495
  if (normalizedUnit.includes('lb') || normalizedUnit.includes('pound')) return quantity * 453.592
  if (normalizedUnit.includes('kg') || normalizedUnit.includes('kilogram')) return quantity * 1000
  
  // Count-based (assume medium size ~150g per item)
  if (normalizedUnit === 'whole' || normalizedUnit === 'item' || normalizedUnit === 'piece') return quantity * 150
  if (normalizedUnit === 'small') return quantity * 100
  if (normalizedUnit === 'medium') return quantity * 150
  if (normalizedUnit === 'large') return quantity * 200
  
  // Very small amounts (spices, seasonings)
  if (normalizedUnit === 'pinch') return quantity * 0.5  // ~0.5g per pinch
  if (normalizedUnit === 'dash') return quantity * 0.6   // ~0.6g per dash
  if (normalizedUnit === 'smidgen') return quantity * 0.3 // ~0.3g
  if (normalizedUnit === 'sprinkle') return quantity * 0.4 // ~0.4g
  
  // "To taste" is ambiguous - use very small amount
  if (normalizedUnit.includes('to taste') || normalizedUnit === 'taste') {
    console.warn(`⚠️ "to taste" unit detected. Using 1g estimate. For accurate nutrition, please specify exact amount.`)
    return quantity * 1  // 1g default for "to taste"
  }
  
  // Unknown unit - use conservative estimate with clear warning
  const warning = `⚠️ UNIT CONVERSION WARNING: Unknown unit "${unit}" - using 50g per unit as fallback estimate. Nutrition data may be inaccurate. Consider using standard units (g, kg, oz, lb, cup, tbsp, tsp).`
  console.warn(warning)
  return quantity * 50
}

export interface IngredientWithUSDA {
  quantity: number
  unit: string
  ingredient: string
  originalLine: string
  usdaFood: any // USDAFood type
  searchQuery: string
  confirmed: boolean
}

export interface SubRecipeWithUSDA {
  name: string
  ingredients: IngredientWithUSDA[]
  quantityInFinalDish: number
  unitInFinalDish: string
}

/**
 * Create a sub-recipe in the database
 */
export async function createSubRecipe(subRecipe: SubRecipeWithUSDA): Promise<{ id: string, nutritionProfile: NutrientProfile, totalWeight: number }> {
  // Validate sub-recipe name length (byte length for emojis)
  const MAX_NAME_LENGTH = 255
  const nameBytes = new TextEncoder().encode(subRecipe.name).length
  if (nameBytes > MAX_NAME_LENGTH) {
    const excess = nameBytes - MAX_NAME_LENGTH
    throw new Error(
      `Sub-recipe name is too long (${nameBytes} bytes, maximum ${MAX_NAME_LENGTH}). ` +
      `Please shorten by approximately ${Math.ceil(excess / 2)} characters. ` +
      `Note: Emojis and special characters use multiple bytes. ` +
      `Current name: "${subRecipe.name.substring(0, 50)}..."`
    )
  }
  
  // Filter out skipped ingredients (null usdaFood)
  const validIngredients = subRecipe.ingredients.filter(ing => ing.usdaFood !== null)
  
  if (validIngredients.length === 0) {
    throw new Error(`Sub-recipe "${subRecipe.name}" has no valid USDA-matched ingredients. Please match at least one ingredient or remove this sub-recipe.`)
  }
  
  // Warn about very long ingredient names
  for (const ing of validIngredients) {
    if (ing.ingredient.length > MAX_NAME_LENGTH) {
      console.warn(
        `⚠️ TRUNCATION WARNING: Ingredient "${ing.ingredient.substring(0, 50)}..." in sub-recipe "${subRecipe.name}" ` +
        `is ${ing.ingredient.length} characters (max ${MAX_NAME_LENGTH}). It will be truncated.`
      )
    }
  }

  // Validate USDA data structure
  for (const ing of validIngredients) {
    if (!ing.usdaFood.fdcId || !ing.usdaFood.description) {
      throw new Error(`Invalid USDA data for ingredient "${ing.ingredient}" in sub-recipe "${subRecipe.name}". Missing required fields.`)
    }
    
    // CRITICAL: Validate fdcId is a valid positive integer
    if (!Number.isInteger(ing.usdaFood.fdcId) || ing.usdaFood.fdcId <= 0) {
      throw new Error(
        `Invalid USDA Food ID for ingredient "${ing.ingredient}" in sub-recipe "${subRecipe.name}": ${ing.usdaFood.fdcId}. ` +
        `Food IDs must be positive integers. Please re-search this ingredient.`
      )
    }
    
    if (!ing.usdaFood.foodNutrients || !Array.isArray(ing.usdaFood.foodNutrients)) {
      console.warn(`Missing or invalid foodNutrients for "${ing.ingredient}". Nutrition calculation may be incomplete.`)
      ing.usdaFood.foodNutrients = [] // Provide empty array to prevent crashes
    }
  }
  
  // Convert ingredients to the format expected by the API
  const ingredientsForCalc: Ingredient[] = validIngredients.map((ing, idx) => ({
    id: `temp-${idx}`,
    fdcId: ing.usdaFood.fdcId,
    name: ing.usdaFood.description,
    quantity: ing.quantity,
    unit: ing.unit,
    nutrientProfile: ing.usdaFood.foodNutrients
  } as any))

  // Calculate total weight by converting each ingredient to grams
  let totalWeight = 0
  for (const ing of ingredientsForCalc) {
    try {
      const grams = convertToGrams(ing)
      totalWeight += grams
    } catch (error) {
      console.warn(`Could not convert ${ing.name} (${ing.quantity} ${ing.unit}) to grams, using fallback estimate`)
      // Better fallback: use reasonable per-unit estimates instead of always 100g
      const fallbackGrams = getFallbackGrams(ing.quantity, ing.unit)
      totalWeight += fallbackGrams
    }
  }

  // Calculate nutrition profile
  const nutritionProfile = calculateNutritionProfile(ingredientsForCalc)

  // Create sub-recipe payload
  const subRecipePayload = {
    name: subRecipe.name,
    ingredients: ingredientsForCalc,
    rawWeight: totalWeight,
    finalWeight: totalWeight,
    yieldPercentage: 100, // Default to 100% yield
    servingSize: 100, // Default to 100g serving
    servingsPerRecipe: Math.max(1, Math.round(totalWeight / 100)),
    nutritionProfile,
    category: 'Component',
    notes: `Auto-created from smart recipe importer`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  // Save to API with retry logic for transient failures
  const response = await retryFetch('/api/sub-recipes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subRecipePayload)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Failed to create sub-recipe "${subRecipe.name}": ${error.error}`)
  }

  const result = await response.json()
  return {
    id: result.subRecipe.id,
    nutritionProfile: result.subRecipe.nutritionProfile,
    totalWeight // Return total weight so we can scale it in final dish
  }
}

/**
 * Check if a final dish with this name already exists
 */
async function checkDuplicateDish(name: string): Promise<boolean> {
  try {
    const response = await fetch('/api/final-dishes')
    if (!response.ok) return false
    
    const { finalDishes } = await response.json()
    return finalDishes.some((dish: any) => 
      dish.name.toLowerCase().trim() === name.toLowerCase().trim()
    )
  } catch (error) {
    console.warn('Could not check for duplicate dishes:', error)
    return false
  }
}

/**
 * Detect circular sub-recipe references
 * Example: Recipe A uses sub-recipe B, which uses sub-recipe C, which uses A again
 */
async function detectCircularReferences(
  dishName: string,
  subRecipeIds: string[],
  visited: Set<string> = new Set()
): Promise<string | null> {
  // Check if we've already visited this dish (circular reference detected)
  if (visited.has(dishName)) {
    return dishName
  }

  visited.add(dishName)

  // Check each sub-recipe
  for (const subRecipeId of subRecipeIds) {
    try {
      const response = await fetch(`/api/sub-recipes/${subRecipeId}`)
      if (!response.ok) continue

      const { subRecipe } = await response.json()
      
      // Check if this sub-recipe uses other sub-recipes (recursive check)
      if (subRecipe.SubRecipeLinks && subRecipe.SubRecipeLinks.length > 0) {
        const circular = await detectCircularReferences(
          subRecipe.Name,
          subRecipe.SubRecipeLinks,
          new Set(visited)
        )
        if (circular) return circular
      }
    } catch (error) {
      console.warn(`Could not check sub-recipe ${subRecipeId} for circular references:`, error)
    }
  }

  return null // No circular reference found
}

/**
 * Create a final dish using sub-recipes and ingredients
 * 
 * For now, this is simplified - the full implementation will come next
 */
export async function createFinalDish(
  dishName: string,
  finalDishIngredients: IngredientWithUSDA[],
  subRecipesData: Array<{ id: string, name: string, nutritionProfile: NutrientProfile, totalWeight: number, quantityInFinalDish: number, unitInFinalDish: string }>
): Promise<string> {
  // Validate dish name length (Airtable field limit is typically 255 chars)
  const MAX_NAME_LENGTH = 255
  
  // CRITICAL: Check BYTE length, not character length (emojis = 4 bytes each!)
  const nameBytes = new TextEncoder().encode(dishName).length
  if (nameBytes > MAX_NAME_LENGTH) {
    const excess = nameBytes - MAX_NAME_LENGTH
    throw new Error(
      `Dish name is too long (${nameBytes} bytes, maximum ${MAX_NAME_LENGTH}). ` +
      `Please shorten by approximately ${Math.ceil(excess / 2)} characters. ` +
      `Note: Emojis and special characters use multiple bytes. ` +
      `Current name: "${dishName.substring(0, 50)}..."`
    )
  }
  
  // Check for circular sub-recipe references
  if (subRecipesData.length > 0) {
    const circular = await detectCircularReferences(
      dishName,
      subRecipesData.map(sr => sr.id)
    )
    if (circular) {
      throw new Error(
        `Circular sub-recipe reference detected: "${circular}" references itself indirectly. ` +
        `This would cause infinite recursion in nutrition calculations. ` +
        `Please restructure your recipes to avoid circular dependencies.`
      )
    }
  }
  
  // Validate at least one ingredient or sub-recipe
  const hasValidIngredients = finalDishIngredients.some(ing => ing.usdaFood !== null)
  const hasSubRecipes = subRecipesData.length > 0
  
  if (!hasValidIngredients && !hasSubRecipes) {
    throw new Error(
      `Cannot create final dish "${dishName}" with no ingredients. ` +
      `Please match at least one ingredient to USDA data before saving.`
    )
  }
  
  // Warn about very long ingredient names that might get truncated
  for (const ing of finalDishIngredients) {
    if (ing.ingredient.length > MAX_NAME_LENGTH) {
      console.warn(
        `⚠️ TRUNCATION WARNING: Ingredient name "${ing.ingredient.substring(0, 50)}..." ` +
        `is ${ing.ingredient.length} characters (max ${MAX_NAME_LENGTH}). It will be truncated.`
      )
    }
  }

  // Check for duplicate dish name
  const isDuplicate = await checkDuplicateDish(dishName)
  if (isDuplicate) {
    throw new Error(
      `A final dish named "${dishName}" already exists. ` +
      `Please use a different name or delete the existing dish first.`
    )
  }
  
  // Build components array for Airtable storage (minimal data)
  const components: any[] = []
  
  // Build ingredients array for nutrition calculation (includes nutrientProfile)
  const ingredientsForNutrition: Ingredient[] = []

  // Add raw ingredients (skip those without USDA match)
  for (const ing of finalDishIngredients) {
    // Skip ingredients that were marked as "Skip" (null usdaFood)
    if (!ing.usdaFood) continue
    
    // Validate USDA data structure
    if (!ing.usdaFood.fdcId || !ing.usdaFood.description) {
      console.error(`Invalid USDA data for ingredient "${ing.ingredient}". Skipping.`)
      continue
    }
    
    // CRITICAL: Validate fdcId is a valid positive integer
    if (!Number.isInteger(ing.usdaFood.fdcId) || ing.usdaFood.fdcId <= 0) {
      throw new Error(
        `Invalid USDA Food ID for ingredient "${ing.ingredient}": ${ing.usdaFood.fdcId}. ` +
        `Food IDs must be positive integers. Please re-search this ingredient.`
      )
    }
    
    // CRITICAL: Validate foodNutrients exists for nutrition calculation
    if (!ing.usdaFood.foodNutrients || !Array.isArray(ing.usdaFood.foodNutrients)) {
      console.warn(`Missing nutrition data for "${ing.ingredient}". Setting to empty for calculation.`)
      ing.usdaFood.foodNutrients = []
    }
    
    // Build ingredient for nutrition calculation (includes nutrientProfile)
    const ingredientForCalc: any = {
      id: `temp-${Math.random()}`,
      fdcId: ing.usdaFood.fdcId,
      name: ing.usdaFood.description,
      quantity: ing.quantity,
      unit: ing.unit,
      nutrientProfile: transformNutrients(ing.usdaFood.foodNutrients) // Transform raw USDA data
    }
    
    ingredientsForNutrition.push(ingredientForCalc)
    
    // Build component for Airtable (minimal data to save space)
    components.push({
      type: 'ingredient',
      fdcId: ingredientForCalc.fdcId,
      name: ingredientForCalc.name,
      quantity: ingredientForCalc.quantity,
      unit: ingredientForCalc.unit
      // NO nutrients array - too large for Airtable, already calculated separately
    })
  }

  // CRITICAL: Validate we have at least one ingredient for nutrition calculation
  if (ingredientsForNutrition.length === 0 && subRecipesData.length === 0) {
    throw new Error(
      `Cannot create final dish "${dishName}" with no ingredients or sub-recipes. ` +
      `Please match at least one ingredient to USDA data before saving.`
    )
  }

  // Add sub-recipes with intelligent volume-to-weight conversion and scaling
  for (const subRecipe of subRecipesData) {
    // Convert the requested quantity+unit to grams
    const requestedWeightInGrams = getFallbackGrams(subRecipe.quantityInFinalDish, subRecipe.unitInFinalDish)
    
    // Calculate scaling ratio: how much of the sub-recipe we're using
    // Example: If sub-recipe total is 500g and we want "1 cup" (237g), ratio = 237/500 = 0.474
    const scalingRatio = requestedWeightInGrams / subRecipe.totalWeight
    
    // Scale the nutrition profile accordingly
    const scaledNutrition: NutrientProfile = {} as NutrientProfile
    for (const key of Object.keys(subRecipe.nutritionProfile) as Array<keyof NutrientProfile>) {
      const value = subRecipe.nutritionProfile[key]
      scaledNutrition[key] = (value || 0) * scalingRatio
    }
    
    components.push({
      type: 'subrecipe',
      subRecipeId: subRecipe.id,
      name: subRecipe.name,
      quantity: requestedWeightInGrams, // Actual weight being used
      unit: 'g', // Always use grams for sub-recipes
      nutritionProfile: scaledNutrition // Scaled to match actual usage
    })
  }

  // Estimate total weight (simplified)
  let totalWeight = 0
  for (const comp of components) {
    if (comp.type === 'ingredient') {
      try {
        const grams = convertToGrams(comp as Ingredient)
        totalWeight += grams
      } catch {
        const fallbackGrams = getFallbackGrams(comp.quantity, comp.unit)
        totalWeight += fallbackGrams
      }
    } else {
      // For sub-recipes: assume unit is weight-based or use fallback
      const fallbackGrams = getFallbackGrams(comp.quantity, comp.unit)
      totalWeight += fallbackGrams
    }
  }

  // CRITICAL: Validate totalWeight before saving
  if (totalWeight <= 0 || !isFinite(totalWeight) || isNaN(totalWeight)) {
    throw new Error(
      `Invalid total weight: ${totalWeight}g. ` +
      `Cannot save recipe with zero or invalid weight. ` +
      `This usually means ingredient quantities couldn't be converted to grams. ` +
      `Please verify all ingredients have valid quantities and units (g, oz, cup, tbsp, tsp, etc.).`
    )
  }
  
  // CRITICAL: Calculate ACTUAL nutrition (not placeholder!)
  console.log('📊 Calculating nutrition for final dish...')
  const nutritionProfile = calculateNutritionProfile(ingredientsForNutrition)
  
  // CRITICAL: Validate nutrition values are valid numbers (not NaN or Infinity)
  if (!isFinite(nutritionProfile.calories) || isNaN(nutritionProfile.calories)) {
    throw new Error(
      `Invalid nutrition calculation: calories = ${nutritionProfile.calories}. ` +
      `This usually indicates a problem with ingredient data or unit conversions. ` +
      `Please verify all ingredient quantities and units are valid.`
    )
  }
  
  console.log('✅ Nutrition calculated:', { 
    calories: Math.round(nutritionProfile.calories), 
    protein: nutritionProfile.protein?.toFixed(1),
    fat: nutritionProfile.totalFat?.toFixed(1),
    carbs: nutritionProfile.totalCarbohydrate?.toFixed(1)
  })
  
  // CRITICAL: Validate Components JSON size before sending
  const componentsJson = JSON.stringify(components)
  const sizeKB = (componentsJson.length / 1024).toFixed(2)
  console.log(`Components JSON size: ${sizeKB} KB`)
  
  if (componentsJson.length > 95000) {
    throw new Error(
      `Recipe data is too large (${sizeKB} KB). ` +
      `Airtable Long Text fields have a 100,000 character limit. ` +
      `Try splitting this recipe into sub-recipes or using fewer ingredients. ` +
      `Current: ${components.length} components.`
    )
  }

  // Extract sub-recipe IDs for linked record field
  const subRecipeIds = subRecipesData.map(sr => sr.id)
  
  console.log('📊 Final Dish Debug Info:')
  console.log('- Sub-recipes data:', subRecipesData)
  console.log('- Extracted IDs:', subRecipeIds)
  console.log('- IDs are strings?', subRecipeIds.every(id => typeof id === 'string'))
  console.log('- IDs format:', subRecipeIds.map(id => `${id} (${typeof id})`))
  
  // Create final dish payload (only include arrays if they have values)
  const finalDishPayload: any = {
    name: dishName,
    components,
    totalWeight,
    servingSize: 100,
    servingsPerContainer: Math.max(1, Math.round(totalWeight / 100)),
    nutritionLabel: nutritionProfile, // REAL nutrition data, not placeholder!
    status: 'Active', // Must match Airtable Single Select option (capitalized)
    notes: 'Created from smart recipe importer',
    createdAt: new Date().toISOString()
  }
  
  // NOTE: Category removed - might be Single Select field like Status was
  // NOTE: Allergens removed - if it's a linked record field, empty array causes 500 error
  // Let Airtable use default value or leave blank
  
  // Only add subRecipeLinks if we have sub-recipes
  if (subRecipeIds.length > 0) {
    finalDishPayload.subRecipeLinks = subRecipeIds
  }

  // Save to API with retry logic and duplicate error handling
  const response = await retryFetch('/api/final-dishes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(finalDishPayload)
  }, {
    // Don't retry on 4xx errors (client errors like duplicates)
    shouldRetry: (error) => {
      if (error.status >= 400 && error.status < 500) return false
      return true // Retry on network errors, 5xx, etc.
    }
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    
    // Log full error response for debugging
    console.error('[Final Dish Save] Full error response:', error)
    console.error('[Final Dish Save] Status:', response.status)
    
    // Check for Airtable duplicate record error (handles race condition)
    if (response.status === 422 || (error.error && error.error.toLowerCase().includes('duplicate'))) {
      throw new Error(
        `A final dish named "${dishName}" already exists. ` +
        `It may have just been created by you or another user. ` +
        `Please choose a different name or check your existing dishes. ` +
        `If you just created this, try refreshing the page.`
      )
    }
    
    // Include all error details in the thrown error
    const errorMessage = error.originalError || error.error || 'Unknown error'
    const detailsStr = error.details ? `\n\nDetails: ${JSON.stringify(error.details, null, 2)}` : ''
    
    throw new Error(`Failed to create final dish "${dishName}": ${errorMessage}${detailsStr}`)
  }

  const result = await response.json()
  return result.finalDish.id
}
