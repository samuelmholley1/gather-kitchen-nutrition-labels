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
  
  console.log('[CALCULATE] === START ===')
  console.log('[CALCULATE] Dish ID:', params.id)

  try {
    const dishId = params.id

    // Fetch the final dish from Airtable
    const baseId = process.env.AIRTABLE_BASE_ID
    const tableName = process.env.AIRTABLE_FINALDISHES_TABLE || 'FinalDishes'
    const apiKey = process.env.AIRTABLE_PAT_TOKEN || process.env.AIRTABLE_API_KEY

    console.log('[CALCULATE] Config:', {
      hasBaseId: !!baseId,
      baseIdLength: baseId?.length,
      tableName,
      hasApiKey: !!apiKey,
      apiKeyPrefix: apiKey?.substring(0, 10)
    })

    if (!baseId || !tableName || !apiKey) {
      console.error('[CALCULATE] Missing config:', { hasBaseId: !!baseId, tableName, hasApiKey: !!apiKey })
      throw new Error('Airtable configuration missing')
    }

    // Use direct record ID fetch instead of filterByFormula
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}/${dishId}`
    console.log('[CALCULATE] Fetching:', airtableUrl)
    
    const airtableResponse = await fetch(airtableUrl, {
      headers: { Authorization: `Bearer ${apiKey}` }
    })

    console.log('[CALCULATE] Airtable response status:', airtableResponse.status)

    if (!airtableResponse.ok) {
      const errorText = await airtableResponse.text()
      console.error('[CALCULATE] Airtable error response:', errorText)
      
      if (airtableResponse.status === 404) {
        const response = NextResponse.json(
          { success: false, error: 'Dish not found' },
          { status: 404 }
        )
        stampHeaders(response.headers, stamp)
        return response
      }
      throw new Error(`Failed to fetch dish from Airtable: ${airtableResponse.status} - ${errorText}`)
    }

    console.log('[CALCULATE] Parsing Airtable response...')
    const record = await airtableResponse.json()
    console.log('[CALCULATE] Record keys:', Object.keys(record))
    console.log('[CALCULATE] Field keys:', Object.keys(record.fields || {}))
    
    const dish = record.fields
    let components = []
    let yieldMultiplier = 1.0
    let nutritionProfile = {}

    console.log('[CALCULATE] Dish name:', dish.Name)
    console.log('[CALCULATE] Components type:', typeof dish.Components)

    try {
      const componentsRaw = dish.Components
      if (typeof componentsRaw === 'string') {
        components = JSON.parse(componentsRaw)
      } else if (Array.isArray(componentsRaw)) {
        components = componentsRaw
      }
      console.log('[CALCULATE] Parsed components:', components.length, 'items')
    } catch (err) {
      console.error('[CALCULATE] Failed to parse Components:', err)
      components = []
    }

    try {
      yieldMultiplier = dish.YieldMultiplier || 1.0
      console.log('[CALCULATE] YieldMultiplier:', yieldMultiplier)
    } catch (err) {
      console.warn('[CALCULATE] Failed to parse YieldMultiplier:', err)
      yieldMultiplier = 1.0
    }

    try {
      const nutritionRaw = dish.NutritionProfile
      if (typeof nutritionRaw === 'string') {
        nutritionProfile = JSON.parse(nutritionRaw)
      } else if (typeof nutritionRaw === 'object' && nutritionRaw !== null) {
        nutritionProfile = nutritionRaw
      }
      console.log('[CALCULATE] NutritionProfile parsed')
    } catch (err) {
      console.error('[CALCULATE] Failed to parse NutritionProfile:', err)
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
      console.log('[CALCULATE] Processing component:', JSON.stringify(component, null, 2))
      
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
          scoreBreakdown,
          quantity: component.quantity || 0,
          unit: component.unit || 'g',
          per100g: {
            kcal: component.kcal_per_100g || 0,
            carbs: component.carbs_per_100g || 0,
            protein: component.protein_per_100g || 0,
            fat: component.fat_per_100g || 0
          },
          scaled: {
            kcal: component.kcal_scaled || 0,
            carbs: component.carbs_scaled || 0,
            protein: component.protein_scaled || 0,
            fat: component.fat_scaled || 0
          },
          yieldFactor: component.yieldFactor || 1.0
        })

        // Add actual nutrient data
        if (component.kcal_per_100g) {
          dataUsed.push({
            field: 'Energy',
            value: component.kcal_per_100g,
            unit: 'kcal/100g',
            source: `USDA FDC ${component.fdcId}`
          })
        }
        if (component.carbs_per_100g) {
          dataUsed.push({
            field: 'Carbohydrates',
            value: component.carbs_per_100g,
            unit: 'g/100g',
            source: `USDA FDC ${component.fdcId}`
          })
        }
        if (component.protein_per_100g) {
          dataUsed.push({
            field: 'Protein',
            value: component.protein_per_100g,
            unit: 'g/100g',
            source: `USDA FDC ${component.fdcId}`
          })
        }
        if (component.fat_per_100g) {
          dataUsed.push({
            field: 'Fat',
            value: component.fat_per_100g,
            unit: 'g/100g',
            source: `USDA FDC ${component.fdcId}`
          })
        }
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
    console.error('[CALCULATE] === ERROR ===')
    console.error('[CALCULATE] Error type:', error?.constructor?.name)
    console.error('[CALCULATE] Error message:', error instanceof Error ? error.message : String(error))
    console.error('[CALCULATE] Error stack:', error instanceof Error ? error.stack : 'No stack')

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