/**
 * USDA FoodData Central API Service
 * 
 * Handles all interactions with the USDA FoodData Central API:
 * - Food search
 * - Food details retrieval
 * - Nutrient data transformation
 * - Caching in Airtable
 */

import type {
  USDASearchResponse,
  USDAFood,
  NutrientProfile,
  USDAFoodNutrient,
  FoodPortion,
  USDADataWarning,
} from '@/types/nutrition'
import { initializeNutrientProfile } from '@/types/nutrition'
import { requireValidEnvironment } from './validateEnv'

const USDA_API_BASE = 'https://api.nal.usda.gov/fdc/v1'

// Validate environment on server-side
if (typeof window === 'undefined') {
  requireValidEnvironment()
}

// Helper to get API key (throws at runtime, not build time)
function getApiKey(): string {
  const apiKey = process.env.USDA_API_KEY
  if (!apiKey) {
    throw new Error('USDA_API_KEY environment variable is required')
  }
  return apiKey
}

// ============================================================================
// FOOD SEARCH
// ============================================================================

/**
 * Search for foods in the USDA database with retry logic
 * 
 * @param query - Search term (e.g., "apple", "chicken breast")
 * @param pageSize - Number of results per page (default: 50, max: 200)
 * @param pageNumber - Page number for pagination (default: 1)
 * @param dataType - Filter by data type (optional)
 * @param retryCount - Internal retry counter (do not pass manually)
 * @returns Search results with pagination info
 */
export async function searchFoods(
  query: string,
  pageSize: number = 50,
  pageNumber: number = 1,
  dataType?: 'Foundation' | 'SR Legacy' | 'Survey (FNDDS)' | 'Branded',
  retryCount: number = 0
): Promise<USDASearchResponse> {
  const MAX_RETRIES = 3
  const RETRY_DELAY_MS = 1000
  
  const params = new URLSearchParams({
    api_key: getApiKey(),
    query,
    pageSize: Math.min(pageSize, 200).toString(),
    pageNumber: pageNumber.toString(),
  })
  
  if (dataType) {
    params.append('dataType', dataType)
  }
  
  const url = `${USDA_API_BASE}/foods/search?${params}`
  
  // Add timeout to prevent hanging
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
  
  try {
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    
    // Handle rate limiting (429)
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : RETRY_DELAY_MS * Math.pow(2, retryCount)
      
      if (retryCount < MAX_RETRIES) {
        console.warn(`⚠️ USDA API rate limit. Retrying in ${delay}ms... (${retryCount + 1}/${MAX_RETRIES})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return searchFoods(query, pageSize, pageNumber, dataType, retryCount + 1)
      } else {
        throw new Error('USDA API rate limit exceeded. Please try again later.')
      }
    }
    
    // Handle server errors (500+) with retry
    if (response.status >= 500) {
      if (retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, retryCount)
        console.warn(`⚠️ USDA API server error (${response.status}). Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return searchFoods(query, pageSize, pageNumber, dataType, retryCount + 1)
      } else {
        throw new Error(`USDA API server error (${response.status}). Please try again later.`)
      }
    }
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`USDA API search failed: ${response.status} ${error}`)
    }
    
    return await response.json()
  } catch (error) {
    clearTimeout(timeoutId)
    
    // Handle timeout with retry
    if (error instanceof Error && error.name === 'AbortError') {
      if (retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, retryCount)
        console.warn(`⚠️ USDA API timeout. Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return searchFoods(query, pageSize, pageNumber, dataType, retryCount + 1)
      } else {
        throw new Error('USDA API timed out after multiple attempts. Please try again later.')
      }
    }
    
    // Handle network errors with retry
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, retryCount)
        console.warn(`⚠️ Network error. Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return searchFoods(query, pageSize, pageNumber, dataType, retryCount + 1)
      } else {
        throw new Error('Network error connecting to USDA API. Please check your connection.')
      }
    }
    
    throw error
  }
}

// ============================================================================
// FOOD DETAILS
// ============================================================================

/**
 * Get detailed food information by FDC ID
 * 
 * @param fdcId - USDA FoodData Central ID
 * @returns Full food details with nutrients and portions
 */
export async function getFoodDetails(fdcId: number): Promise<any> {
  const url = `${USDA_API_BASE}/food/${fdcId}?api_key=${getApiKey()}`
  
  const response = await fetch(url)
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`USDA API food details failed: ${response.status} ${error}`)
  }
  
  return await response.json()
}

/**
 * Get multiple foods in a single request (batch)
 * 
 * @param fdcIds - Array of FDC IDs (max 20)
 * @returns Array of food details
 */
export async function getFoodsBatch(fdcIds: number[]): Promise<any[]> {
  if (fdcIds.length > 20) {
    throw new Error('Maximum 20 foods per batch request')
  }
  
  const url = `${USDA_API_BASE}/foods?api_key=${getApiKey()}`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fdcIds }),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`USDA API batch request failed: ${response.status} ${error}`)
  }
  
  return await response.json()
}

// ============================================================================
// NUTRIENT MAPPING
// ============================================================================

/**
 * USDA nutrient ID mapping to our NutrientProfile fields
 * 
 * These IDs are from the USDA FoodData Central database.
 * Source: https://fdc.nal.usda.gov/
 */
const NUTRIENT_MAP: Record<number, keyof NutrientProfile> = {
  1008: 'calories',         // Energy (kcal)
  1004: 'totalFat',         // Total lipid (fat)
  1258: 'saturatedFat',     // Fatty acids, total saturated
  1257: 'transFat',         // Fatty acids, total trans
  1253: 'cholesterol',      // Cholesterol
  1093: 'sodium',           // Sodium
  1005: 'totalCarbohydrate',// Carbohydrate, by difference
  1079: 'dietaryFiber',     // Fiber, total dietary
  2000: 'totalSugars',      // Sugars, total including NLEA
  1235: 'addedSugars',      // Sugars, added
  1003: 'protein',          // Protein
  1114: 'vitaminD',         // Vitamin D (D2 + D3)
  1106: 'vitaminA',         // Vitamin A, RAE
  1162: 'vitaminC',         // Vitamin C, total ascorbic acid
  1109: 'vitaminE',         // Vitamin E (alpha-tocopherol)
  1185: 'vitaminK',         // Vitamin K (phylloquinone)
  1165: 'thiamin',          // Thiamin
  1166: 'riboflavin',       // Riboflavin
  1167: 'niacin',           // Niacin
  1175: 'vitaminB6',        // Vitamin B-6
  1190: 'folate',           // Folate, DFE
  1178: 'vitaminB12',       // Vitamin B-12
  1087: 'calcium',          // Calcium, Ca
  1089: 'iron',             // Iron, Fe
  1090: 'magnesium',        // Magnesium, Mg
  1091: 'phosphorus',       // Phosphorus, P
  1092: 'potassium',        // Potassium, K
  1095: 'zinc',             // Zinc, Zn
  1098: 'copper',           // Copper, Cu
  1101: 'manganese',        // Manganese, Mn
  1103: 'selenium',         // Selenium, Se
}

/**
 * Transform USDA nutrient array into our NutrientProfile format
 * 
 * @param usdaNutrients - Array of nutrient data from USDA API
 * @returns Object with normalized nutrient profile per 100g and any data quality warnings
 */
export function transformNutrients(
  usdaNutrients: USDAFoodNutrient[]
): { profile: NutrientProfile; warnings: USDADataWarning[] } {
  const profile = initializeNutrientProfile()
  const warnings: USDADataWarning[] = []
  
  for (const nutrient of usdaNutrients) {
    const field = NUTRIENT_MAP[nutrient.nutrientId]
    
    if (field) {
      // Special handling for calories (convert kcal)
      if (field === 'calories') {
        // USDA provides Energy in kcal (nutrient 1008)
        profile[field] = nutrient.value || 0
      } else {
        // All other nutrients use value as-is
        profile[field] = nutrient.value || 0
      }
    }
  }
  
  // WORKAROUND: Some USDA entries (like "Sugars, granulated" FDC:746784) have 
  // totalSugars=0 but totalCarbohydrate is correct. For pure sugar/sweeteners,
  // if totalSugars is 0 but carbs are very high (>95g/100g), assume it's all sugar.
  if (profile.totalSugars === 0 && profile.totalCarbohydrate >= 95) {
    console.log(`🔧 USDA DATA FIX: totalSugars was 0 but carbs=${profile.totalCarbohydrate}g/100g. Assuming pure sugar.`)
    warnings.push({
      type: 'missing_sugar',
      message: `USDA database missing sugar data. Inferred ${profile.totalCarbohydrate.toFixed(1)}g sugar from carbohydrate content.`,
      originalValue: 0,
      correctedValue: profile.totalCarbohydrate
    })
    profile.totalSugars = profile.totalCarbohydrate
    profile.addedSugars = profile.totalCarbohydrate // Granulated sugar is all added sugar
  }
  
  // VALIDATION: totalSugars should never exceed totalCarbohydrate
  // This catches USDA data errors where sugar values are inflated
  if (profile.totalSugars > profile.totalCarbohydrate && profile.totalCarbohydrate > 0) {
    console.warn(`🔧 USDA DATA FIX: totalSugars (${profile.totalSugars}g) > totalCarbohydrate (${profile.totalCarbohydrate}g). Capping sugars to carbs.`)
    warnings.push({
      type: 'sugar_exceeds_carbs',
      message: `USDA data error: Sugar (${profile.totalSugars.toFixed(1)}g) cannot exceed carbohydrates (${profile.totalCarbohydrate.toFixed(1)}g). Corrected to ${profile.totalCarbohydrate.toFixed(1)}g.`,
      originalValue: profile.totalSugars,
      correctedValue: profile.totalCarbohydrate
    })
    profile.totalSugars = profile.totalCarbohydrate
    // Also cap added sugars if needed
    if (profile.addedSugars > profile.totalCarbohydrate) {
      profile.addedSugars = profile.totalCarbohydrate
    }
  }
  
  // VALIDATION: addedSugars should never exceed totalSugars
  if (profile.addedSugars > profile.totalSugars && profile.totalSugars > 0) {
    console.warn(`🔧 USDA DATA FIX: addedSugars (${profile.addedSugars}g) > totalSugars (${profile.totalSugars}g). Capping added sugars.`)
    warnings.push({
      type: 'added_sugar_exceeds_total',
      message: `USDA data error: Added sugars (${profile.addedSugars.toFixed(1)}g) cannot exceed total sugars (${profile.totalSugars.toFixed(1)}g). Corrected to ${profile.totalSugars.toFixed(1)}g.`,
      originalValue: profile.addedSugars,
      correctedValue: profile.totalSugars
    })
    profile.addedSugars = profile.totalSugars
  }
  
  // VALIDATION: Fiber should never exceed carbohydrate
  if (profile.dietaryFiber > profile.totalCarbohydrate && profile.totalCarbohydrate > 0) {
    console.warn(`🔧 USDA DATA FIX: dietaryFiber (${profile.dietaryFiber}g) > totalCarbohydrate (${profile.totalCarbohydrate}g). Capping fiber.`)
    warnings.push({
      type: 'fiber_exceeds_carbs',
      message: `USDA data error: Fiber (${profile.dietaryFiber.toFixed(1)}g) cannot exceed carbohydrates (${profile.totalCarbohydrate.toFixed(1)}g). Corrected to ${profile.totalCarbohydrate.toFixed(1)}g.`,
      originalValue: profile.dietaryFiber,
      correctedValue: profile.totalCarbohydrate
    })
    profile.dietaryFiber = profile.totalCarbohydrate
  }
  
  // VALIDATION: Saturated fat should never exceed total fat
  if (profile.saturatedFat > profile.totalFat && profile.totalFat > 0) {
    console.warn(`🔧 USDA DATA FIX: saturatedFat (${profile.saturatedFat}g) > totalFat (${profile.totalFat}g). Capping saturated fat.`)
    warnings.push({
      type: 'saturated_fat_exceeds_total',
      message: `USDA data error: Saturated fat (${profile.saturatedFat.toFixed(1)}g) cannot exceed total fat (${profile.totalFat.toFixed(1)}g). Corrected to ${profile.totalFat.toFixed(1)}g.`,
      originalValue: profile.saturatedFat,
      correctedValue: profile.totalFat
    })
    profile.saturatedFat = profile.totalFat
  }
  
  // VALIDATION: Trans fat should never exceed total fat
  if (profile.transFat > profile.totalFat && profile.totalFat > 0) {
    console.warn(`🔧 USDA DATA FIX: transFat (${profile.transFat}g) > totalFat (${profile.totalFat}g). Capping trans fat.`)
    warnings.push({
      type: 'trans_fat_exceeds_total',
      message: `USDA data error: Trans fat (${profile.transFat.toFixed(1)}g) cannot exceed total fat (${profile.totalFat.toFixed(1)}g). Corrected to ${profile.totalFat.toFixed(1)}g.`,
      originalValue: profile.transFat,
      correctedValue: profile.totalFat
    })
    profile.transFat = profile.totalFat
  }
  
  return { profile, warnings }
}

/**
 * Transform USDA food portions into our FoodPortion format
 * 
 * @param usdaFood - Raw USDA food object
 * @returns Array of food portions
 */
export function transformFoodPortions(usdaFood: any): FoodPortion[] {
  const portions: FoodPortion[] = []
  
  if (!usdaFood.foodPortions || !Array.isArray(usdaFood.foodPortions)) {
    return portions
  }
  
  for (const portion of usdaFood.foodPortions) {
    portions.push({
      id: portion.id,
      amount: portion.amount || 1,
      gramWeight: portion.gramWeight || 100,
      modifier: portion.modifier || '',
      measureUnit: {
        id: portion.measureUnit?.id || 0,
        name: portion.measureUnit?.name || '',
        abbreviation: portion.measureUnit?.abbreviation || '',
      },
    })
  }
  
  return portions
}

/**
 * Transform raw USDA API response into our USDAFood format
 * 
 * @param usdaFood - Raw USDA food object from API
 * @returns Normalized USDAFood object
 */
export function transformUSDAFood(usdaFood: any): USDAFood {
  const { profile, warnings } = transformNutrients(usdaFood.foodNutrients || [])
  
  return {
    fdcId: usdaFood.fdcId,
    name: usdaFood.description || '',
    dataType: usdaFood.dataType || 'Unknown',
    nutrientProfile: profile,
    foodPortions: transformFoodPortions(usdaFood),
    dataQualityWarnings: warnings.length > 0 ? warnings : undefined,
    brandOwner: usdaFood.brandOwner,
    brandName: usdaFood.brandName,
    lastUpdated: new Date().toISOString(),
  }
}

// ============================================================================
// HIGH-LEVEL API
// ============================================================================

/**
 * Search and get first result with full details
 * Convenience method for quick lookups
 * 
 * @param query - Search term
 * @returns First matching food with full details, or null
 */
export async function quickSearch(query: string): Promise<USDAFood | null> {
  const results = await searchFoods(query, 1)
  
  if (!results.foods || results.foods.length === 0) {
    return null
  }
  
  const firstResult = results.foods[0]
  if (!firstResult || !firstResult.fdcId) {
    console.error('[USDA] Invalid food result:', firstResult)
    return null
  }
  
  const details = await getFoodDetails(firstResult.fdcId)
  
  return transformUSDAFood(details)
}

/**
 * Get food details and transform to our format
 * 
 * @param fdcId - USDA FDC ID
 * @returns Normalized food object
 */
export async function getFood(fdcId: number): Promise<USDAFood> {
  const details = await getFoodDetails(fdcId)
  return transformUSDAFood(details)
}

/**
 * Validate USDA API connection
 * 
 * @returns True if API is accessible
 */
export async function testConnection(): Promise<boolean> {
  try {
    const results = await searchFoods('apple', 1)
    return results.foods.length > 0
  } catch {
    return false
  }
}

/**
 * Search for foods with automatic fallback to query variants
 * Tries multiple search queries in sequence until a match is found
 * 
 * @param ingredient - Original ingredient name
 * @param searchVariants - Array of search query variants to try (in order)
 * @returns First successful search result, or null if all variants fail
 */
export async function searchWithVariants(
  ingredient: string,
  searchVariants: string[]
): Promise<{ food: USDAFood; variantUsed: string; attemptNumber: number } | null> {
  if (!searchVariants || searchVariants.length === 0) {
    console.warn(`[USDA] No search variants provided for "${ingredient}"`)
    return null
  }

  for (let i = 0; i < searchVariants.length; i++) {
    const variant = searchVariants[i]
    
    try {
      console.log(`[USDA] Attempt ${i + 1}/${searchVariants.length} for "${ingredient}": trying "${variant}"`)
      
      const results = await searchFoods(variant, 1)
      
      if (results.foods && results.foods.length > 0) {
        const firstResult = results.foods[0]
        const details = await getFoodDetails(firstResult.fdcId)
        const food = transformUSDAFood(details)
        
        if (i > 0) {
          console.log(`[USDA] ✓ Match found on attempt ${i + 1} using variant: "${variant}"`)
        }
        
        return {
          food,
          variantUsed: variant,
          attemptNumber: i + 1
        }
      } else {
        console.log(`[USDA] No results for variant "${variant}", trying next...`)
      }
    } catch (error) {
      console.error(`[USDA] Error searching variant "${variant}":`, error)
      // Continue to next variant
    }
  }
  
  console.warn(`[USDA] All ${searchVariants.length} variants failed for "${ingredient}"`)
  return null
}
