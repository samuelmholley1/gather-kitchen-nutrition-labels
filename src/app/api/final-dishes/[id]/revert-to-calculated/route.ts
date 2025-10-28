/**
 * API Route: POST /api/final-dishes/[id]/revert-to-calculated
 *
 * Reverts manually edited nutrition values back to calculated values.
 * Removes manual override and restores auto-calculated nutrition.
 *
 * Request Body: { reason?: string }
 * Response: { success: true, nutritionData: NutritionLabelData }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRouteStamp, stampHeaders, logStamp } from '@/lib/routeStamp'
import { revertToCalculated } from '@/lib/nutritionAudit'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const stamp = createRouteStamp('final-dishes/[id]/revert-to-calculated')

  console.log('[REVERT] === START ===')
  console.log('[REVERT] Dish ID:', params.id)

  try {
    const dishId = params.id

    // Parse request body
    const body = await request.json()
    const { reason } = body

    // Fetch current dish data from Airtable
    const baseId = process.env.AIRTABLE_BASE_ID
    const tableName = process.env.AIRTABLE_FINALDISHES_TABLE || 'FinalDishes'
    const apiKey = process.env.AIRTABLE_PAT_TOKEN || process.env.AIRTABLE_API_KEY

    if (!baseId || !tableName || !apiKey) {
      throw new Error('Airtable configuration missing')
    }

    // Get current nutrition data
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}/${dishId}`
    const airtableResponse = await fetch(airtableUrl, {
      headers: { Authorization: `Bearer ${apiKey}` }
    })

    if (!airtableResponse.ok) {
      const errorText = await airtableResponse.text()
      console.error('[REVERT] Airtable fetch error:', errorText)

      if (airtableResponse.status === 404) {
        const response = NextResponse.json(
          { success: false, error: 'Dish not found' },
          { status: 404 }
        )
        stampHeaders(response.headers, stamp)
        return response
      }
      throw new Error(`Failed to fetch dish: ${airtableResponse.status}`)
    }

    const record = await airtableResponse.json()
    const dish = record.fields
    let nutritionProfile = {}

    try {
      const nutritionRaw = dish.NutritionProfile
      if (typeof nutritionRaw === 'string') {
        nutritionProfile = JSON.parse(nutritionRaw)
      } else if (typeof nutritionRaw === 'object' && nutritionRaw !== null) {
        nutritionProfile = nutritionRaw
      }
    } catch (err) {
      console.error('[REVERT] Failed to parse NutritionProfile:', err)
      nutritionProfile = {}
    }

    // Normalize current data
    const currentData = {
      values: (nutritionProfile as any).values || nutritionProfile,
      calculatedValues: (nutritionProfile as any).calculatedValues || (nutritionProfile as any).values || nutritionProfile,
      source: (nutritionProfile as any).source || 'calculated',
      lastCalculated: (nutritionProfile as any).lastCalculated || new Date().toISOString(),
      manualEditMetadata: (nutritionProfile as any).manualEditMetadata
    }

    // Revert to calculated values
    const revertedData = revertToCalculated(currentData)

    // Update Airtable with reverted data
    const updateUrl = `https://api.airtable.com/v0/${baseId}/${tableName}/${dishId}`
    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          NutritionProfile: JSON.stringify(revertedData)
        }
      })
    })

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text()
      console.error('[REVERT] Airtable update error:', errorText)
      throw new Error(`Failed to update dish: ${updateResponse.status}`)
    }

    logStamp('revert-to-calculated', stamp, {
      dishId,
      reason,
      hadManualOverride: currentData.source === 'manual_override'
    })

    const response = NextResponse.json({
      success: true,
      nutritionData: revertedData,
      message: 'Successfully reverted to calculated values',
      _stamp: stamp
    })

    stampHeaders(response.headers, stamp)
    return response

  } catch (error) {
    console.error('[REVERT] === ERROR ===')
    console.error('[REVERT] Error:', error instanceof Error ? error.message : String(error))

    logStamp('revert-to-calculated-error', stamp, {
      error: error instanceof Error ? error.message : 'Unknown'
    })

    const response = NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        _stamp: stamp
      },
      { status: 500 }
    )

    stampHeaders(response.headers, stamp)
    return response
  }
}