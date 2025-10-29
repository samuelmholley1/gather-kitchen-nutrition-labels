import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getUserIngredient, updateUserIngredient, deleteUserIngredient } from '@/lib/userIngredients'

// ============================================================================
// INDIVIDUAL USER INGREDIENT API
// ============================================================================

/**
 * GET /api/user-ingredients/[id]
 * Get a specific user ingredient by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json({
        ok: false,
        error: 'Ingredient ID is required'
      }, { status: 400 })
    }

    const ingredient = await getUserIngredient(id)

    if (!ingredient) {
      return NextResponse.json({
        ok: false,
        error: 'User ingredient not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      data: ingredient
    })

  } catch (error: any) {
    console.error('[UserIngredient] GET error:', error)
    return NextResponse.json({
      ok: false,
      error: error?.message || 'Failed to fetch user ingredient'
    }, { status: 500 })
  }
}

/**
 * PUT /api/user-ingredients/[id]
 * Update a user ingredient
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await req.json()

    if (!id) {
      return NextResponse.json({
        ok: false,
        error: 'Ingredient ID is required'
      }, { status: 400 })
    }

    const {
      name,
      customNutrients,
      servingSizeGrams,
      servingSizeDescription,
      brand,
      category,
      tags,
      overrideReason
    } = body

    // Validation
    if (name !== undefined && !name?.trim()) {
      return NextResponse.json({
        ok: false,
        error: 'Ingredient name cannot be empty'
      }, { status: 400 })
    }

    if (customNutrients !== undefined) {
      if (!customNutrients || typeof customNutrients !== 'object') {
        return NextResponse.json({
          ok: false,
          error: 'Custom nutrients must be a valid object'
        }, { status: 400 })
      }

      // Validate required nutrients if nutrients are being updated
      const requiredNutrients = ['calories', 'protein', 'totalFat', 'totalCarbohydrate', 'sodium']
      const missingNutrients = requiredNutrients.filter(nutrient => typeof customNutrients[nutrient] !== 'number')

      if (missingNutrients.length > 0) {
        return NextResponse.json({
          ok: false,
          error: `Missing required nutrients: ${missingNutrients.join(', ')}`
        }, { status: 400 })
      }
    }

    const ingredient = await updateUserIngredient(id, {
      ...(name && { name: name.trim() }),
      ...(customNutrients && { customNutrients }),
      ...(servingSizeGrams && { servingSizeGrams }),
      ...(servingSizeDescription && { servingSizeDescription }),
      ...(brand !== undefined && { brand }),
      ...(category && { category }),
      ...(tags && { tags }),
      ...(overrideReason !== undefined && { overrideReason })
    })

    if (!ingredient) {
      return NextResponse.json({
        ok: false,
        error: 'User ingredient not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      data: ingredient
    })

  } catch (error: any) {
    console.error('[UserIngredient] PUT error:', error)
    return NextResponse.json({
      ok: false,
      error: error?.message || 'Failed to update user ingredient'
    }, { status: 500 })
  }
}

/**
 * DELETE /api/user-ingredients/[id]
 * Delete a user ingredient (soft delete)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json({
        ok: false,
        error: 'Ingredient ID is required'
      }, { status: 400 })
    }

    // Check if ingredient is being used in recipes before deletion
    // This would require checking SubRecipes and FinalDishes tables
    // For now, we'll implement a soft delete approach

    const success = await deleteUserIngredient(id)

    if (!success) {
      return NextResponse.json({
        ok: false,
        error: 'User ingredient not found or could not be deleted'
      }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      message: 'User ingredient deleted successfully'
    })

  } catch (error: any) {
    console.error('[UserIngredient] DELETE error:', error)
    return NextResponse.json({
      ok: false,
      error: error?.message || 'Failed to delete user ingredient'
    }, { status: 500 })
  }
}