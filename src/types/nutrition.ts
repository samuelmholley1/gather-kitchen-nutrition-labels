// ===== NUTRITION CONSTANTS =====

/**
 * Standard unit conversions to grams
 * Used as fallback when USDA portion data is unavailable
 */
export const STANDARD_CONVERSIONS: Record<string, number> = {
  // Volume measurements (approximate for water-based foods)
  'cup': 240,
  'cups': 240,
  'c': 240,
  'tbsp': 15,
  'tablespoon': 15,
  'tablespoons': 15,
  'tsp': 5,
  'teaspoon': 5,
  'teaspoons': 5,
  'fl oz': 30,
  'fluid ounce': 30,
  'fluid ounces': 30,
  'ml': 1,
  'milliliter': 1,
  'milliliters': 1,
  'liter': 1000,
  'liters': 1000,
  'l': 1000,
  'pint': 473,
  'pints': 473,
  'pt': 473,
  'quart': 946,
  'quarts': 946,
  'qt': 946,
  'gallon': 3785,
  'gallons': 3785,
  'gal': 3785,

  // Weight measurements
  'oz': 28.35,
  'ounce': 28.35,
  'ounces': 28.35,
  'lb': 453.59,
  'pound': 453.59,
  'pounds': 453.59,
  'kg': 1000,
  'kilogram': 1000,
  'kilograms': 1000,

  // Common food units (approximate)
  'slice': 30,  // average slice of bread
  'slices': 30,
  'medium': 150,  // medium apple, onion, etc.
  'large': 200,
  'small': 100,
  'whole': 150,
  'clove': 5,  // garlic clove
  'cloves': 5,
  'head': 100,  // head of lettuce, etc.
  'heads': 100,
  'bunch': 200,  // bunch of herbs
  'bunches': 200,
  'sprig': 5,  // sprig of herbs
  'sprigs': 5,
  'stalk': 50,  // celery stalk
  'stalks': 50,
  'piece': 50,  // generic piece
  'pieces': 50
}

/**
 * Typical yield multipliers for cooking methods
 * Values represent final weight / initial weight
 */
export const TYPICAL_YIELDS: Record<string, number> = {
  // Baking
  'baked': 0.95,
  'baking': 0.95,

  // Boiling
  'boiled': 0.75,
  'boiling': 0.75,

  // Braising
  'braised': 0.80,
  'braising': 0.80,

  // Broiling
  'broiled': 0.90,
  'broiling': 0.90,

  // Frying
  'fried': 0.95,
  'frying': 0.95,
  'deep fried': 1.10,  // absorbs oil
  'deep frying': 1.10,

  // Grilling
  'grilled': 0.85,
  'grilling': 0.85,

  // Roasting
  'roasted': 0.80,
  'roasting': 0.80,

  // Sautéing
  'sautéed': 0.90,
  'sautéing': 0.90,
  'sauteed': 0.90,
  'sauteing': 0.90,

  // Steaming
  'steamed': 0.85,
  'steaming': 0.85,

  // Stewing
  'stewed': 0.75,
  'stewing': 0.75,

  // Default for unknown methods
  'cooked': 0.85,
  'cooking': 0.85
}

/**
 * Initialize an empty nutrient profile with all nutrients set to 0
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
    calcium: 0,
    iron: 0,
    potassium: 0,
    // Optional nutrients
    monounsaturatedFat: 0,
    polyunsaturatedFat: 0,
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
    phosphorus: 0,
    magnesium: 0,
    zinc: 0,
    selenium: 0
  }
}

// ===== USDA & Nutrition Types =====

export interface USDANutrient {
  nutrientId: number
  nutrientName: string
  unitName: string
  value: number
}

export interface USDAFoodPortion {
  id: number
  amount: number
  gramWeight: number
  modifier: string
  measureUnitName?: string
}

export interface USDAFood {
  fdcId: number
  description: string
  dataType: string
  brandOwner?: string
  brandName?: string
  foodCategory?: string
  foodNutrients?: USDANutrient[]
  foodPortions?: USDAFoodPortion[]
  dataQualityWarnings?: Array<{
    type: string
    message: string
    originalValue?: number
    correctedValue?: number
  }>
}

export interface USDASearchResponse {
  foods: Array<{
    fdcId: number
    description: string
    dataType: string
    brandOwner?: string
    brandName?: string
    foodCategory?: string
  }>
  totalHits: number
  currentPage: number
  totalPages: number
}

export interface USDADataWarning {
  type: string
  message: string
  originalValue?: number
  correctedValue?: number
}

export interface NutrientProfile {
  // Macronutrients (g)
  calories: number
  totalFat: number
  saturatedFat: number
  transFat: number
  cholesterol: number // mg
  sodium: number // mg
  totalCarbohydrate: number
  dietaryFiber: number
  totalSugars: number
  addedSugars: number
  protein: number

  // Vitamins (mcg or IU)
  vitaminD: number // mcg
  calcium: number // mg
  iron: number // mg
  potassium: number // mg

  // Optional nutrients
  monounsaturatedFat?: number
  polyunsaturatedFat?: number
  vitaminA?: number // mcg
  vitaminC?: number // mg
  vitaminE?: number // mg
  vitaminK?: number // mcg
  thiamin?: number // mg
  riboflavin?: number // mg
  niacin?: number // mg
  vitaminB6?: number // mg
  folate?: number // mcg
  vitaminB12?: number // mcg
  phosphorus?: number // mg
  magnesium?: number // mg
  zinc?: number // mg
  selenium?: number // mcg
}

export interface Ingredient {
  id: string
  fdcId?: number // USDA FDC ID
  name: string
  quantity: number
  unit: string
  // Custom conversion ratio (e.g., 1 cup = 240g for this ingredient)
  customGramsPerUnit?: number
  notes?: string
}

export interface IngredientWithNutrition extends Ingredient {
  nutrientProfile?: NutrientProfile
}

export interface SubRecipe {
  id: string
  name: string
  ingredients: Ingredient[]
  rawWeight: number // grams
  finalWeight: number // grams after cooking
  yieldPercentage: number // (finalWeight / rawWeight) * 100
  servingSize: number // grams per serving
  servingsPerRecipe: number
  nutritionProfile: NutrientProfile
  category?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface FinalDish {
  id: string
  name: string
  ingredients: Ingredient[]
  subRecipes: Array<{
    subRecipeId: string
    subRecipeName: string
    quantity: number // grams or servings
    unit: 'grams' | 'servings'
  }>
  totalWeight: number // grams
  servingSize: number // grams per serving
  servingsPerDish: number
  nutritionProfile: NutrientProfile
  allergens?: string[]
  category?: string
  notes?: string
  createdAt: string
  updatedAt: string
}