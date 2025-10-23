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
  let trimmed = line.trim()
  if (!trimmed) return null
  
  // Remove common bullet points and list markers from the beginning
  // First remove U+F0B7 (Private Use Area bullet used by Apple/Microsoft) and other PUA chars
  trimmed = trimmed.replace(/^[\uE000-\uF8FF]+\s*/, '') // Private Use Area bullets
  trimmed = trimmed.replace(/^[\u2022\u2023\u25E6\u2043\u2219\-\*\+•○●▪▫■□→›»]\s*/, '') // standard bullets
  trimmed = trimmed.replace(/^\d+[\.\)]\s*/, '') // numbered lists like "1. " or "1) "
  
  // Aggressively remove ALL leading/trailing whitespace including Unicode spaces
  trimmed = trimmed.replace(/^[\s\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]+/, '')
  trimmed = trimmed.replace(/[\s\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]+$/, '')
  
  if (!trimmed) return null

  // Convert Unicode fractions to standard fractions
  const unicodeFractions: Record<string, string> = {
    '¼': '1/4',
    '½': '1/2',
    '¾': '3/4',
    '⅓': '1/3',
    '⅔': '2/3',
    '⅕': '1/5',
    '⅖': '2/5',
    '⅗': '3/5',
    '⅘': '4/5',
    '⅙': '1/6',
    '⅚': '5/6',
    '⅛': '1/8',
    '⅜': '3/8',
    '⅝': '5/8',
    '⅞': '7/8'
  }
  
  for (const [unicode, standard] of Object.entries(unicodeFractions)) {
    trimmed = trimmed.replace(new RegExp(unicode, 'g'), standard)
  }

  // Pattern: quantity (numbers, fractions, decimals) + unit + ingredient
  // Key fix: Don't include \s in quantity capture group to avoid consuming the separator space
  const pattern = /^([\d\/\.\s]+?)\s+([a-zA-Z]+)\s+(.+)$/
  const match = trimmed.match(pattern)

  if (!match) {
    // Try pattern without unit: "150 boneless chicken" or just "flour"
    const noUnitPattern = /^([\d\/\.\s]+?)\s+(.+)$/
    const noUnitMatch = trimmed.match(noUnitPattern)
    
    if (noUnitMatch) {
      const [, quantityStr, ingredient] = noUnitMatch
      let quantity = 1
      if (quantityStr) {
        const parts = quantityStr.trim().split(/\s+/)
        quantity = parts.reduce((sum, part) => {
          if (part.includes('/')) {
            const [num, denom] = part.split('/').map(Number)
            if (denom === 0 || isNaN(num) || isNaN(denom)) {
              return sum + 1
            }
            return sum + num / denom
          }
          const parsed = parseFloat(part)
          return sum + (isNaN(parsed) ? 0 : parsed)
        }, 0)
      }
      
      return {
        quantity: quantity || 1,
        unit: 'item',
        ingredient: ingredient.trim()
      }
    }
    
    // No quantity or unit, just ingredient name
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
        // Prevent division by zero
        if (denom === 0 || isNaN(num) || isNaN(denom)) {
          return sum + 1 // Default to 1 if invalid fraction
        }
        return sum + num / denom
      }
      const parsed = parseFloat(part)
      return sum + (isNaN(parsed) ? 0 : parsed)
    }, 0)
  }

  // Ensure quantity is valid and within reasonable bounds
  const MAX_QUANTITY = 1000000 // Prevent overflow
  if (isNaN(quantity) || !isFinite(quantity) || quantity <= 0) {
    quantity = 1
  } else if (quantity > MAX_QUANTITY) {
    quantity = MAX_QUANTITY // Cap at maximum
  }

  // Limit ingredient name length
  const ingredientName = ingredient.trim().slice(0, 255)

  return {
    quantity,
    unit: unit || 'item',
    ingredient: ingredientName
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
  hasNestedParentheses?: boolean
} | null {
  // Pattern: "1 cup salsa verde (ingredients here)"
  const pattern = /^\s*([\d\s\/\.]+)?\s*([a-zA-Z]+)?\s+([^(]+)\s*\(([^)]+)\)\s*$/
  const match = line.match(pattern)

  if (!match) return null

  // Check for nested parentheses in the ingredients
  const ingredientsText = match[4]
  const hasNestedParentheses = /\(|\)/.test(ingredientsText)

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
    subRecipeIngredients: ingredients.trim(),
    hasNestedParentheses
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

  if (lines.length === 1) {
    errors.push('Recipe must have at least one ingredient. Add ingredients on separate lines after the recipe name.')
    return {
      finalDish: { name: lines[0], ingredients: [] },
      subRecipes: [],
      errors
    }
  }

  // First line is the recipe name
  const finalDishName = lines[0]
  
  // Process remaining lines as ingredients
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    
    // Check for unbalanced parentheses
    const openParens = (line.match(/\(/g) || []).length
    const closeParens = (line.match(/\)/g) || []).length
    
    if (openParens !== closeParens) {
      errors.push(`❌ Error: Line "${line}" has unbalanced parentheses (${openParens} opening, ${closeParens} closing). Each opening parenthesis must have a matching closing parenthesis.`)
      continue
    }
    
    // Check if this line contains a sub-recipe
    const subRecipeMatch = detectSubRecipe(line)
    
    if (subRecipeMatch) {
      // Check for empty parentheses
      if (!subRecipeMatch.subRecipeIngredients.trim()) {
        errors.push(`❌ Error: "${subRecipeMatch.subRecipeName}" has empty parentheses. Sub-recipes must have ingredients listed inside parentheses.`)
        continue
      }

      // Warn about nested parentheses
      if (subRecipeMatch.hasNestedParentheses) {
        errors.push(`⚠️ Warning: "${subRecipeMatch.subRecipeName}" contains nested parentheses. Only the outermost level is supported. Inner parentheses will be treated as regular text.`)
      }

      // This is a sub-recipe - parse its ingredients
      const subRecipeIngredientLines = subRecipeMatch.subRecipeIngredients
        .split(',')
        .map(l => l.trim())
        .filter(l => l) // Remove empty lines
      
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

      // Check for duplicate sub-recipe names
      const existingSubRecipe = subRecipes.find(sr => sr.name.toLowerCase() === subRecipe.name.toLowerCase())
      if (existingSubRecipe) {
        errors.push(`⚠️ Warning: Duplicate sub-recipe name "${subRecipe.name}". Each sub-recipe will be created separately. Consider using different names if they're different recipes.`)
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

      // Warn if unit is 'item' (likely missing unit)
      if (parsed.unit === 'item' && !line.toLowerCase().includes('item')) {
        errors.push(`⚠️ Warning: "${parsed.ingredient}" has no unit specified. Defaulting to "item" which may affect nutrition calculations. Consider adding a unit (cups, grams, etc.)`)
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
 * Clean ingredient name for better USDA search results
 * Removes common descriptors and sanitizes special characters
 * Handles: slashes, parentheses, quotes, commas, ampersands, symbols, Unicode, etc.
 */
export function cleanIngredientForUSDASearch(ingredient: string): string {
  // Validate input
  if (!ingredient || typeof ingredient !== 'string') {
    return ''
  }
  
  // Remove common descriptors and clean up special characters
  const cleaned = ingredient
    .toLowerCase()
    // Remove trademark/registered symbols
    .replace(/[™®©]/g, '')
    // Remove parentheses/brackets and their contents
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\{[^}]*\}/g, '')
    // Replace forward slashes with spaces (e.g., "boneless/skinless" → "boneless skinless")
    .replace(/\//g, ' ')
    // Replace ampersands with "and"
    .replace(/\s*&\s*/g, ' and ')
    // Replace em dashes and en dashes with spaces
    .replace(/[—–]/g, ' ')
    // Remove commas (often used in reversed names like "chicken, boneless")
    .replace(/,/g, ' ')
    // Remove quotes (both straight and curly)
    .replace(/["""''']/g, '')
    // Remove special symbols that don't add meaning
    .replace(/[+*#@!?°%]/g, ' ')
    // Remove periods (except in decimal numbers)
    .replace(/\.(?!\d)/g, ' ')
    // Remove common cooking descriptors
    .replace(/\b(fresh|raw|cooked|dried|frozen|canned|chopped|diced|minced|sliced|shredded|grated|julienned|peddled|organic|free-range|grass-fed|wild-caught|extra|virgin|pure|natural|whole|part-skim|low-fat|non-fat|reduced-fat|unsalted|salted|sweetened|unsweetened)\b/g, '')
    // Collapse multiple spaces and hyphens
    .replace(/\s+/g, ' ')
    .replace(/-+/g, '-')
    .trim()
  
  // If cleaning resulted in empty string, return original (lowercase, trimmed)
  const result = cleaned || ingredient.toLowerCase().trim()
  
  // Truncate very long queries (URL length limits)
  const MAX_QUERY_LENGTH = 200
  if (result.length > MAX_QUERY_LENGTH) {
    console.warn(`[USDA] Truncating long query from ${result.length} to ${MAX_QUERY_LENGTH} chars`)
    return result.substring(0, MAX_QUERY_LENGTH).trim()
  }
  
  return result
}
