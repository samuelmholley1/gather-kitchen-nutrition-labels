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

    // Prepare fields with validation
    const fields: any = {
      Name: name,
      Components: JSON.stringify(components),
      TotalWeight: totalWeight || 0,
      ServingSize: servingSize || 100,
      ServingsPerContainer: servingsPerContainer || 1,
      NutritionLabel: JSON.stringify(nutritionLabel || {}),
      Category: category || '',
      Notes: notes || '',
      Status: status,
      CreatedAt: now,
      UpdatedAt: now,
    }

    // Only add arrays if they have values (some Airtable fields might not accept empty arrays)
    if (subRecipeLinks && subRecipeLinks.length > 0) {
      fields.SubRecipeLinks = subRecipeLinks
    }
    if (allergens && allergens.length > 0) {
      fields.Allergens = allergens
    }

    console.log('Creating final dish with fields:', JSON.stringify(fields, null, 2))

    const record = await table.create([{ fields }])

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
    
    // Log detailed error info
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    // Check if it's an Airtable error
    const errorMessage = error instanceof Error ? error.message : 'Failed to create final dish'
    let detailedError = errorMessage
    
    // Extract more details from Airtable errors
    if (errorMessage.includes('INVALID_REQUEST_BODY') || errorMessage.includes('INVALID_VALUE_FOR_COLUMN')) {
      detailedError = `Airtable field error: ${errorMessage}. Please check that all fields match the Airtable schema.`
    } else if (errorMessage.includes('AUTHENTICATION_REQUIRED')) {
      detailedError = 'Airtable authentication failed. Check your API token.'
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: detailedError,
        details: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        } : undefined
      },
      { status: 500 }
    )
  }
}
