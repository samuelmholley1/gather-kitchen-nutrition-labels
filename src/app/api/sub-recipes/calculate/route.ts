import { NextRequest, NextResponse } from 'next/server'
import { calculateNutritionProfile } from '@/lib/calculator'
import { getFoodDetails } from '@/lib/usda'
import { Ingredient, NutrientProfile } from '@/types/recipe'

/**
 * POST /api/sub-recipes/calculate
 * Calculate nutrition profile for a list of ingredients
 * 
 * Body: {
 *   ingredients: Ingredient[],
 *   rawWeight: number,
 *   finalWeight: number,
 *   servingSize: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { ingredients, rawWeight, finalWeight, servingSize } = await request.json()
    
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Ingredients array is required' },
        { status: 400 }
      )
    }

    // Fetch full nutrition data for each ingredient from USDA
    const ingredientsWithNutrition = await Promise.all(
      ingredients.map(async (ing: Ingredient) => {
        if (!ing.fdcId) {
          throw new Error(`Ingredient "${ing.name}" missing USDA fdcId`)
        }

        const foodDetails = await getFoodDetails(ing.fdcId)
        
        return {
          ...ing,
          usdaData: foodDetails
        }
      })
    )

    // Calculate nutrition profile (per 100g of final product)
    const yieldMultiplier = finalWeight / rawWeight
    const totalNutrition = calculateNutritionProfile(ingredientsWithNutrition)
    
    // Apply yield adjustment (e.g., water loss during cooking)
    const yieldAdjustedProfile = {
      calories: totalNutrition.calories / yieldMultiplier,
      totalFat: totalNutrition.totalFat / yieldMultiplier,
      saturatedFat: totalNutrition.saturatedFat / yieldMultiplier,
      transFat: totalNutrition.transFat / yieldMultiplier,
      cholesterol: totalNutrition.cholesterol / yieldMultiplier,
      sodium: totalNutrition.sodium / yieldMultiplier,
      totalCarbohydrate: totalNutrition.totalCarbohydrate / yieldMultiplier,
      dietaryFiber: totalNutrition.dietaryFiber / yieldMultiplier,
      totalSugars: totalNutrition.totalSugars / yieldMultiplier,
      addedSugars: totalNutrition.addedSugars / yieldMultiplier,
      protein: totalNutrition.protein / yieldMultiplier,
      vitaminD: totalNutrition.vitaminD / yieldMultiplier,
      calcium: totalNutrition.calcium / yieldMultiplier,
      iron: totalNutrition.iron / yieldMultiplier,
      potassium: totalNutrition.potassium / yieldMultiplier,
    }
    
    // Scale to per serving
    const servingScaleFactor = servingSize / 100 // profile is per 100g
    const nutritionProfile = {
      calories: yieldAdjustedProfile.calories * servingScaleFactor,
      totalFat: yieldAdjustedProfile.totalFat * servingScaleFactor,
      saturatedFat: yieldAdjustedProfile.saturatedFat * servingScaleFactor,
      transFat: yieldAdjustedProfile.transFat * servingScaleFactor,
      cholesterol: yieldAdjustedProfile.cholesterol * servingScaleFactor,
      sodium: yieldAdjustedProfile.sodium * servingScaleFactor,
      totalCarbohydrate: yieldAdjustedProfile.totalCarbohydrate * servingScaleFactor,
      dietaryFiber: yieldAdjustedProfile.dietaryFiber * servingScaleFactor,
      totalSugars: yieldAdjustedProfile.totalSugars * servingScaleFactor,
      addedSugars: yieldAdjustedProfile.addedSugars * servingScaleFactor,
      protein: yieldAdjustedProfile.protein * servingScaleFactor,
      vitaminD: yieldAdjustedProfile.vitaminD * servingScaleFactor,
      calcium: yieldAdjustedProfile.calcium * servingScaleFactor,
      iron: yieldAdjustedProfile.iron * servingScaleFactor,
      potassium: yieldAdjustedProfile.potassium * servingScaleFactor,
    }

    return NextResponse.json({
      success: true,
      nutritionProfile
    })

  } catch (error) {
    console.error('Nutrition calculation error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Calculation failed' 
      },
      { status: 500 }
    )
  }
}
