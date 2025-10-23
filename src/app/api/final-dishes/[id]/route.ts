import { NextRequest, NextResponse } from 'next/server'
import Airtable from 'airtable'

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT_TOKEN! })
  .base(process.env.AIRTABLE_BASE_ID!)

const table = base(process.env.AIRTABLE_FINALDISHES_TABLE || 'FinalDishes')

/**
 * GET /api/final-dishes/[id]
 * Get a single final dish by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const record = await table.find(params.id)

    const finalDish = {
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
    }

    return NextResponse.json({ 
      success: true, 
      finalDish 
    })
  } catch (error) {
    console.error('Failed to fetch final dish:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Final dish not found' 
      },
      { status: 404 }
    )
  }
}

/**
 * PUT /api/final-dishes/[id]
 * Update a final dish
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      status
    } = body

    const now = new Date().toISOString()

    const updateFields: any = {
      UpdatedAt: now
    }

    if (name !== undefined) updateFields.Name = name
    if (components !== undefined) updateFields.Components = JSON.stringify(components)
    if (totalWeight !== undefined) updateFields.TotalWeight = totalWeight
    if (servingSize !== undefined) updateFields.ServingSize = servingSize
    if (servingsPerContainer !== undefined) updateFields.ServingsPerContainer = servingsPerContainer
    if (nutritionLabel !== undefined) updateFields.NutritionLabel = JSON.stringify(nutritionLabel)
    if (subRecipeLinks !== undefined) updateFields.SubRecipeLinks = subRecipeLinks
    if (allergens !== undefined) updateFields.Allergens = allergens
    if (category !== undefined) updateFields.Category = category
    if (notes !== undefined) updateFields.Notes = notes
    if (status !== undefined) updateFields.Status = status

    const record = await table.update([
      {
        id: params.id,
        fields: updateFields
      }
    ])

    return NextResponse.json({
      success: true,
      finalDish: {
        id: record[0].id,
        ...body,
        updatedAt: now
      }
    })
  } catch (error) {
    console.error('Failed to update final dish:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update final dish' 
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/final-dishes/[id]
 * Delete a final dish
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await table.destroy([params.id])

    return NextResponse.json({
      success: true,
      message: 'Final dish deleted successfully'
    })
  } catch (error) {
    console.error('Failed to delete final dish:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete final dish' 
      },
      { status: 500 }
    )
  }
}
