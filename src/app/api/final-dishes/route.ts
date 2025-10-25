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
      // category, // REMOVED - might be Single Select without "Main Dish" option
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

    // Prepare fields matching exact Airtable schema
    const fields: any = {
      Name: name,
      Components: JSON.stringify(components),
      TotalWeight: totalWeight || 0,
      ServingSize: servingSize || 100,
      ServingsPerContainer: servingsPerContainer || 1,
      NutritionLabel: JSON.stringify(nutritionLabel || {}),
      // Category: REMOVED - might be Single Select without matching option (like Status was)
      Notes: notes || '',
      Status: status || 'Draft', // Must match Airtable Single Select: Draft, Active, or Archived
      CreatedAt: now,
      UpdatedAt: now,
    }

    // Log Components size for debugging
    const componentsJson = JSON.stringify(components)
    const sizeInKB = (new Blob([componentsJson]).size / 1024).toFixed(2)
    console.log(`Components JSON size: ${sizeInKB} KB`)
    
    if (componentsJson.length > 100000) {
      console.warn(`⚠️ Components JSON is ${componentsJson.length} chars (Airtable limit: 100,000)`)
      return NextResponse.json(
        { 
          success: false, 
          error: `Recipe data is too large (${sizeInKB} KB). Airtable Long Text fields have a 100,000 character limit. Try reducing the number of ingredients or simplifying the recipe.`,
          originalError: 'FIELD_TOO_LARGE'
        },
        { status: 400 }
      )
    }

    // Only add arrays if they have values (some Airtable fields might not accept empty arrays)
    if (subRecipeLinks && subRecipeLinks.length > 0) {
      console.log('SubRecipeLinks being sent:', subRecipeLinks)
      console.log('SubRecipeLinks type check:', Array.isArray(subRecipeLinks), subRecipeLinks.map((id: any) => typeof id))
      fields.SubRecipeLinks = subRecipeLinks
    }
    if (allergens && allergens.length > 0) {
      fields.Allergens = allergens
    }

    console.log('Creating final dish with fields:', JSON.stringify(fields, null, 2))

    let record
    try {
      record = await table.create([{ fields }])
    } catch (airtableError: any) {
      // Log the raw Airtable error
      console.error('Raw Airtable error:', airtableError)
      console.error('Airtable error type:', airtableError?.error)
      console.error('Airtable error message:', airtableError?.message)
      console.error('Airtable error statusCode:', airtableError?.statusCode)
      
      // Extract helpful error message
      const errorMsg = airtableError?.message || airtableError?.error || 'Unknown Airtable error'
      
      // Detect specific error types and provide actionable guidance
      if (errorMsg.includes('UNKNOWN_FIELD_NAME') || errorMsg.includes('Unknown field')) {
        const fieldMatch = errorMsg.match(/field name[s]?:?\s*['"]?(\w+)['"]?/i)
        const fieldName = fieldMatch ? fieldMatch[1] : 'unknown'
        throw new Error(
          `Airtable field "${fieldName}" doesn't exist in FinalDishes table. ` +
          `Please check Airtable and ensure the field name matches exactly (case-sensitive). ` +
          `Expected fields: Name, Components, TotalWeight, ServingSize, ServingsPerContainer, ` +
          `NutritionLabel, Category, Notes, Status, CreatedAt, UpdatedAt, SubRecipeLinks, Allergens`
        )
      }
      
      if (errorMsg.includes('INVALID_VALUE_FOR_COLUMN') || errorMsg.includes('invalid value')) {
        throw new Error(
          `Airtable field type mismatch: ${errorMsg}. ` +
          `Check that Status/Category fields accept text values, or are Single Select with correct options.`
        )
      }
      
      if (errorMsg.includes('invalid linked record') || errorMsg.includes('INVALID_RECORD_ID')) {
        throw new Error(
          `SubRecipeLinks field error: One or more sub-recipe IDs are invalid. ` +
          `Ensure SubRecipeLinks is configured as "Link to another record" → SubRecipes table.`
        )
      }
      
      // Generic Airtable error
      throw new Error(`Airtable API Error: ${errorMsg}`)
    }
    
    if (!record || record.length === 0) {
      console.error('Airtable returned empty record array')
      throw new Error('Airtable failed to create record - no response data')
    }

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
        // category: removed
        notes,
        status,
        createdAt: now,
        updatedAt: now,
      }
    })
  } catch (error) {
    console.error('Failed to create final dish:', error)
    
    // Log detailed error info for debugging
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    // Log the full error object to see Airtable-specific details
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    
    // Check if it's an Airtable error
    const errorMessage = error instanceof Error ? error.message : 'Failed to create final dish'
    let detailedError = errorMessage
    
    // Extract more details from Airtable errors
    if (errorMessage.includes('INVALID_REQUEST_BODY') || errorMessage.includes('INVALID_VALUE_FOR_COLUMN')) {
      detailedError = `Airtable field error: ${errorMessage}. Please check that all fields match the Airtable schema.`
    } else if (errorMessage.includes('AUTHENTICATION_REQUIRED')) {
      detailedError = 'Airtable authentication failed. Check your API token.'
    } else if (errorMessage.includes('INVALID_PERMISSIONS')) {
      detailedError = 'Airtable permission error. Check that your API token has write access to the FinalDishes table.'
    } else if (errorMessage.includes('UNKNOWN_FIELD_NAME')) {
      detailedError = `Airtable field name error: ${errorMessage}. One or more field names don't exist in your Airtable base.`
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: detailedError,
        originalError: errorMessage,
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
