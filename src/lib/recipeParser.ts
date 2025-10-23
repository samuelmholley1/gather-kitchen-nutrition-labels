/**
 * Recipe Parser
 * 
 * Parses plain text recipes into structured ingredient data
 */

import { convertToGrams, parseQuantity, findUnit } from './unitConversions'

export interface ParsedIngredient {
  quantity: number
  unit: string
  name: string
  grams: number | null
  originalLine: string
}

export interface ParsedRecipe {
  name: string
  ingredients: ParsedIngredient[]
  errors: string[]
}

/**
 * Parse a single ingredient line
 * 
 * Handles formats like:
 * - "150 G boneless/skinless chicken breast"
 * - "1 tsp sesame seeds"
 * - "6 oz pineapple juice"
 * - "2 Tbsp low sodium soy sauce"
 * - "1 1/2 cups flour"
 * 
 * @param line - Single ingredient line
 * @returns Parsed ingredient or null if can't parse
 */
export function parseIngredientLine(line: string): ParsedIngredient | null {
  const trimmed = line.trim()
  
  // Skip empty lines
  if (!trimmed) {
    return null
  }
  
  // Pattern: [quantity] [unit] [ingredient name]
  // Handles: "150 G chicken", "1 1/2 cups flour", "2 Tbsp oil"
  // Updated to handle leading/trailing spaces
  const pattern = /^\s*([\d\s\/\.]+)\s*([a-zA-Z]+)\s+(.+)$/
  const match = trimmed.match(pattern)
  
  if (!match) {
    // Try pattern without unit (just quantity and name)
    const noUnitPattern = /^([\d\s\/\.]+)\s+(.+)$/
    const noUnitMatch = trimmed.match(noUnitPattern)
    
    if (noUnitMatch) {
      const quantity = parseQuantity(noUnitMatch[1])
      const name = noUnitMatch[2].trim()
      
      return {
        quantity,
        unit: 'g', // Assume grams if no unit specified
        name,
        grams: quantity,
        originalLine: line,
      }
    }
    
    return null
  }
  
  const quantityStr = match[1]
  const unitStr = match[2]
  const name = match[3].trim()
  
  const quantity = parseQuantity(quantityStr)
  const grams = convertToGrams(quantity, unitStr)
  
  return {
    quantity,
    unit: unitStr,
    name,
    grams,
    originalLine: line,
  }
}

/**
 * Parse a full recipe text block
 * 
 * Format:
 * ```
 * Recipe Name
 * 
 * 150 G ingredient one
 * 2 tbsp ingredient two
 * 1/2 cup ingredient three
 * ```
 * 
 * @param recipeText - Full recipe text
 * @returns Parsed recipe with name and ingredients
 */
export function parseRecipe(recipeText: string): ParsedRecipe {
  const lines = recipeText.split('\n')
  const ingredients: ParsedIngredient[] = []
  const errors: string[] = []
  
  // First non-empty line is the recipe name
  let name = 'Untitled Recipe'
  let foundName = false
  let startParsingIngredients = false
  
  for (const line of lines) {
    const trimmed = line.trim()
    
    // Skip empty lines until we find the name
    if (!trimmed) {
      if (foundName) {
        startParsingIngredients = true
      }
      continue
    }
    
    // First non-empty line is the name
    if (!foundName) {
      name = trimmed
      foundName = true
      continue
    }
    
    // Only start parsing ingredients after we've seen the name and at least one empty line
    if (!startParsingIngredients) {
      startParsingIngredients = true
    }
    
    // Parse ingredient line
    const ingredient = parseIngredientLine(trimmed)
    
    if (ingredient) {
      ingredients.push(ingredient)
    } else {
      errors.push(`Could not parse: "${trimmed}"`)
    }
  }
  
  return {
    name,
    ingredients,
    errors,
  }
}

/**
 * Clean ingredient name for USDA search
 * 
 * Removes descriptors like "julienned", "chopped", "fresh", etc.
 * to improve search results
 * 
 * @param name - Raw ingredient name
 * @returns Cleaned name for search
 */
export function cleanIngredientForSearch(name: string): string {
  const descriptors = [
    'fresh', 'frozen', 'canned', 'dried', 'raw', 'cooked',
    'chopped', 'diced', 'sliced', 'minced', 'julienned',
    'grated', 'shredded', 'crushed', 'ground',
    'boneless', 'skinless', 'seedless',
    'low sodium', 'reduced fat', 'fat-free', 'low-fat',
    'organic', 'whole', 'medium', 'large', 'small',
    '(peddled)', '(peeled)', '(seeded)',
  ]
  
  let cleaned = name.toLowerCase()
  
  // Remove parenthetical descriptions
  cleaned = cleaned.replace(/\([^)]*\)/g, '')
  
  // Remove descriptors
  for (const descriptor of descriptors) {
    const regex = new RegExp(`\\b${descriptor}\\b`, 'gi')
    cleaned = cleaned.replace(regex, '')
  }
  
  // Clean up extra spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  
  return cleaned
}

/**
 * Validate parsed recipe
 * 
 * @param recipe - Parsed recipe
 * @returns Array of validation errors (empty if valid)
 */
export function validateRecipe(recipe: ParsedRecipe): string[] {
  const errors: string[] = []
  
  if (!recipe.name || recipe.name === 'Untitled Recipe') {
    errors.push('Recipe must have a name')
  }
  
  if (recipe.ingredients.length === 0) {
    errors.push('Recipe must have at least one ingredient')
  }
  
  // Check for ingredients with unknown units
  const unknownUnits = recipe.ingredients.filter(ing => ing.grams === null)
  if (unknownUnits.length > 0) {
    errors.push(`Unknown units found in: ${unknownUnits.map(ing => ing.originalLine).join(', ')}`)
  }
  
  return errors
}
