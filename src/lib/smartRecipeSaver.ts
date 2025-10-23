/**
 * Smart Recipe Saver - Handles saving parsed recipes to Airtable
 * Creates sub-recipes first, then creates final dish using them
 */

import { Ingredient, NutrientProfile } from '@/types/liturgist'
import { calculateNutritionProfile, convertToGrams } from './calculator'

/**
 * Better fallback for unknown units
 * Uses reasonable estimates based on unit type instead of always 100g
 */
function getFallbackGrams(quantity: number, unit: string): number {
  const normalizedUnit = unit.toLowerCase().trim()
  
  // Volume-based units (assume water-like density)
  if (normalizedUnit.includes('cup')) return quantity * 236.588
  if (normalizedUnit.includes('tbsp') || normalizedUnit.includes('tablespoon')) return quantity * 14.7868
  if (normalizedUnit.includes('tsp') || normalizedUnit.includes('teaspoon')) return quantity * 4.92892
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
  
  // Very small amounts
  if (normalizedUnit === 'pinch') return quantity * 0.5
  if (normalizedUnit === 'dash') return quantity * 0.6
  
  // Unknown unit - use conservative estimate
  console.warn(`Unknown unit "${unit}" - using 50g per unit as fallback`)
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
export async function createSubRecipe(subRecipe: SubRecipeWithUSDA): Promise<{ id: string, nutritionProfile: NutrientProfile }> {
  // Filter out skipped ingredients (null usdaFood)
  const validIngredients = subRecipe.ingredients.filter(ing => ing.usdaFood !== null)
  
  if (validIngredients.length === 0) {
    throw new Error(`Sub-recipe "${subRecipe.name}" has no valid USDA-matched ingredients. Please match at least one ingredient or remove this sub-recipe.`)
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

  // Save to API
  const response = await fetch('/api/sub-recipes', {
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
    nutritionProfile: result.subRecipe.nutritionProfile
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
 * Create a final dish using sub-recipes and ingredients
 * 
 * For now, this is simplified - the full implementation will come next
 */
export async function createFinalDish(
  dishName: string,
  finalDishIngredients: IngredientWithUSDA[],
  subRecipesData: Array<{ id: string, name: string, nutritionProfile: NutrientProfile, quantityInFinalDish: number, unitInFinalDish: string }>
): Promise<string> {
  // Check for duplicate dish name
  const isDuplicate = await checkDuplicateDish(dishName)
  if (isDuplicate) {
    throw new Error(
      `A final dish named "${dishName}" already exists. ` +
      `Please use a different name or delete the existing dish first.`
    )
  }
  
  // Build components array - simplified version
  const components: any[] = []

  // Add raw ingredients (skip those without USDA match)
  for (const ing of finalDishIngredients) {
    // Skip ingredients that were marked as "Skip" (null usdaFood)
    if (!ing.usdaFood) continue
    
    const ingredientForCalc: Ingredient = {
      id: `temp-${Math.random()}`,
      fdcId: ing.usdaFood.fdcId,
      name: ing.usdaFood.description,
      quantity: ing.quantity,
      unit: ing.unit
    }
    
    components.push({
      type: 'ingredient',
      ...ingredientForCalc,
      nutrients: ing.usdaFood.foodNutrients || []
    })
  }

  // Add sub-recipes
  for (const subRecipe of subRecipesData) {
    components.push({
      type: 'subrecipe',
      subRecipeId: subRecipe.id,
      name: subRecipe.name,
      quantity: subRecipe.quantityInFinalDish,
      unit: subRecipe.unitInFinalDish,
      nutritionProfile: subRecipe.nutritionProfile
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

  // Create final dish payload
  const finalDishPayload = {
    name: dishName,
    components,
    totalWeight,
    servingSize: 100,
    servingsPerContainer: Math.max(1, Math.round(totalWeight / 100)),
    nutritionLabel: { calories: 0 }, // Simplified - will calculate properly later
    allergens: [],
    category: 'Main Dish',
    status: 'active',
    notes: 'Created from smart recipe importer',
    createdAt: new Date().toISOString()
  }

  // Save to API
  const response = await fetch('/api/final-dishes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(finalDishPayload)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Failed to create final dish "${dishName}": ${error.error}`)
  }

  const result = await response.json()
  return result.finalDish.id
}
