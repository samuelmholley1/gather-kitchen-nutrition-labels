/**
 * Smart Recipe Parser - Detects sub-recipes in parentheses and auto-parses them
 * 
 * Example input:
 * "Chicken Tacos
 * 
 * 2 cups shredded chicken
 * 1 cup salsa verde (1/2 cup tomatillos, 1/4 cup onions, 2 tbsp cilantro, 1 jalapeño)
 * 8 corn tortillas
 * 1/2 cup cheese"
 * 
 * Output:
 * - Final Dish: "Chicken Tacos" with ingredients including a sub-recipe reference to "salsa verde"
 * - Sub-Recipe: "salsa verde" with its component ingredients
 */

export interface ParsedSubRecipe {
  name: string
  ingredients: {
    quantity: number
    unit: string
    ingredient: string
    originalLine: string
  }[]
  quantityInFinalDish: number
  unitInFinalDish: string
}

export interface ParsedFinalDish {
  name: string
  ingredients: {
    quantity: number
    unit: string
    ingredient: string
    originalLine: string
    isSubRecipe: boolean
    subRecipeData?: ParsedSubRecipe
  }[]
}

export interface SmartParseResult {
  finalDish: ParsedFinalDish
  subRecipes: ParsedSubRecipe[]
  errors: string[]
}

/**
 * Parse an ingredient line like "2 cups flour" or "1/2 tsp salt"
 */
function parseIngredientLine(line: string): {
  quantity: number
  unit: string
  ingredient: string
} | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  // Pattern: optional quantity (with fractions), optional unit, then ingredient
  // Supports: "2 cups flour", "1/2 tsp salt", "3 eggs", "flour" (no quantity)
  const pattern = /^\s*([\d\s\/\.]+)?\s*([a-zA-Z]+)?\s+(.+)$/
  const match = trimmed.match(pattern)

  if (!match) {
    // Try to match just ingredient with no quantity/unit
    return {
      quantity: 1,
      unit: 'item',
      ingredient: trimmed
    }
  }

  const [, quantityStr, unit, ingredient] = match

  // Parse quantity (handle fractions like 1/2, 1 1/2, etc.)
  let quantity = 1
  if (quantityStr) {
    const parts = quantityStr.trim().split(/\s+/)
    quantity = parts.reduce((sum, part) => {
      if (part.includes('/')) {
        const [num, denom] = part.split('/').map(Number)
        return sum + num / denom
      }
      return sum + parseFloat(part)
    }, 0)
  }

  return {
    quantity: quantity || 1,
    unit: unit || 'item',
    ingredient: ingredient.trim()
  }
}

/**
 * Check if an ingredient line contains a sub-recipe (has parentheses with ingredients)
 */
function detectSubRecipe(line: string): {
  hasSubRecipe: boolean
  quantity: number
  unit: string
  subRecipeName: string
  subRecipeIngredients: string
} | null {
  // Pattern: "1 cup salsa verde (ingredients here)"
  const pattern = /^\s*([\d\s\/\.]+)?\s*([a-zA-Z]+)?\s+([^(]+)\s*\(([^)]+)\)\s*$/
  const match = line.match(pattern)

  if (!match) return null

  const [, quantityStr, unit, name, ingredients] = match

  // Parse quantity
  let quantity = 1
  if (quantityStr) {
    const parts = quantityStr.trim().split(/\s+/)
    quantity = parts.reduce((sum, part) => {
      if (part.includes('/')) {
        const [num, denom] = part.split('/').map(Number)
        return sum + num / denom
      }
      return sum + parseFloat(part)
    }, 0)
  }

  return {
    hasSubRecipe: true,
    quantity: quantity || 1,
    unit: unit || 'item',
    subRecipeName: name.trim(),
    subRecipeIngredients: ingredients.trim()
  }
}

/**
 * Parse a complete recipe with auto-detection of sub-recipes
 */
export function parseSmartRecipe(recipeText: string): SmartParseResult {
  const lines = recipeText.split('\n').map(l => l.trim()).filter(l => l)
  const errors: string[] = []
  const subRecipes: ParsedSubRecipe[] = []
  const finalDishIngredients: ParsedFinalDish['ingredients'] = []

  if (lines.length === 0) {
    errors.push('Recipe text is empty')
    return {
      finalDish: { name: '', ingredients: [] },
      subRecipes: [],
      errors
    }
  }

  // First line is the recipe name
  const finalDishName = lines[0]
  
  // Process remaining lines as ingredients
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    
    // Check if this line contains a sub-recipe
    const subRecipeMatch = detectSubRecipe(line)
    
    if (subRecipeMatch) {
      // This is a sub-recipe - parse its ingredients
      const subRecipeIngredientLines = subRecipeMatch.subRecipeIngredients
        .split(',')
        .map(l => l.trim())
      
      const subRecipeIngredients = subRecipeIngredientLines
        .map(ingredientLine => {
          const parsed = parseIngredientLine(ingredientLine)
          if (!parsed) {
            errors.push(`Failed to parse sub-recipe ingredient: "${ingredientLine}"`)
            return null
          }
          return {
            ...parsed,
            originalLine: ingredientLine
          }
        })
        .filter(Boolean) as ParsedSubRecipe['ingredients']

      const subRecipe: ParsedSubRecipe = {
        name: subRecipeMatch.subRecipeName,
        ingredients: subRecipeIngredients,
        quantityInFinalDish: subRecipeMatch.quantity,
        unitInFinalDish: subRecipeMatch.unit
      }

      subRecipes.push(subRecipe)

      // Add reference to sub-recipe in final dish
      finalDishIngredients.push({
        quantity: subRecipeMatch.quantity,
        unit: subRecipeMatch.unit,
        ingredient: subRecipeMatch.subRecipeName,
        originalLine: line,
        isSubRecipe: true,
        subRecipeData: subRecipe
      })
    } else {
      // Regular ingredient
      const parsed = parseIngredientLine(line)
      if (!parsed) {
        errors.push(`Failed to parse ingredient: "${line}"`)
        continue
      }

      finalDishIngredients.push({
        ...parsed,
        originalLine: line,
        isSubRecipe: false
      })
    }
  }

  return {
    finalDish: {
      name: finalDishName,
      ingredients: finalDishIngredients
    },
    subRecipes,
    errors
  }
}

/**
 * Clean ingredient name for USDA search
 * Removes common descriptors to get better matches
 */
export function cleanIngredientForUSDASearch(ingredient: string): string {
  // Remove common descriptors
  const cleaned = ingredient
    .toLowerCase()
    .replace(/\b(fresh|raw|cooked|dried|frozen|canned|chopped|diced|minced|sliced|shredded|grated)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  
  return cleaned || ingredient
}
