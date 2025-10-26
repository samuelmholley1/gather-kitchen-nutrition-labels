import { NextRequest, NextResponse } from 'next/server'
import { searchFoods, getFoodDetails, transformUSDAFood } from '@/lib/usda'
import { generateSearchVariants } from '@/lib/smartRecipeParser'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/usda/search-with-variants
 * 
 * Search USDA database with automatic fallback to query variants
 * Tries multiple search queries until a match is found
 * 
 * Request body:
 * {
 *   ingredient: string  // Original ingredient name
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   food?: USDAFood      // First matching food (if found)
 *   variantUsed?: string // Which variant succeeded
 *   attemptNumber?: number // Which attempt succeeded (1-based)
 *   variantsTried: string[] // All variants that were attempted
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ingredient } = body

    if (!ingredient || typeof ingredient !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid ingredient parameter' },
        { status: 400 }
      )
    }

    // Generate search variants
    const variants = generateSearchVariants(ingredient)
    
    if (variants.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid search variants could be generated',
        variantsTried: []
      })
    }

    console.log(`[USDA Variants] Searching for "${ingredient}" with ${variants.length} variants`)

    // Try each variant in sequence
    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i]
      
      try {
        console.log(`[USDA Variants] Attempt ${i + 1}/${variants.length}: "${variant}"`)
        
        // Get top 10 results to score them
        const results = await searchFoods(variant, 10)
        
        if (results.foods && results.foods.length > 0) {
          // Score and rank results to prefer common ingredients over specialty ones
          // BUT: Don't penalize specialty ingredients if they're explicitly in the query
          const queryLower = variant.toLowerCase()
          
          const scoredFoods = results.foods.map(food => {
            let score = 0
            const desc = food.description?.toLowerCase() || ''
            
            // BOOST common/generic ingredients
            if (desc.includes('all-purpose') || desc.includes('all purpose')) score += 100
            if (desc.includes('white') && desc.includes('flour')) score += 80
            if (desc.includes('wheat flour')) score += 70
            if (desc.includes('unenriched') || desc.includes('enriched')) score += 50
            if (desc.includes('raw') || desc.includes('fresh')) score += 30
            
            // ROBUST FLOUR SOLUTION: When query is just "flour", massively boost standard all-purpose flour
            // This prevents specialty flours from winning even with penalties
            if (queryLower.trim() === 'flour' || queryLower.trim() === 'flours') {
              if (desc.includes('wheat flour, white, all-purpose, enriched, bleached')) score += 600 // Exact match for standard bleached flour
              if (desc.includes('wheat flour, white, all-purpose, enriched')) score += 500 // Standard enriched flour (may be bleached or unbleached)
              if (desc.includes('all-purpose') && desc.includes('wheat') && desc.includes('bleached')) score += 450
              if (desc.includes('all-purpose') && desc.includes('wheat')) score += 400
              if (desc.includes('white flour') && desc.includes('wheat')) score += 300
            }
            
            // SPECIFIC HANDLING: "flour, sifted" should always match standard all-purpose flour
            if (queryLower.includes('flour, sifted') || queryLower.includes('sifted flour')) {
              if (desc.includes('wheat flour, white, all-purpose, enriched, bleached')) score += 1000 // Exact match for standard bleached flour
              if (desc.includes('wheat flour, white, all-purpose, enriched')) score += 800
              if (desc.includes('all-purpose') && desc.includes('wheat')) score += 600 // Additional boost for any all-purpose wheat flour
              if (desc.includes('all-purpose') && desc.includes('flour')) score += 400 // Boost any all-purpose flour
            }
            
            // BOOST fresh/raw eggs over dried/processed
            if ((desc.includes('egg') || desc.includes('eggs')) && (desc.includes('raw') || desc.includes('fresh'))) score += 50
            if ((desc.includes('egg white') || desc.includes('egg whites')) && !desc.includes('dried') && !desc.includes('powder')) score += 40
            
            // PENALIZE specialty ingredients ONLY if not in the original query
            // This allows "almond flour" to match almond flour, but "flour" won't match almond flour
            if (desc.includes('almond') && !queryLower.includes('almond')) score -= 100
            if (desc.includes('coconut') && !queryLower.includes('coconut')) score -= 100
            if (desc.includes('amaranth') && !queryLower.includes('amaranth')) score -= 100
            if (desc.includes('barley') && !queryLower.includes('barley')) score -= 100
            if (desc.includes('rye') && !queryLower.includes('rye')) score -= 100
            if (desc.includes('spelt') && !queryLower.includes('spelt')) score -= 100
            if (desc.includes('cassava') && !queryLower.includes('cassava')) score -= 100
            if (desc.includes('tapioca') && !queryLower.includes('tapioca')) score -= 100
            if (desc.includes('chestnut') && !queryLower.includes('chestnut')) score -= 100
            if (desc.includes('chickpea') && !queryLower.includes('chickpea')) score -= 100
            if (desc.includes('soy') && !queryLower.includes('soy')) score -= 100
            if (desc.includes('lentil') && !queryLower.includes('lentil')) score -= 100
            if (desc.includes('quinoa') && !queryLower.includes('quinoa')) score -= 100
            if (desc.includes('arrowroot') && !queryLower.includes('arrowroot')) score -= 100
            if (desc.includes('carob') && !queryLower.includes('carob')) score -= 100
            if (desc.includes('buckwheat') && !queryLower.includes('buckwheat')) score -= 100
            if (desc.includes('rice flour') && !queryLower.includes('rice')) score -= 100
            if (desc.includes('oat flour') && !queryLower.includes('oat')) score -= 100
            if (desc.includes('corn flour') && !queryLower.includes('corn')) score -= 100
            if (desc.includes('potato flour') && !queryLower.includes('potato')) score -= 100
            if (desc.includes('sorghum') && !queryLower.includes('sorghum')) score -= 100
            if (desc.includes('millet') && !queryLower.includes('millet')) score -= 100
            if (desc.includes('teff') && !queryLower.includes('teff')) score -= 100
            if (desc.includes('kamut') && !queryLower.includes('kamut')) score -= 100
            if (desc.includes('einkorn') && !queryLower.includes('einkorn')) score -= 100
            if (desc.includes('emmer') && !queryLower.includes('emmer')) score -= 100
            if (desc.includes('farro') && !queryLower.includes('farro')) score -= 100
            if (desc.includes('semolina') && !queryLower.includes('semolina')) score -= 100
            if ((desc.includes('gluten-free') || desc.includes('gluten free')) && !queryLower.includes('gluten')) score -= 70
            if (desc.includes('organic') && !queryLower.includes('organic')) score -= 40
            if ((desc.includes('whole wheat') || desc.includes('whole grain')) && !queryLower.includes('whole')) score -= 50
            if ((desc.includes('buckwheat') || desc.includes('rice flour') || desc.includes('oat flour')) && 
                !queryLower.includes('buckwheat') && !queryLower.includes('rice') && !queryLower.includes('oat')) score -= 80
            
            // PENALIZE wrong ingredient types
            if (desc.includes('sauce') && !queryLower.includes('sauce')) score -= 100
            
            // PENALIZE processed/specialty forms
            if (desc.includes('dried') && !queryLower.includes('dried')) score -= 60
            if (desc.includes('powder') && !queryLower.includes('powder')) score -= 60
            if (desc.includes('freeze-dried') || desc.includes('freeze dried')) score -= 80
            if (desc.includes('dehydrated') && !queryLower.includes('dehydrated')) score -= 60
            
            // PENALIZE Italian 00 flour (very specialty) unless explicitly requested
            if ((desc.includes('00') || desc.includes('tipo 00')) && !queryLower.includes('00')) score -= 100
            
            // EXTRA PENALTY: For "flour, sifted" queries, heavily penalize specialty flours
            if (queryLower.includes('flour, sifted') || queryLower.includes('sifted flour')) {
              if ((desc.includes('00') || desc.includes('tipo 00'))) score -= 500 // Massive penalty for 00 flour in sifted queries
              if (desc.includes('bread flour') || desc.includes('cake flour')) score -= 300 // Penalize other specialty flours too
            }
            
            // Prefer Foundation/SR Legacy over Branded
            // Foundation & SR Legacy are USDA's standardized reference data (generic ingredients)
            // Branded are specific products (Gold Medal, Pillsbury, etc.) - avoid unless needed
            if (food.dataType === 'Foundation') score += 150
            if (food.dataType === 'SR Legacy') score += 120
            if (food.dataType === 'Branded') score -= 80
            
            // Prefer shorter descriptions (more generic)
            if (desc.length < 30) score += 20
            if (desc.length > 60) score -= 20
            
            return { food, score }
          })
          
          // Sort by score descending
          scoredFoods.sort((a, b) => b.score - a.score)
          
          const bestFood = scoredFoods[0].food
          
          if (i > 0 || scoredFoods[0].score !== 0) {
            console.log(`[USDA Variants] ✓ Match found on attempt ${i + 1} using variant: "${variant}"`)
            console.log(`[USDA Variants] Selected: "${bestFood.description}" (score: ${scoredFoods[0].score})`)
          }
          
          return NextResponse.json({
            success: true,
            food: bestFood, // Return best-scored food
            variantUsed: variant,
            attemptNumber: i + 1,
            variantsTried: variants.slice(0, i + 1)
          })
        } else {
          console.log(`[USDA Variants] No results for variant: "${variant}"`)
        }
      } catch (error) {
        console.error(`[USDA Variants] Error searching variant "${variant}":`, error)
        // Continue to next variant
      }
    }

    // All variants failed
    console.warn(`[USDA Variants] All ${variants.length} variants failed for "${ingredient}"`)
    
    return NextResponse.json({
      success: false,
      error: 'No matches found for any search variant',
      variantsTried: variants
    })

  } catch (error) {
    console.error('[USDA Variants] API error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        variantsTried: []
      },
      { status: 500 }
    )
  }
}
