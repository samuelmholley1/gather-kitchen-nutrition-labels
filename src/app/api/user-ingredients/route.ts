import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getUserIngredients, createUserIngredient, updateUserIngredient, deleteUserIngredient } from '@/lib/userIngredients'

// ============================================================================
// USER INGREDIENTS API
// ============================================================================

/**
 * GET /api/user-ingredients
 * List all user ingredients with optional search/filtering
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const ingredients = await getUserIngredients({
      search,
      category,
      limit,
      offset
    })

    return NextResponse.json({
      ok: true,
      data: ingredients,
      meta: {
        total: ingredients.length,
        limit,
        offset
      }
    })

  } catch (error: any) {
    console.error('[UserIngredients] GET error:', error)
    return NextResponse.json({
      ok: false,
      error: error?.message || 'Failed to fetch user ingredients'
    }, { status: 500 })
  }
}

/**
 * POST /api/user-ingredients
 * Create a new user ingredient
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name,
      originalFdcId,
      originalUSDAName,
      customNutrients,
      servingSizeGrams,
      servingSizeDescription,
      brand,
      category,
      tags,
      source,
      overrideReason,
      createdBy
    } = body

    // Validation
    if (!name?.trim()) {
      return NextResponse.json({
        ok: false,
        error: 'Ingredient name is required'
      }, { status: 400 })
    }

    if (!customNutrients || typeof customNutrients !== 'object') {
      return NextResponse.json({
        ok: false,
        error: 'Custom nutrients data is required'
      }, { status: 400 })
    }

    // Validate required nutrients
    const requiredNutrients = ['calories', 'protein', 'totalFat', 'totalCarbohydrate', 'sodium']
    const missingNutrients = requiredNutrients.filter(nutrient => typeof customNutrients[nutrient] !== 'number')

    if (missingNutrients.length > 0) {
      return NextResponse.json({
        ok: false,
        error: `Missing required nutrients: ${missingNutrients.join(', ')}`
      }, { status: 400 })
    }

    const ingredient = await createUserIngredient({
      name: name.trim(),
      originalFdcId,
      originalUSDAName,
      customNutrients,
      servingSizeGrams: servingSizeGrams || 100,
      servingSizeDescription: servingSizeDescription || `${servingSizeGrams || 100}g`,
      brand,
      category,
      tags: tags || [],
      source: source || 'Manual Entry',
      overrideReason,
      createdBy: createdBy || 'system'
    })

    return NextResponse.json({
      ok: true,
      data: ingredient
    }, { status: 201 })

  } catch (error: any) {
    console.error('[UserIngredients] POST error:', error)
    return NextResponse.json({
      ok: false,
      error: error?.message || 'Failed to create user ingredient'
    }, { status: 500 })
  }
}