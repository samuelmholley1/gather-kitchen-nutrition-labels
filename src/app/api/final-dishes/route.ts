import { NextRequest, NextResponse } from 'next/server'
import Airtable from 'airtable'

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT_TOKEN! })
  .base(process.env.AIRTABLE_BASE_ID!)

const table = base(process.env.AIRTABLE_FINALDISHES_TABLE || 'FinalDishes')

/**
 * GET /api/final-dishes
 * List all final dishes
 */
export async function GET() {
  try {
    const records = await table.select({
      sort: [{ field: 'CreatedAt', direction: 'desc' }]
    }).all()

    const finalDishes = records.map(record => ({
      id: record.id,
      name: record.get('Name'),
      components: JSON.parse(record.get('Components') as string || '[]'),
      totalWeight: record.get('TotalWeight'),
      servingSize: record.get('ServingSize'),
      servingsPerContainer: record.get('ServingsPerContainer'),
      nutritionLabel: JSON.parse(record.get('NutritionLabel') as string || '{}'),
      subRecipeLinks: record.get('SubRecipeLinks') || [],
      allergens: record.get('Allergens') || [],
      category: record.get('Category'),
      notes: record.get('Notes'),
      status: record.get('Status'),
      createdAt: record.get('CreatedAt'),
      updatedAt: record.get('UpdatedAt'),
    }))

    return NextResponse.json({ 
      success: true, 
      finalDishes 
    })
  } catch (error) {
    console.error('Failed to fetch final dishes:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch final dishes' 
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/final-dishes
 * Create a new final dish
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      name,
      components,
      totalWeight,
      servingSize,
      servingsPerContainer,
      nutritionLabel,
      subRecipeLinks,
      allergens,
      category,
      notes,
      status = 'Draft'
    } = body

    // Validation
    if (!name || !components || components.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Name and at least one component are required' 
        },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    const record = await table.create([
      {
        fields: {
          Name: name,
          Components: JSON.stringify(components),
          TotalWeight: totalWeight || 0,
          ServingSize: servingSize || 100,
          ServingsPerContainer: servingsPerContainer || 1,
          NutritionLabel: JSON.stringify(nutritionLabel || {}),
          SubRecipeLinks: subRecipeLinks || [],
          Allergens: allergens || [],
          Category: category || '',
          Notes: notes || '',
          Status: status,
          CreatedAt: now,
          UpdatedAt: now,
        }
      }
    ])

    return NextResponse.json({
      success: true,
      recordId: record[0].id,
      finalDish: {
        id: record[0].id,
        name,
        components,
        totalWeight,
        servingSize,
        servingsPerContainer,
        nutritionLabel,
        subRecipeLinks,
        allergens,
        category,
        notes,
        status,
        createdAt: now,
        updatedAt: now,
      }
    })
  } catch (error) {
    console.error('Failed to create final dish:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create final dish' 
      },
      { status: 500 }
    )
  }
}
