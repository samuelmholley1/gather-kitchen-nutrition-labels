import { NextRequest, NextResponse } from 'next/server'
import { getIngredientHistory } from '@/lib/userIngredients'

/**
 * GET /api/user-ingredients/[id]/history
 * Get change history for a specific ingredient
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    const history = await getIngredientHistory(params.id, limit)

    return NextResponse.json({
      success: true,
      data: history
    })
  } catch (error) {
    console.error('[API] Error fetching ingredient history:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch ingredient history'
      },
      { status: 500 }
    )
  }
}