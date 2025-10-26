import { NextRequest, NextResponse } from 'next/server'
import Airtable from 'airtable'
import { SubRecipe } from '@/types/recipe'

const airtable = new Airtable({ 
  apiKey: process.env.AIRTABLE_PAT_TOKEN || 'placeholder_for_build' 
})
const base = airtable.base(process.env.AIRTABLE_BASE_ID || 'appPlaceholder')
const TABLE_NAME = process.env.AIRTABLE_SUBRECIPES_TABLE || 'SubRecipes'

/**
 * GET /api/sub-recipes
 * Fetch all sub-recipes from Airtable
 */
export async function GET(request: NextRequest) {
  try {
    const records = await base(TABLE_NAME)
      .select({
        sort: [{ field: 'UpdatedAt', direction: 'desc' }]
      })
      .all()

    const subRecipes: SubRecipe[] = records.map(record => ({
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
    }))

    return NextResponse.json({
      success: true,
      subRecipes
    })

  } catch (error) {
    console.error('Error fetching sub-recipes:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch sub-recipes' 
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sub-recipes
 * Create a new sub-recipe in Airtable
 */
export async function POST(request: NextRequest) {
  try {
    const subRecipe: SubRecipe = await request.json()
    
    // Create record in Airtable
    const record = await base(TABLE_NAME).create({
      'Name': subRecipe.name,
      'Ingredients': JSON.stringify(subRecipe.ingredients),
      'TotalWeight': subRecipe.finalWeight,
      'YieldMultiplier': subRecipe.yieldPercentage / 100,
      'ServingSize': subRecipe.servingSize,
      'ServingsPerRecipe': subRecipe.servingsPerRecipe,
      'NutritionProfile': JSON.stringify(subRecipe.nutritionProfile),
      'CustomConversions': JSON.stringify({}), // Empty for now
      'Category': subRecipe.category || '',
      'Notes': subRecipe.notes || '',
      'CreatedAt': new Date().toISOString(),
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
    console.error('Error creating sub-recipe:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create sub-recipe' 
      },
      { status: 500 }
    )
  }
}
