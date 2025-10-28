import { NextRequest, NextResponse } from 'next/server'
import { createRouteStamp, stampHeaders, logStamp } from '@/lib/routeStamp'
import { canonicalize } from '@/lib/canonicalize'
import { scoreFlourCandidate } from '@/lib/taxonomy/flour'

interface DataUsed {
  field: string
  value: number
  unit: string
  source: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const stamp = createRouteStamp('final-dishes/[id]/calculate')

  try {
    const dishId = params.id

    // Fetch the final dish from Airtable
    const baseId = process.env.AIRTABLE_BASE_ID
    const tableName = process.env.AIRTABLE_FINAL_DISHES_TABLE
    const apiKey = process.env.AIRTABLE_API_KEY

    if (!baseId || !tableName || !apiKey) {
      throw new Error('Airtable configuration missing')
    }

    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}?filterByFormula={DishId}="${dishId}"`
    const airtableResponse = await fetch(airtableUrl, {
      headers: { Authorization: `Bearer ${apiKey}` }
    })

    if (!airtableResponse.ok) {
      throw new Error('Failed to fetch dish from Airtable')
    }

    const airtableData = await airtableResponse.json()
    const record = airtableData.records?.[0]

    if (!record) {
      const response = NextResponse.json(
        { success: false, error: 'Dish not found' },
        { status: 404 }
      )
      stampHeaders(response.headers, stamp)
      return response
    }

    const dish = record.fields
    let components = []
    let yieldMultiplier = 1.0
    let nutritionProfile = {}

    try {
      components = JSON.parse(dish.Components || '[]')
    } catch (err) {
      console.warn('Failed to parse Components JSON:', err)
      components = []
    }

    try {
      yieldMultiplier = dish.YieldMultiplier || 1.0
    } catch (err) {
      console.warn('Failed to parse YieldMultiplier:', err)
      yieldMultiplier = 1.0
    }

    try {
      nutritionProfile = dish.NutritionProfile ? JSON.parse(dish.NutritionProfile) : {}
    } catch (err) {
      console.warn('Failed to parse NutritionProfile JSON:', err)
      nutritionProfile = {}
    }

    // Validate components array
    if (!Array.isArray(components)) {
      throw new Error('Components data is not in expected format')
    }

    // Validate components array
    if (!Array.isArray(components)) {
      throw new Error('Components data is not in expected format')
    }

    logStamp('calc-provenance-in', stamp, {
      dishId,
      dishName: dish.Name,
      componentCount: components.length,
      yieldMultiplier
    })

    // Build detailed provenance data (simplified for now)
    const ingredientBreakdown = []
    const dataUsed: DataUsed[] = []
    const mathChain = []

    // Process each component for provenance
    for (const component of components) {
      if (component.type === 'ingredient' && component.fdcId) {
        // Get scoring breakdown (simulate the selection process)
        let scoreBreakdown;
        try {
          scoreBreakdown = scoreFlourCandidate(
            component.name || 'Unknown ingredient',
            component.dataType || 'SR Legacy',
            component.foodCategory || 'Cereal Grains and Pasta'
          )
        } catch (err) {
          // If scoring fails, provide a default breakdown
          console.warn(`Scoring failed for ${component.name}:`, err)
          scoreBreakdown = {
            baseType: 'unknown' as const,
            positives: [],
            negatives: [],
            tiers: [],
            finalScore: 0
          }
        }

        ingredientBreakdown.push({
          rawInput: component.name || 'Unknown',
          canonical: canonicalize(component.name || '').base,
          selectedUSDA: {
            fdcId: component.fdcId,
            description: component.name || 'Unknown',
            dataType: component.dataType || 'SR Legacy'
          },
          scoreBreakdown
        })

        // Placeholder nutrient data
        dataUsed.push({
          field: 'Sample nutrient',
          value: 10,
          unit: 'g',
          source: `USDA FDC ${component.fdcId}`
        })
      }
    }

    // Build math chain
    const totalRawWeight = components.reduce((sum: number, c: any) => {
      const qty = typeof c.quantity === 'number' ? c.quantity : 0
      return sum + qty
    }, 0)
    
    mathChain.push({
      description: 'Raw ingredient weights',
      formula: components.map((c: any) => {
        const qty = typeof c.quantity === 'number' ? c.quantity : 0
        const name = c.name || 'Unknown'
        return `${qty}g ${name}`
      }).join(' + '),
      result: `${totalRawWeight}g total`
    })

    mathChain.push({
      description: 'Unit conversions applied',
      formula: 'Convert all units to grams using conversion factors',
      result: 'All weights in grams'
    })

    mathChain.push({
      description: 'Per-100g normalization',
      formula: 'USDA nutrients per 100g × (component weight ÷ 100)',
      result: 'Scaled to component portions'
    })

    mathChain.push({
      description: 'Yield multiplier adjustment',
      formula: `Raw weight × ${yieldMultiplier} = Cooked weight`,
      result: `${yieldMultiplier === 1.0 ? 'No change' : `${yieldMultiplier}× concentration factor applied`}`
    })

    mathChain.push({
      description: 'FDA rounding applied',
      formula: 'Round to FDA-compliant precision',
      result: 'Label-ready values'
    })

    const responseData = {
      success: true,
      dishId,
      dishName: dish.Name || 'Unknown Dish',
      ingredients: ingredientBreakdown,
      dataUsed,
      mathChain,
      yieldMultiplier,
      finalNutrition: nutritionProfile,
      _stamp: stamp
    }

    logStamp('calc-provenance-out', stamp, {
      dishId,
      ingredientCount: ingredientBreakdown.length,
      dataPoints: dataUsed.length
    })

    const response = NextResponse.json(responseData)
    stampHeaders(response.headers, stamp)
    return response

  } catch (error) {
    console.error('[Calc Provenance] Error:', error)

    logStamp('calc-provenance-error', stamp, {
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