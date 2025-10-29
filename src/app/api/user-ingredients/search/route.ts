import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { searchUserIngredients } from '@/lib/userIngredients'

// ============================================================================
// USER INGREDIENTS SEARCH API
// ============================================================================

/**
 * GET /api/user-ingredients/search?q=query
 * Search user ingredients for integration with USDA search
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!query?.trim()) {
      return NextResponse.json({
        ok: false,
        error: 'Search query is required'
      }, { status: 400 })
    }

    const ingredients = await searchUserIngredients(query.trim(), limit)

    // Format for USDA search integration
    const formattedResults = ingredients.map(ingredient => ({
      id: ingredient.id,
      name: ingredient.name,
      brand: ingredient.brand,
      category: ingredient.category,
      tags: ingredient.tags,
      source: ingredient.source,
      nutrients: ingredient.customNutrients,
      servingSize: ingredient.servingSizeDescription,
      isUserIngredient: true,
      usageCount: ingredient.usageCount
    }))

    return NextResponse.json({
      ok: true,
      data: formattedResults,
      meta: {
        query: query.trim(),
        total: ingredients.length,
        limit
      }
    })

  } catch (error: any) {
    console.error('[UserIngredientsSearch] GET error:', error)
    return NextResponse.json({
      ok: false,
      error: error?.message || 'Failed to search user ingredients'
    }, { status: 500 })
  }
}