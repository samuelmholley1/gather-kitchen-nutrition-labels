import { NextRequest, NextResponse } from 'next/server'
import Airtable from 'airtable'
import { applyManualOverride } from '@/lib/nutritionAudit'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!)
    const { overrides, reason, editedBy = 'Unknown User' } = await request.json()

    if (!overrides || !reason) {
      return NextResponse.json(
        { error: 'Overrides and reason are required' },
        { status: 400 }
      )
    }

    // Fetch current dish data
    const records = await base('FinalDishes').select({
      filterByFormula: `{id} = '${params.id}'`
    }).firstPage()

    if (records.length === 0) {
      return NextResponse.json(
        { error: 'Final dish not found' },
        { status: 404 }
      )
    }

    const record = records[0]
    const currentNutritionProfile = record.get('NutritionProfile')

    if (!currentNutritionProfile) {
      return NextResponse.json(
        { error: 'No nutrition data found for this dish' },
        { status: 400 }
      )
    }

    let nutritionData
    try {
      nutritionData = typeof currentNutritionProfile === 'string'
        ? JSON.parse(currentNutritionProfile)
        : currentNutritionProfile
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid nutrition data format' },
        { status: 400 }
      )
    }

    // Apply manual override using audit trail helper
    const updatedNutritionData = applyManualOverride(
      nutritionData,
      overrides,
      reason,
      editedBy
    )

    // Update the record in Airtable
    await base('FinalDishes').update(record.id, {
      NutritionProfile: JSON.stringify(updatedNutritionData)
    })

    return NextResponse.json({
      success: true,
      message: 'Manual overrides applied successfully',
      nutritionData: updatedNutritionData
    })

  } catch (error) {
    console.error('Manual override error:', error)
    return NextResponse.json(
      { error: 'Failed to apply manual overrides' },
      { status: 500 }
    )
  }
}