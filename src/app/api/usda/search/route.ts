import { NextRequest, NextResponse } from 'next/server'
import { searchFoods } from '@/lib/usda'

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

    // Search USDA database
    const result = await searchFoods(query, pageSize)
    
    return NextResponse.json({
      success: true,
      foods: result.foods,
      count: result.totalHits
    })
    
  } catch (error) {
    console.error('USDA search error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Search failed' 
      },
      { status: 500 }
    )
  }
}
