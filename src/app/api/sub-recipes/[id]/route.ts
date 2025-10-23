import { NextRequest, NextResponse } from 'next/server'
import Airtable from 'airtable'

const airtable = new Airtable({ 
  apiKey: process.env.AIRTABLE_PAT_TOKEN || 'placeholder_for_build' 
})
const base = airtable.base(process.env.AIRTABLE_BASE_ID || 'appPlaceholder')
const TABLE_NAME = process.env.AIRTABLE_SUBRECIPES_TABLE || 'SubRecipes'

/**
 * GET /api/sub-recipes/[id]
 * Fetch a single sub-recipe by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const record = await base(TABLE_NAME).find(params.id)

    const subRecipe = {
      id: record.id,
      name: record.get('Name') as string,
      ingredients: JSON.parse(record.get('Ingredients') as string || '[]'),
      rawWeight: parseFloat(record.get('TotalWeight') as string || '0') / (record.get('YieldMultiplier') as number || 1),
      finalWeight: parseFloat(record.get('TotalWeight') as string || '0'),
      yieldPercentage: (record.get('YieldMultiplier') as number || 1) * 100,
      servingSize: parseFloat(record.get('ServingSize') as string || '100'),
      servingsPerRecipe: parseFloat(record.get('ServingsPerRecipe') as string || '1'),
      nutritionProfile: JSON.parse(record.get('NutritionProfile') as string || '{}'),
      category: record.get('Category') as string,
      notes: record.get('Notes') as string,
      createdAt: record.get('CreatedAt') as string,
      updatedAt: record.get('UpdatedAt') as string
    }

    return NextResponse.json({
      success: true,
      subRecipe
    })

  } catch (error) {
    console.error('Error fetching sub-recipe:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch sub-recipe' 
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/sub-recipes/[id]
 * Delete a sub-recipe by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await base(TABLE_NAME).destroy(params.id)

    return NextResponse.json({
      success: true,
      message: 'Sub-recipe deleted'
    })

  } catch (error) {
    console.error('Error deleting sub-recipe:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete sub-recipe' 
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/sub-recipes/[id]
 * Update a sub-recipe by ID
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const subRecipe = await request.json()

    const record = await base(TABLE_NAME).update(params.id, {
      'Name': subRecipe.name,
      'Ingredients': JSON.stringify(subRecipe.ingredients),
      'TotalWeight': subRecipe.finalWeight,
      'YieldMultiplier': subRecipe.yieldPercentage / 100,
      'ServingSize': subRecipe.servingSize,
      'ServingsPerRecipe': subRecipe.servingsPerRecipe,
      'NutritionProfile': JSON.stringify(subRecipe.nutritionProfile),
      'Category': subRecipe.category || '',
      'Notes': subRecipe.notes || '',
      'UpdatedAt': new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      subRecipe: {
        ...subRecipe,
        id: record.id
      }
    })

  } catch (error) {
    console.error('Error updating sub-recipe:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update sub-recipe' 
      },
      { status: 500 }
    )
  }
}
