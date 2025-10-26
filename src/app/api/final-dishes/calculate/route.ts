import { NextRequest, NextResponse } from 'next/server'
import { calculateNutritionProfile, applyYieldAdjustment } from '@/lib/calculator'
import { NutrientProfile } from '@/types/nutrition'
import Airtable from 'airtable'

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT_TOKEN! })
  .base(process.env.AIRTABLE_BASE_ID!)

/**
 * POST /api/final-dishes/calculate
 * Calculate nutrition for a final dish (includes sub-recipes + raw ingredients)
 * 
 * Request body:
 * {
 *   components: [
 *     { type: 'subRecipe', id: 'recXXX', quantity: 200, unit: 'grams' },
 *     { type: 'ingredient', fdcId: 123456, name: '...', quantity: 100, unit: 'grams' }
 *   ],
 *   servingSize: 150
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { components, servingSize = 100 } = await request.json()

    if (!components || !Array.isArray(components) || components.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Components array is required' },
        { status: 400 }
      )
    }

    // Convert components to ingredients format
    const ingredients = []
    
    for (const component of components) {
      if (component.type === 'subRecipe') {
        // Fetch sub-recipe from Airtable
        const subRecipesTable = base(process.env.AIRTABLE_SUBRECIPES_TABLE || 'SubRecipes')
        const subRecipeRecord = await subRecipesTable.find(component.id)
        
        const subRecipeNutrition = JSON.parse(subRecipeRecord.get('NutritionProfile') as string || '{}')
        
        ingredients.push({
          id: component.id,
          name: component.name || subRecipeRecord.get('Name'),
          quantity: component.quantity,
          unit: component.unit || 'grams',
          fdcId: 0, // Not a USDA ingredient
          isSubRecipe: true,
          nutritionProfile: subRecipeNutrition
        })
      } else if (component.type === 'ingredient') {
        // Regular USDA ingredient
        ingredients.push({
          id: `usda_${component.fdcId}`,
          name: component.name,
          quantity: component.quantity,
          unit: component.unit || 'grams',
          fdcId: component.fdcId
        })
      }
    }

    // Calculate total weight
    const totalWeight = ingredients.reduce((sum, ing) => {
      // Assume grams for now (component quantities should already be in grams)
      return sum + (ing.quantity || 0)
    }, 0)

    // Validate total weight
    if (totalWeight <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Total weight is zero or negative. Cannot calculate nutrition. Please ensure all ingredients have valid quantities.'
        },
        { status: 400 }
      )
    }

    if (servingSize <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Serving size must be greater than zero.'
        },
        { status: 400 }
      )
    }

    // Calculate nutrition profile per 100g
    const nutritionPer100g = calculateNutritionProfile(ingredients)
    
    // Apply yield adjustment for baked goods (moisture loss during baking)
    // Angel food cake typically yields ~75% of raw ingredient weight
    const yieldMultiplier = 0.75
    const nutritionPer100gCooked = applyYieldAdjustment(nutritionPer100g, yieldMultiplier)
    
    // Adjust total weight for yield
    const cookedTotalWeight = totalWeight * yieldMultiplier

    // Scale to serving size
    const servingsPerContainer = (cookedTotalWeight / servingSize)

    // Scale nutrition to serving size
    const nutritionProfile = Object.keys(nutritionPer100gCooked).reduce((acc, key) => {
      const value = nutritionPer100gCooked[key as keyof NutrientProfile]
      acc[key as keyof NutrientProfile] = (value * servingSize) / 100
      return acc
    }, {} as NutrientProfile)

    return NextResponse.json({
      success: true,
      nutritionProfile,
      totalWeight: cookedTotalWeight,
      servingSize,
      servingsPerContainer: parseFloat(servingsPerContainer.toFixed(1))
    })
  } catch (error) {
    console.error('Calculation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Calculation failed'
      },
      { status: 500 }
    )
  }
}
