/**
 * FDA-Compliant Nutrition Label Rounding
 * 
 * Implements rounding rules per 21 CFR 101.9
 * https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-101/subpart-A/section-101.9
 * 
 * All functions return formatted strings for display on nutrition labels.
 */

/**
 * Round calories according to FDA rules
 * 
 * Rules:
 * - < 5 calories: "0"
 * - 5-50 calories: nearest 5
 * - > 50 calories: nearest 10
 */
export function roundCalories(calories: number): string {
  if (calories < 5) {
    return '0'
  }
  
  if (calories <= 50) {
    return Math.round(calories / 5) * 5 + ''
  }
  
  return Math.round(calories / 10) * 10 + ''
}

/**
 * Round total fat according to FDA rules
 * 
 * Rules:
 * - < 0.5g: "0 g"
 * - < 5g: nearest 0.5g
 * - ≥ 5g: nearest 1g
 */
export function roundTotalFat(grams: number): string {
  if (grams < 0.5) {
    return '0 g'
  }
  
  if (grams < 5) {
    return (Math.round(grams * 2) / 2).toFixed(1) + ' g'
  }
  
  return Math.round(grams) + ' g'
}

/**
 * Round saturated fat according to FDA rules
 * 
 * Rules:
 * - < 0.5g: "0 g"
 * - < 1g: "Less than 1 g"
 * - ≥ 1g: nearest 0.5g
 */
export function roundSaturatedFat(grams: number): string {
  if (grams < 0.5) {
    return '0 g'
  }
  
  if (grams < 1) {
    return 'Less than 1 g'
  }
  
  return (Math.round(grams * 2) / 2).toFixed(1) + ' g'
}

/**
 * Round trans fat according to FDA rules
 * 
 * Rules:
 * - < 0.5g: "0 g"
 * - ≥ 0.5g: nearest 0.5g
 */
export function roundTransFat(grams: number): string {
  if (grams < 0.5) {
    return '0 g'
  }
  
  return (Math.round(grams * 2) / 2).toFixed(1) + ' g'
}

/**
 * Round cholesterol according to FDA rules
 * 
 * Rules:
 * - < 2mg: "0 mg"
 * - 2-5mg: "Less than 5 mg"
 * - ≥ 5mg: nearest 5mg
 */
export function roundCholesterol(mg: number): string {
  if (mg < 2) {
    return '0 mg'
  }
  
  if (mg < 5) {
    return 'Less than 5 mg'
  }
  
  return Math.round(mg / 5) * 5 + ' mg'
}

/**
 * Round sodium according to FDA rules
 * 
 * Rules:
 * - < 5mg: "0 mg"
 * - 5-140mg: nearest 5mg
 * - > 140mg: nearest 10mg
 */
export function roundSodium(mg: number): string {
  if (mg < 5) {
    return '0 mg'
  }
  
  if (mg <= 140) {
    return Math.round(mg / 5) * 5 + ' mg'
  }
  
  return Math.round(mg / 10) * 10 + ' mg'
}

/**
 * Round total carbohydrate according to FDA rules
 * 
 * Rules:
 * - < 0.5g: "0 g"
 * - < 1g: "Less than 1 g"
 * - ≥ 1g: nearest 1g
 */
export function roundTotalCarbohydrate(grams: number): string {
  if (grams < 0.5) {
    return '0 g'
  }
  
  if (grams < 1) {
    return 'Less than 1 g'
  }
  
  return Math.round(grams) + ' g'
}

/**
 * Round dietary fiber according to FDA rules
 * 
 * Rules:
 * - < 0.5g: "0 g"
 * - < 1g: "Less than 1 g"
 * - ≥ 1g: nearest 1g
 */
export function roundDietaryFiber(grams: number): string {
  if (grams < 0.5) {
    return '0 g'
  }
  
  if (grams < 1) {
    return 'Less than 1 g'
  }
  
  return Math.round(grams) + ' g'
}

/**
 * Round total sugars according to FDA rules
 * 
 * Rules:
 * - < 0.5g: "0 g"
 * - < 1g: "Less than 1 g"
 * - ≥ 1g: nearest 1g
 */
export function roundTotalSugars(grams: number): string {
  if (grams < 0.5) {
    return '0 g'
  }
  
  if (grams < 1) {
    return 'Less than 1 g'
  }
  
  return Math.round(grams) + ' g'
}

/**
 * Round added sugars according to FDA rules
 * 
 * Rules:
 * - < 0.5g: "0 g"
 * - < 1g: "Less than 1 g"
 * - ≥ 1g: nearest 1g
 */
export function roundAddedSugars(grams: number): string {
  if (grams < 0.5) {
    return '0 g'
  }
  
  if (grams < 1) {
    return 'Less than 1 g'
  }
  
  return Math.round(grams) + ' g'
}

/**
 * Round protein according to FDA rules
 * 
 * Rules:
 * - < 0.5g: "0 g"
 * - < 1g: "Less than 1 g"
 * - ≥ 1g: nearest 1g
 */
export function roundProtein(grams: number): string {
  if (grams < 0.5) {
    return '0 g'
  }
  
  if (grams < 1) {
    return 'Less than 1 g'
  }
  
  return Math.round(grams) + ' g'
}

/**
 * Round vitamin D according to FDA rules
 * 
 * Rules:
 * - < 0.1mcg: "0 mcg"
 * - ≥ 0.1mcg: nearest 0.1mcg
 */
export function roundVitaminD(mcg: number): string {
  if (mcg < 0.1) {
    return '0 mcg'
  }
  
  return (Math.round(mcg * 10) / 10).toFixed(1) + ' mcg'
}

/**
 * Round calcium according to FDA rules
 * 
 * Rules:
 * - < 5mg: "0 mg"
 * - ≥ 5mg: nearest 10mg
 */
export function roundCalcium(mg: number): string {
  if (mg < 5) {
    return '0 mg'
  }
  
  return Math.round(mg / 10) * 10 + ' mg'
}

/**
 * Round iron according to FDA rules
 * 
 * Rules:
 * - < 0.5mg: "0 mg"
 * - ≥ 0.5mg: nearest 0.1mg
 */
export function roundIron(mg: number): string {
  if (mg < 0.5) {
    return '0 mg'
  }
  
  return (Math.round(mg * 10) / 10).toFixed(1) + ' mg'
}

/**
 * Round potassium according to FDA rules
 * 
 * Rules:
 * - < 5mg: "0 mg"
 * - ≥ 5mg: nearest 10mg
 */
export function roundPotassium(mg: number): string {
  if (mg < 5) {
    return '0 mg'
  }
  
  return Math.round(mg / 10) * 10 + ' mg'
}

/**
 * Calculate % Daily Value for a nutrient
 * 
 * @param amount - Amount of nutrient in serving
 * @param dailyValue - FDA daily value for this nutrient
 * @returns Formatted percentage string
 */
export function calculateDailyValuePercent(amount: number, dailyValue: number): string {
  if (dailyValue === 0 || amount === 0) {
    return '0%'
  }
  
  const percent = (amount / dailyValue) * 100
  
  // Round to nearest 1%
  return Math.round(percent) + '%'
}

/**
 * FDA Daily Values (based on 2,000 calorie diet)
 * Used for % Daily Value calculations
 */
export const FDA_DAILY_VALUES = {
  totalFat: 78, // grams
  saturatedFat: 20, // grams
  cholesterol: 300, // mg
  sodium: 2300, // mg
  totalCarbohydrate: 275, // grams
  dietaryFiber: 28, // grams
  totalSugars: 50, // grams (added sugars)
  protein: 50, // grams
  vitaminD: 20, // mcg
  calcium: 1300, // mg
  iron: 18, // mg
  potassium: 4700, // mg
}

/**
 * Format a nutrient with rounding and % Daily Value
 * 
 * @param value - Raw nutrient value
 * @param nutrientType - Type of nutrient for correct rounding
 * @param dailyValue - FDA daily value (optional)
 * @returns Object with display value and % DV
 */
export function formatNutrient(
  value: number,
  nutrientType: keyof typeof FDA_DAILY_VALUES,
  dailyValue?: number
): { display: string; percentDV?: string } {
  let display: string
  
  // Apply correct rounding based on nutrient type
  switch (nutrientType) {
    case 'totalFat':
      display = roundTotalFat(value)
      break
    case 'saturatedFat':
      display = roundSaturatedFat(value)
      break
    case 'cholesterol':
      display = roundCholesterol(value)
      break
    case 'sodium':
      display = roundSodium(value)
      break
    case 'totalCarbohydrate':
      display = roundTotalCarbohydrate(value)
      break
    case 'dietaryFiber':
      display = roundDietaryFiber(value)
      break
    case 'totalSugars':
      display = roundTotalSugars(value)
      break
    case 'protein':
      display = roundProtein(value)
      break
    case 'vitaminD':
      display = roundVitaminD(value)
      break
    case 'calcium':
      display = roundCalcium(value)
      break
    case 'iron':
      display = roundIron(value)
      break
    case 'potassium':
      display = roundPotassium(value)
      break
    default:
      display = value.toFixed(1) + ' g'
  }
  
  // Calculate % DV if daily value provided
  const percentDV = dailyValue
    ? calculateDailyValuePercent(value, dailyValue)
    : undefined
  
  return { display, percentDV }
}
