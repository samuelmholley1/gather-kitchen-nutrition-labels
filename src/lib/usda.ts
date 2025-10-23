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
} from '@/types/nutrition'
import { initializeNutrientProfile } from '@/types/nutrition'

const USDA_API_BASE = 'https://api.nal.usda.gov/fdc/v1'

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
 * Search for foods in the USDA database
 * 
 * @param query - Search term (e.g., "apple", "chicken breast")
 * @param pageSize - Number of results per page (default: 50, max: 200)
 * @param pageNumber - Page number for pagination (default: 1)
 * @param dataType - Filter by data type (optional)
 * @returns Search results with pagination info
 */
export async function searchFoods(
  query: string,
  pageSize: number = 50,
  pageNumber: number = 1,
  dataType?: 'Foundation' | 'SR Legacy' | 'Survey (FNDDS)' | 'Branded'
): Promise<USDASearchResponse> {
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
  
  const response = await fetch(url)
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`USDA API search failed: ${response.status} ${error}`)
  }
  
  return await response.json()
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
 * @returns Normalized nutrient profile per 100g
 */
export function transformNutrients(
  usdaNutrients: USDAFoodNutrient[]
): NutrientProfile {
  const profile = initializeNutrientProfile()
  
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
  
  return profile
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
  return {
    fdcId: usdaFood.fdcId,
    name: usdaFood.description || '',
    dataType: usdaFood.dataType || 'Unknown',
    nutrientProfile: transformNutrients(usdaFood.foodNutrients || []),
    foodPortions: transformFoodPortions(usdaFood),
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
  
  if (results.foods.length === 0) {
    return null
  }
  
  const firstResult = results.foods[0]
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
