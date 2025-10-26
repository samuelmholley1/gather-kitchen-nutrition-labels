export interface ServiceDate {
  id: string
  date: string
  displayDate: string
  liturgist?: Liturgist
  isAvailable: boolean
  notes?: string
}

export interface Liturgist {
  id: string
  name: string
  email: string
  phone?: string
  preferredContact: 'email' | 'phone'
}

export interface SignupRequest {
  serviceId: string
  liturgistName: string
  liturgistEmail: string
  liturgistPhone?: string
  preferredContact: 'email' | 'phone'
  notes?: string
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