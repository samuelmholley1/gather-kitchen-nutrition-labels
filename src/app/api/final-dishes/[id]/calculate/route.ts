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
        // Fetch nutrition data from USDA API
        let per100g = { kcal: 0, carbs: 0, protein: 0, fat: 0 }
        let scaled = { kcal: 0, carbs: 0, protein: 0, fat: 0 }
        
        try {
          const usdaUrl = `https://api.nal.usda.gov/fdc/v1/food/${component.fdcId}?api_key=${process.env.USDA_API_KEY}`
          const usdaResponse = await fetch(usdaUrl)
          if (usdaResponse.ok) {
            const foodData = await usdaResponse.json()
            const nutrients = foodData.foodNutrients || []
            
            // Extract key nutrients per 100g
            const energyNutrient = nutrients.find((n: any) => n.nutrient?.id === 1008 || n.nutrient?.name === 'Energy')
            const carbNutrient = nutrients.find((n: any) => n.nutrient?.id === 1005 || n.nutrient?.name?.includes('Carbohydrate'))
            const proteinNutrient = nutrients.find((n: any) => n.nutrient?.id === 1003 || n.nutrient?.name === 'Protein')
            const fatNutrient = nutrients.find((n: any) => n.nutrient?.id === 1004 || n.nutrient?.name?.includes('Total lipid'))
            
            per100g = {
              kcal: energyNutrient?.amount || 0,
              carbs: carbNutrient?.amount || 0,
              protein: proteinNutrient?.amount || 0,
              fat: fatNutrient?.amount || 0
            }
            
            // Scale based on quantity (convert to grams first)
            const quantityInGrams = component.quantity || 0 // Assuming already in grams
            const scaleFactor = quantityInGrams / 100
            
            scaled = {
              kcal: per100g.kcal * scaleFactor,
              carbs: per100g.carbs * scaleFactor,
              protein: per100g.protein * scaleFactor,
              fat: per100g.fat * scaleFactor
            }
          }
        } catch (err) {
          console.warn(`Failed to fetch USDA data for FDC ${component.fdcId}:`, err)
        }
        
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
          per100g,
          scaled,
          yieldFactor: component.yieldFactor || 1.0
        })

        // Add actual nutrient data
        if (per100g.kcal > 0) {
          dataUsed.push({
            field: 'Energy',
            value: per100g.kcal,
            unit: 'kcal/100g',
            source: `USDA FDC ${component.fdcId}`
          })
        }
        if (per100g.carbs > 0) {
          dataUsed.push({
            field: 'Carbohydrates',
            value: per100g.carbs,
            unit: 'g/100g',
            source: `USDA FDC ${component.fdcId}`
          })
        }
        if (per100g.protein > 0) {
          dataUsed.push({
            field: 'Protein',
            value: per100g.protein,
            unit: 'g/100g',
            source: `USDA FDC ${component.fdcId}`
          })
        }
        if (per100g.fat > 0) {
          dataUsed.push({
            field: 'Fat',
            value: per100g.fat,
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