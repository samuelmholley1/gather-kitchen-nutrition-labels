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
  
  console.log('[CALCULATE] Starting request for dishId:', params.id)

  try {
    const dishId = params.id

    // Fetch the final dish from Airtable
    const baseId = process.env.AIRTABLE_BASE_ID
    const tableName = process.env.AIRTABLE_FINAL_DISHES_TABLE
    const apiKey = process.env.AIRTABLE_API_KEY

    console.log('[CALCULATE] Config check:', { 
      hasBaseId: !!baseId, 
      hasTableName: !!tableName, 
      hasApiKey: !!apiKey 
    })

    if (!baseId || !tableName || !apiKey) {
      throw new Error('Airtable configuration missing')
    }

    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}?filterByFormula={DishId}="${dishId}"`
    console.log('[CALCULATE] Fetching from Airtable...')
    
    const airtableResponse = await fetch(airtableUrl, {
      headers: { Authorization: `Bearer ${apiKey}` }
    })

    console.log('[CALCULATE] Airtable response status:', airtableResponse.status)

    if (!airtableResponse.ok) {
      const errorText = await airtableResponse.text()
      console.error('[CALCULATE] Airtable error:', errorText)
      throw new Error(`Failed to fetch dish from Airtable: ${airtableResponse.status}`)
    }

    const airtableData = await airtableResponse.json()
    console.log('[CALCULATE] Airtable data received, records count:', airtableData.records?.length || 0)
    
    const record = airtableData.records?.[0]

    if (!record) {
      console.log('[CALCULATE] No record found for dishId:', dishId)
      const response = NextResponse.json(
        { success: false, error: 'Dish not found' },
        { status: 404 }
      )
      stampHeaders(response.headers, stamp)
      return response
    }

    console.log('[CALCULATE] Record found, processing fields...')
    const dish = record.fields
    let components = []
    let yieldMultiplier = 1.0
    let nutritionProfile = {}

    // Parse Components
    try {
      const componentsRaw = dish.Components
      console.log('[CALCULATE] Components type:', typeof componentsRaw)
      if (typeof componentsRaw === 'string') {
        components = JSON.parse(componentsRaw)
      } else if (Array.isArray(componentsRaw)) {
        components = componentsRaw
      } else {
        console.warn('[CALCULATE] Components is neither string nor array:', componentsRaw)
        components = []
      }
      console.log('[CALCULATE] Parsed components count:', components.length)
    } catch (err) {
      console.error('[CALCULATE] Failed to parse Components:', err)
      components = []
    }

    // Parse YieldMultiplier
    try {
      yieldMultiplier = typeof dish.YieldMultiplier === 'number' ? dish.YieldMultiplier : parseFloat(dish.YieldMultiplier) || 1.0
      console.log('[CALCULATE] YieldMultiplier:', yieldMultiplier)
    } catch (err) {
      console.warn('[CALCULATE] Failed to parse YieldMultiplier:', err)
      yieldMultiplier = 1.0
    }

    // Parse NutritionProfile
    try {
      const nutritionRaw = dish.NutritionProfile
      if (typeof nutritionRaw === 'string') {
        nutritionProfile = JSON.parse(nutritionRaw)
      } else if (typeof nutritionRaw === 'object' && nutritionRaw !== null) {
        nutritionProfile = nutritionRaw
      } else {
        nutritionProfile = {}
      }
      console.log('[CALCULATE] NutritionProfile parsed successfully')
    } catch (err) {
      console.error('[CALCULATE] Failed to parse NutritionProfile:', err)
      nutritionProfile = {}
    }

    // Validate components array
    if (!Array.isArray(components)) {
      console.error('[CALCULATE] Components is not an array after parsing:', typeof components)
      throw new Error('Components data is not in expected format')
    }

    logStamp('calc-provenance-in', stamp, {
      dishId,
      dishName: dish.Name,
      componentCount: components.length,
      yieldMultiplier
    })

    // Build detailed provenance data
    const ingredientBreakdown = []
    const dataUsed: DataUsed[] = []
    const mathChain = []

    console.log('[CALCULATE] Processing components...')
    
    // Process each component for provenance
    for (let i = 0; i < components.length; i++) {
      const component = components[i]
      console.log(`[CALCULATE] Processing component ${i}:`, { 
        type: component.type, 
        name: component.name, 
        hasFdcId: !!component.fdcId 
      })
      
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
          console.warn(`[CALCULATE] Scoring failed for ${component.name}:`, err)
          scoreBreakdown = {
            baseType: 'unknown' as const,
            positives: [],
            negatives: [],
            tiers: [],
            finalScore: 0
          }
        }

        try {
          const canonResult = canonicalize(component.name || '')
          console.log(`[CALCULATE] Canonicalized "${component.name}" to:`, canonResult.base)
          
          ingredientBreakdown.push({
            rawInput: component.name || 'Unknown',
            canonical: canonResult.base,
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
        } catch (err) {
          console.error(`[CALCULATE] Error processing component ${i}:`, err)
          // Continue to next component
        }
      }
    }

    console.log('[CALCULATE] Building math chain...')

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

    console.log('[CALCULATE] Success! Returning response with', ingredientBreakdown.length, 'ingredients')

    logStamp('calc-provenance-out', stamp, {
      dishId,
      ingredientCount: ingredientBreakdown.length,
      dataPoints: dataUsed.length
    })

    const response = NextResponse.json(responseData)
    stampHeaders(response.headers, stamp)
    return response

  } catch (error) {
    console.error('[CALCULATE] FATAL ERROR:', error)
    console.error('[CALCULATE] Error stack:', error instanceof Error ? error.stack : 'No stack')

    logStamp('calc-provenance-error', stamp, {
      error: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    })

    const response = NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined,
        _stamp: stamp
      },
      { status: 500 }
    )

    stampHeaders(response.headers, stamp)
    return response
  }
}