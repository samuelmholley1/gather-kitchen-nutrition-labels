/**
 * Ingredient Taxonomy System
 * Categorizes units and ingredients for proper parsing and validation
 */

export const MEASUREMENT_UNITS = {
  volume: ['cup', 'tablespoon', 'tbsp', 'teaspoon', 'tsp', 'liter', 'ml', 'milliliter', 'gallon', 'quart', 'pint', 'fluid ounce', 'fl oz'],
  weight: ['pound', 'lb', 'ounce', 'oz', 'gram', 'g', 'kilogram', 'kg', 'milligram', 'mg'],
  other: ['pinch', 'dash', 'splash', 'handful']
}

export const COUNT_UNITS = ['item', 'piece', 'slice', 'clove', 'sprig', 'leaf', 'stalk', 'head', 'bunch', 'can', 'package', 'pkg']

export interface IngredientVariety {
  name: string
  varieties: string[]
}

export const INGREDIENT_UNITS = {
  highVariation: [
    { name: 'tomato', varieties: ['cherry tomato', 'grape tomato', 'roma tomato', 'medium tomato', 'large tomato', 'beefsteak tomato', 'heirloom tomato'] },
    { name: 'potato', varieties: ['small potato', 'medium potato', 'large potato', 'russet potato', 'red potato', 'yukon gold potato', 'fingerling potato'] },
    { name: 'onion', varieties: ['small onion', 'medium onion', 'large onion', 'pearl onion', 'shallot', 'red onion', 'white onion', 'yellow onion'] },
    { name: 'apple', varieties: ['small apple', 'medium apple', 'large apple', 'granny smith apple', 'fuji apple', 'honeycrisp apple', 'gala apple'] },
    { name: 'pepper', varieties: ['bell pepper', 'red bell pepper', 'green bell pepper', 'jalapeño pepper', 'serrano pepper', 'poblano pepper'] },
    { name: 'carrot', varieties: ['baby carrot', 'medium carrot', 'large carrot'] },
    { name: 'orange', varieties: ['small orange', 'medium orange', 'large orange', 'navel orange', 'blood orange'] },
    { name: 'banana', varieties: ['small banana', 'medium banana', 'large banana'] },
    { name: 'zucchini', varieties: ['small zucchini', 'medium zucchini', 'large zucchini'] },
    { name: 'eggplant', varieties: ['small eggplant', 'medium eggplant', 'large eggplant', 'japanese eggplant'] }
  ] as IngredientVariety[],
  standardSize: ['egg', 'avocado', 'lemon', 'lime', 'garlic bulb'],
  meats: ['chicken', 'beef', 'pork', 'fish', 'turkey', 'lamb', 'salmon', 'tuna', 'shrimp']
}

/**
 * Check if a unit is a measurement unit (volume, weight, etc.)
 */
export function isMeasurementUnit(unit: string): boolean {
  const normalized = unit.toLowerCase().trim()
  const allMeasurements = [
    ...MEASUREMENT_UNITS.volume,
    ...MEASUREMENT_UNITS.weight,
    ...MEASUREMENT_UNITS.other
  ]
  return allMeasurements.some(u => normalized === u || normalized === u + 's')
}

/**
 * Check if a unit is a generic count unit (item, piece, slice, etc.)
 */
export function isCountUnit(unit: string): boolean {
  const normalized = unit.toLowerCase().trim()
  return COUNT_UNITS.some(u => normalized === u || normalized === u + 's')
}

/**
 * Check if a unit is actually an ingredient name being used for counting
 * Returns whether specification is needed and what varieties are available
 */
export function isIngredientUnit(unit: string): { 
  isIngredient: boolean
  needsSpec: boolean
  varieties?: string[]
  baseIngredient?: string
} {
  const normalized = unit.toLowerCase().trim().replace(/s$/, '') // Remove plural
  
  // Check high variation ingredients (need specification)
  const highVar = INGREDIENT_UNITS.highVariation.find(i => 
    normalized === i.name || normalized === i.name + 's' || normalized.includes(i.name)
  )
  if (highVar) {
    return { 
      isIngredient: true, 
      needsSpec: true, 
      varieties: highVar.varieties,
      baseIngredient: highVar.name
    }
  }
  
  // Check standard size ingredients (no specification needed)
  if (INGREDIENT_UNITS.standardSize.some(i => normalized === i || normalized === i + 's')) {
    return { 
      isIngredient: true, 
      needsSpec: false,
      baseIngredient: normalized
    }
  }
  
  // Check meats (usually don't need size specification)
  if (INGREDIENT_UNITS.meats.some(i => normalized === i || normalized === i + 's')) {
    return { 
      isIngredient: true, 
      needsSpec: false,
      baseIngredient: normalized
    }
  }
  
  return { isIngredient: false, needsSpec: false }
}

/**
 * Get a friendly prompt for specifying an ingredient
 */
export function getSpecificationPrompt(baseIngredient: string): string {
  const ingredient = INGREDIENT_UNITS.highVariation.find(i => i.name === baseIngredient)
  if (!ingredient) return `What type/size of ${baseIngredient}?`
  
  return `What type/size of ${baseIngredient}?`
}
