/**
 * Smart Recipe Saver - Handles saving parsed recipes to Airtable
 * Creates sub-recipes first, then creates final dish using them
 */

import { Ingredient, NutrientProfile } from '@/types/liturgist'
import { calculateNutritionProfile, convertToGrams } from './calculator'

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
      console.warn(`Could not convert ${ing.name} to grams, using standard conversion`)
      totalWeight += ing.quantity * 100 // Fallback estimate
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
 * Create a final dish using sub-recipes and ingredients
 * 
 * For now, this is simplified - the full implementation will come next
 */
export async function createFinalDish(
  dishName: string,
  finalDishIngredients: IngredientWithUSDA[],
  subRecipesData: Array<{ id: string, name: string, nutritionProfile: NutrientProfile, quantityInFinalDish: number, unitInFinalDish: string }>
): Promise<string> {
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
        totalWeight += comp.quantity * 100 // Fallback
      }
    } else {
      totalWeight += comp.quantity * 100 // Simplified for sub-recipes
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
