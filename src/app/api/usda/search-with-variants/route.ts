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
          const scoredFoods = results.foods.map(food => {
            let score = 0
            const desc = food.description?.toLowerCase() || ''
            
            // BOOST common/generic ingredients
            if (desc.includes('all-purpose') || desc.includes('all purpose')) score += 100
            if (desc.includes('white') && desc.includes('flour')) score += 80
            if (desc.includes('wheat flour')) score += 70
            if (desc.includes('unenriched') || desc.includes('enriched')) score += 50
            if (desc.includes('raw') || desc.includes('fresh')) score += 30
            
            // PENALIZE specialty ingredients
            if (desc.includes('almond')) score -= 100
            if (desc.includes('coconut')) score -= 80
            if (desc.includes('gluten-free') || desc.includes('gluten free')) score -= 70
            if (desc.includes('organic')) score -= 40
            if (desc.includes('whole wheat') || desc.includes('whole grain')) score -= 50
            if (desc.includes('buckwheat') || desc.includes('rice flour') || desc.includes('oat flour')) score -= 80
            
            // Prefer Foundation/SR Legacy over Branded
            if (food.dataType === 'Foundation') score += 60
            if (food.dataType === 'SR Legacy') score += 40
            if (food.dataType === 'Branded') score -= 30
            
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
