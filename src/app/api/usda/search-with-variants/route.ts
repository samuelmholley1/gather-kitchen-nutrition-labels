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
        
        const results = await searchFoods(variant, 1)
        
        if (results.foods && results.foods.length > 0) {
          // Found a match! Return the raw food data (not transformed)
          // This keeps it consistent with the /api/usda/search endpoint
          const firstResult = results.foods[0]
          
          if (i > 0) {
            console.log(`[USDA Variants] ✓ Match found on attempt ${i + 1} using variant: "${variant}"`)
          }
          
          return NextResponse.json({
            success: true,
            food: firstResult, // Return raw USDA food object
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
