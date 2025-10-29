import { NextRequest, NextResponse } from 'next/server'
import { searchFoods } from '@/lib/usda'
import { searchUserIngredients } from '@/lib/userIngredients'

/**
 * USDA Food Search API Route
 * 
 * GET /api/usda/search?query=chicken&pageSize=20
 * 
 * Searches USDA FoodData Central for ingredients
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'Query must be at least 2 characters'
        },
        { status: 400 }
      )
    }

    // Search both UserIngredients and USDA in parallel
    const [userIngredients, usdaResult] = await Promise.all([
      searchUserIngredients(query.trim(), Math.min(pageSize, 5)), // Limit user ingredients to top 5
      searchFoods(query, pageSize)
    ])

    // Convert UserIngredients to USDAFood format for compatibility
    const userIngredientFoods = userIngredients.map(ingredient => ({
      fdcId: parseInt(ingredient.id), // Use negative IDs to distinguish from USDA
      description: ingredient.name,
      dataType: 'User Override' as const,
      foodCategory: ingredient.category || 'Custom Ingredients',
      brandOwner: ingredient.brand,
      foodNutrients: Object.entries(ingredient.customNutrients).map(([key, value]) => ({
        nutrientId: 0, // Placeholder
        nutrientName: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
        nutrientNumber: '',
        unitName: key.includes('sodium') ? 'mg' : 'g',
        value: value as number,
        derivationCode: 'User Override'
      })),
      isUserIngredient: true,
      userIngredientData: {
        tags: ingredient.tags,
        source: ingredient.source,
        usageCount: ingredient.usageCount,
        createdAt: ingredient.createdAt
      }
    }))

    // Combine results: UserIngredients first, then USDA results
    const combinedFoods = [
      ...userIngredientFoods,
      ...usdaResult.foods
    ]

    // Remove duplicates (if a user ingredient matches a USDA food)
    const seen = new Set()
    const uniqueFoods = combinedFoods.filter(food => {
      const key = `${food.description.toLowerCase()}-${food.brandOwner || ''}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return NextResponse.json({
      success: true,
      foods: uniqueFoods.slice(0, pageSize), // Limit total results
      count: uniqueFoods.length,
      userIngredientsCount: userIngredientFoods.length,
      usdaCount: usdaResult.totalHits
    })

  } catch (error) {
    console.error('Combined search error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed'
      },
      { status: 500 }
    )
  }
}
