/**
 * Nutrition Data Type Definitions
 * 
 * These interfaces define the data structures for nutrition calculation,
 * USDA API integration, and FDA-compliant nutrition label generation.
 */

/**
 * Complete nutrient profile normalized to per 100g basis
 * All values represent amounts per 100 grams of the food item
 */
export interface NutrientProfile {
  // Macronutrients
  calories: number                  // kcal
  totalFat: number                  // g
  saturatedFat: number              // g
  transFat: number                  // g
  cholesterol: number               // mg
  sodium: number                    // mg
  totalCarbohydrate: number         // g
  dietaryFiber: number              // g
  totalSugars: number               // g
  addedSugars: number               // g
  protein: number                   // g
  
  // Vitamins
  vitaminD: number                  // mcg
  vitaminA: number                  // mcg RAE
  vitaminC: number                  // mg
  vitaminE: number                  // mg
  vitaminK: number                  // mcg
  thiamin: number                   // mg (B1)
  riboflavin: number                // mg (B2)
  niacin: number                    // mg (B3)
  vitaminB6: number                 // mg
  folate: number                    // mcg DFE
  vitaminB12: number                // mcg
  
  // Minerals
  calcium: number                   // mg
  iron: number                      // mg
  magnesium: number                 // mg
  phosphorus: number                // mg
  potassium: number                 // mg
  zinc: number                      // mg
  copper: number                    // mg
  manganese: number                 // mg
  selenium: number                  // mcg
}

/**
 * USDA data quality warning
 */
export interface USDADataWarning {
  type: 'missing_sugar' | 'sugar_exceeds_carbs' | 'added_sugar_exceeds_total' | 
        'fiber_exceeds_carbs' | 'saturated_fat_exceeds_total' | 'trans_fat_exceeds_total'
  message: string
  originalValue?: number
  correctedValue?: number
}

/**
 * Initialize a NutrientProfile with all values at 0
 */
export function initializeNutrientProfile(): NutrientProfile {
  return {
    calories: 0,
    totalFat: 0,
    saturatedFat: 0,
    transFat: 0,
    cholesterol: 0,
    sodium: 0,
    totalCarbohydrate: 0,
    dietaryFiber: 0,
    totalSugars: 0,
    addedSugars: 0,
    protein: 0,
    vitaminD: 0,
    vitaminA: 0,
    vitaminC: 0,
    vitaminE: 0,
    vitaminK: 0,
    thiamin: 0,
    riboflavin: 0,
    niacin: 0,
    vitaminB6: 0,
    folate: 0,
    vitaminB12: 0,
    calcium: 0,
    iron: 0,
    magnesium: 0,
    phosphorus: 0,
    potassium: 0,
    zinc: 0,
    copper: 0,
    manganese: 0,
    selenium: 0,
  }
}

/**
 * Single ingredient in a recipe
 * Can reference either a USDA ingredient or a SubRecipe
 */
export interface Ingredient {
  // Identification (mutually exclusive: either fdcId OR subRecipeId)
  fdcId?: number                    // USDA FoodData Central ID (if USDA ingredient)
  subRecipeId?: string              // Airtable record ID (if SubRecipe)
  
  // Display
  name: string                      // Display name for UI
  
  // Quantity
  quantity: number                  // Amount (e.g., 2 for "2 cups")
  unit: string                      // Unit of measurement (e.g., "cups", "grams", "oz")
  
  // Calculated (not stored, computed at runtime)
  nutrientProfile?: NutrientProfile // Nutrient data (fetched when needed)
  gramsCalculated?: number          // Converted weight in grams
  conversionConfidence?: 'high' | 'medium' | 'low' | 'unknown'
  dataQualityWarnings?: USDADataWarning[] // USDA data issues detected
}

/**
 * Sub-recipe: A reusable component recipe (e.g., "pizza dough", "house aioli")
 * Stored in Airtable SubRecipes table
 */
export interface SubRecipe {
  id: string                        // Airtable record ID
  name: string                      // Recipe name
  ingredients: Ingredient[]         // List of constituent ingredients
  nutrientProfile: NutrientProfile  // Per 100g of final cooked product
  servingSizeGrams: number          // Default serving size (grams)
  
  // Cooking yield tracking (Risk Mitigation #2)
  rawTotalWeight: number            // Sum of all raw ingredient weights (grams)
  finalCookedWeight: number         // Actual weight after cooking (grams)
  yieldPercentage: number           // (finalCookedWeight / rawTotalWeight) × 100
  cookingMethod?: string            // "raw", "baked", "roasted", "grilled", etc.
  
  // Metadata
  createdAt?: string                // ISO timestamp
  updatedAt?: string                // ISO timestamp
}

/**
 * Final dish: A complete menu item built from USDA ingredients and/or SubRecipes
 * Stored in Airtable FinalDishes table
 */
export interface FinalDish {
  id: string                        // Airtable record ID
  name: string                      // Dish name
  ingredients: Ingredient[]         // Can include both USDA and SubRecipes
  nutrientProfile: NutrientProfile  // Per 100g of final product
  
  // Cooking yield tracking (Risk Mitigation #2)
  rawTotalWeight: number            // Sum of all raw ingredient weights (grams)
  finalCookedWeight: number         // Actual weight after cooking (grams)
  yieldPercentage: number           // (finalCookedWeight / rawTotalWeight) × 100
  cookingMethod?: string            // "raw", "baked", "roasted", "grilled", etc.
  
  // Serving information
  servingsPerContainer?: number     // Optional: number of servings
  servingSizeGrams?: number         // Optional: serving size
  servingSizeDescription?: string   // Optional: "1 cup (240g)"
  
  // Metadata
  createdAt?: string                // ISO timestamp
  updatedAt?: string                // ISO timestamp
}

/**
 * USDA Food item from FoodData Central API
 * Cached in Airtable USDACache table
 */
export interface USDAFood {
  fdcId: number                     // USDA unique identifier
  name: string                      // Food description
  dataType: string                  // "Foundation", "SR Legacy", "Branded", etc.
  nutrientProfile: NutrientProfile  // Per 100g nutrient data
  foodPortions?: FoodPortion[]      // USDA portion data (for conversions)
  dataQualityWarnings?: USDADataWarning[] // USDA data issues detected and corrected
  
  // Custom conversion factors (Risk Mitigation #1)
  customConversions?: Record<string, number>  // User-defined unit conversions
  
  // Metadata
  lastUpdated?: string              // ISO timestamp
  brandOwner?: string               // For branded foods
  brandName?: string                // For branded foods
}

/**
 * USDA food portion data (used for unit conversions)
 * Provides accurate gram weights for common measurements
 */
export interface FoodPortion {
  id: number                        // USDA portion ID
  amount: number                    // Quantity (e.g., 1 for "1 cup")
  gramWeight: number                // Weight in grams
  modifier: string                  // Description (e.g., "chopped", "diced")
  measureUnit: {
    id: number
    name: string                    // Full name (e.g., "cup, chopped or diced")
    abbreviation: string            // Short form (e.g., "cup")
  }
}

/**
 * Unit conversion result with confidence indicator
 */
export interface ConversionResult {
  grams: number                     // Converted weight in grams
  confidence: 'high' | 'medium' | 'low' | 'unknown'
  source: 'custom' | 'usda' | 'standard' | 'none'
}

/**
 * Calculation result including metadata
 */
export interface CalculationResult {
  nutrientProfile: NutrientProfile
  rawTotalWeight: number
  finalCookedWeight: number
  yieldPercentage: number
  warnings?: string[]               // Any issues encountered during calculation
}

/**
 * USDA API search response
 */
export interface USDASearchResponse {
  totalHits: number
  currentPage: number
  totalPages: number
  foods: USDASearchFood[]
}

/**
 * Abbreviated USDA food item from search results
 */
export interface USDASearchFood {
  fdcId: number
  description: string
  dataType: string
  publicationDate?: string
  brandOwner?: string
  foodNutrients?: USDAFoodNutrient[]
}

/**
 * USDA nutrient data (raw API format)
 */
export interface USDAFoodNutrient {
  nutrientId: number
  nutrientName: string
  nutrientNumber: string
  unitName: string
  value: number
}

/**
 * Airtable record wrapper (generic)
 */
export interface AirtableRecord<T> {
  id: string
  fields: T
  createdTime: string
}

/**
 * Airtable SubRecipes table fields
 */
export interface AirtableSubRecipeFields {
  Name: string
  IngredientsJSON: string           // Stringified Ingredient[]
  NutrientProfileJSON: string       // Stringified NutrientProfile
  ServingSizeGrams: number
  RawTotalWeight: number
  FinalCookedWeight: number
  YieldPercentage: number
  CookingMethod?: string
  CreatedAt?: string
}

/**
 * Airtable FinalDishes table fields
 */
export interface AirtableFinalDishFields {
  Name: string
  IngredientsJSON: string           // Stringified Ingredient[]
  NutrientProfileJSON: string       // Stringified NutrientProfile
  RawTotalWeight: number
  FinalCookedWeight: number
  YieldPercentage: number
  CookingMethod?: string
  ServingsPerContainer?: number
  ServingSizeGrams?: number
  ServingSizeDescription?: string
  CreatedAt?: string
}

/**
 * Airtable USDACache table fields
 */
export interface AirtableUSDAFoodFields {
  FdcId: number
  Name: string
  DataType: string
  NutrientProfileJSON: string       // Stringified NutrientProfile
  FoodPortionsJSON?: string         // Stringified FoodPortion[]
  CustomConversionJSON?: string     // Stringified Record<string, number>
  LastUpdated?: string
  BrandOwner?: string
  BrandName?: string
}

/**
 * Standard unit conversions (fallback when USDA portions unavailable)
 * Values are grams per unit, assuming water density or common approximations
 * 
 * NOTE: These are FALLBACKS only. USDA portion data and custom conversions
 * take priority. See Risk Mitigation #1 in RISK_ASSESSMENT.md
 */
export const STANDARD_CONVERSIONS: Record<string, number> = {
  // Weight (exact)
  'g': 1,
  'gram': 1,
  'grams': 1,
  'kg': 1000,
  'kilogram': 1000,
  'oz': 28.3495,
  'ounce': 28.3495,
  'ounces': 28.3495,
  'lb': 453.592,
  'pound': 453.592,
  'pounds': 453.592,
  
  // Volume (approximate, water density)
  'ml': 1,
  'milliliter': 1,
  'milliliters': 1,
  'l': 1000,
  'liter': 1000,
  'liters': 1000,
  'cup': 236.588,
  'cups': 236.588,
  'tbsp': 14.7868,
  'tablespoon': 14.7868,
  'tablespoons': 14.7868,
  'tsp': 4.92892,
  'teaspoon': 4.92892,
  'teaspoons': 4.92892,
  'fl oz': 29.5735,
  'fluid ounce': 29.5735,
  'fluid ounces': 29.5735,
  'pint': 473.176,
  'pints': 473.176,
  'quart': 946.353,
  'quarts': 946.353,
  'gallon': 3785.41,
  'gallons': 3785.41,
  
  // Common measurements (very approximate - warn user)
  'pinch': 0.5,
  'dash': 0.6,
  'smidgen': 0.25,
  
  // Egg sizes (USDA standards for whole eggs, whites are ~2/3 of total)
  // For egg whites specifically: large egg white = ~33g
  'large': 33,          // Large egg white (33g), or use as generic "1 large item"
  'medium': 30,         // Medium egg white (30g)
  'small': 25,          // Small egg white (25g)
  'extra-large': 38,    // Extra large egg white (38g)
  'jumbo': 42,          // Jumbo egg white (42g)
  'xl': 38,             // Extra large (short form)
}

/**
 * Typical cooking yield percentages by method
 * Used to suggest final weights in UI
 */
export const TYPICAL_YIELDS: Record<string, number> = {
  'raw': 100,           // No cooking
  'baked': 85,          // 15% moisture loss
  'roasted': 70,        // 30% moisture loss
  'grilled': 75,        // 25% moisture loss
  'fried': 90,          // 10% moisture loss
  'boiled': 100,        // Varies (can gain or lose)
  'steamed': 95,        // 5% moisture loss
  'sautéed': 85,        // 15% moisture loss
  'braised': 80,        // 20% moisture loss
  'stewed': 90,         // 10% moisture loss
  'poached': 95,        // 5% moisture loss
}
