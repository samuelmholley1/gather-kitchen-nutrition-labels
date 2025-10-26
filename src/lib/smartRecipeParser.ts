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

import { isIngredientUnit } from './ingredientTaxonomy'

export interface ParsedSubRecipe {
  name: string
  ingredients: {
    quantity: number
    unit: string
    ingredient: string
    originalLine: string
    needsSpecification?: boolean
    specificationPrompt?: string
    specificationOptions?: string[]
    baseIngredient?: string
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
    needsSpecification?: boolean
    specificationPrompt?: string
    specificationOptions?: string[]
    baseIngredient?: string
  }[]
}

export interface SmartParseResult {
  finalDish: ParsedFinalDish
  subRecipes: ParsedSubRecipe[]
  errors: string[]
  explicitServings?: number // If recipe explicitly states serving count
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
 * Merge descriptive parentheses into the ingredient name
 * "chicken (boneless, skinless breast)" → "boneless skinless chicken breast"
 * "tomatoes (fresh, diced)" → "fresh diced tomatoes"
 * Handles multiple parentheses: "chicken (boneless) (organic)" → "boneless organic chicken"
 * 
 * BUT: Strips purely informational parentheses like "(about 1 cup)", "(optional)"
 */
function mergeDescriptiveParentheses(ingredient: string): string {
  // First pass: Remove purely informational parentheses (don't merge them)
  // e.g., "(about 1 1/2 cups)", "(optional)", "(to taste)"
  const descriptivePrefixes = /\((?:about|approximately|approx|roughly|around|optional|to taste|as needed|or more|or less|plus more|divided)[^)]*\)/gi
  let processed = ingredient.replace(descriptivePrefixes, '').replace(/\s+/g, ' ').trim()
  
  // Handle multiple parentheses groups by processing them sequentially
  let iterations = 0
  const MAX_ITERATIONS = 5 // Prevent infinite loops
  
  while (processed.includes('(') && processed.includes(')') && iterations < MAX_ITERATIONS) {
    const parenPattern = /^(.+?)\s*\(([^)]+)\)\s*(.*)$/
    const match = processed.match(parenPattern)
    
    if (!match) break
    
    const [, beforeParen, parenContent, afterParen] = match
    
    // If there's content after the parentheses, recursively merge it
    if (afterParen.trim()) {
      // Merge the first parentheses, then continue with the rest
      const merged = mergeSingleParentheses(beforeParen, parenContent)
      processed = `${merged} ${afterParen}`.trim()
    } else {
      // Last parentheses group - merge it
      processed = mergeSingleParentheses(beforeParen, parenContent)
      break
    }
    
    iterations++
  }
  
  return processed
}

/**
 * Helper to merge a single parentheses group
 */
function mergeSingleParentheses(baseInput: string, parenInput: string): string {
  const baseName = baseInput.trim()
  const parenContent = parenInput.trim()
  
  // Clean up and split descriptors from parentheses
  const cleanBase = baseName.trim()
  const parenDescriptors = parenContent.split(',').map(d => d.trim())
  
  // Also check if the base name has descriptors that should be moved
  // Colors, sizes, etc. that modify the core ingredient
  const baseWords = cleanBase.split(/\s+/)
  
  // Patterns for different descriptor types
  const bodyPartPattern = /\b(breast|thigh|leg|wing|fillet|loin|rib|back|neck|shoulder|drumstick)s?\b/i
  const colorPattern = /\b(red|green|yellow|orange|white|black|purple|brown|pink)$/i
  const prepPattern = /\b(diced|chopped|sliced|minced|shredded|grated|crushed|fresh|dried|cooked|raw|roasted|grilled|boneless|skinless)$/i
  
  // Split base name into actual core ingredient vs descriptors
  const coreIngredient: string[] = []
  const baseDescriptors: string[] = []
  
  baseWords.forEach(word => {
    if (colorPattern.test(word) || prepPattern.test(word)) {
      baseDescriptors.push(word)
    } else {
      coreIngredient.push(word)
    }
  })
  
  // If we didn't identify any core ingredient, treat the whole base as core
  const core = coreIngredient.length > 0 ? coreIngredient.join(' ') : cleanBase
  
  // Categorize all descriptors
  const bodyPartDescriptors: string[] = []
  const otherDescriptors: string[] = [...baseDescriptors]
  
  parenDescriptors.forEach(desc => {
    const bodyPartMatch = desc.match(bodyPartPattern)
    if (bodyPartMatch) {
      // Split the descriptor into body part and other words
      const words = desc.split(/\s+/)
      words.forEach(word => {
        if (bodyPartPattern.test(word)) {
          bodyPartDescriptors.push(word)
        } else {
          otherDescriptors.push(word)
        }
      })
    } else {
      otherDescriptors.push(desc)
    }
  })
  
  // Format: [other descriptors] + [core ingredient] + [body part descriptors]
  const parts = [
    ...otherDescriptors,
    core,
    ...bodyPartDescriptors
  ].filter(p => p)
  
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

/**
 * Check if an ingredient line contains a sub-recipe (has parentheses with ingredients)
 * 
 * Distinguishes between:
 * - Sub-recipes: "1 cup salsa (tomato, onion, cilantro)" - actual ingredient list
 * - Descriptions: "chicken (boneless, skinless breast)" - just descriptive attributes
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

  // Quick check: If parentheses content starts with descriptive words, it's NOT a sub-recipe
  // e.g., "(about 1 1/2 cups)", "(approximately 2 lbs)", "(optional)", "(to taste)"
  const descriptivePrefixes = /^(about|approximately|approx|roughly|around|optional|to taste|as needed|or more|or less|plus more|divided)/i
  if (descriptivePrefixes.test(ingredients.trim())) {
    return null // This is just a descriptive note, not a sub-recipe
  }

  // Split by commas to analyze the content
  const items = ingredients.split(',').map(s => s.trim())
  
  // If there's only ONE item (no commas) and it's not clearly multiple ingredients,
  // it's likely a descriptor, not a sub-recipe
  // e.g., "(about 1 1/2 cups)", "(large)", "(diced)"
  if (items.length === 1) {
    // Check if this single item looks like a measurement/descriptor
    const singleItem = items[0]
    const hasMultipleNumbers = (singleItem.match(/\d+/g) || []).length > 1
    const hasUnit = /\b(cup|tbsp|tsp|tablespoon|teaspoon|oz|ounce|pound|lb|gram|g|kg|ml|liter|l)\b/i.test(singleItem)
    
    // If it's just a measurement (e.g., "1 1/2 cups") or size (e.g., "large"), not a sub-recipe
    if (hasUnit || hasMultipleNumbers || singleItem.split(/\s+/).length <= 2) {
      return null // Descriptor, not a sub-recipe
    }
  }
  
  // Check if items look like actual ingredients (vs just descriptive words)
  // Real ingredients typically:
  // 1. Have quantities/numbers: "1 tomato", "2 cups water"
  // 2. Have units: "1 cup", "2 tablespoons"
  // 3. Are food nouns: "tomato", "garlic", "basil"
  //
  // Descriptive attributes are typically:
  // 1. Single adjectives: "boneless", "skinless", "fresh"
  // 2. Body part nouns without quantities: "breast", "thigh"
  // 3. Preparation methods: "diced", "chopped", "cooked"
  
  let ingredientLikeCount = 0
  let descriptorLikeCount = 0
  
  for (const item of items) {
    const words = item.split(/\s+/)
    
    // Check if it looks like an ingredient line
    const hasNumber = /\d/.test(item)
    const hasCommonUnit = /\b(cup|tbsp|tsp|tablespoon|teaspoon|oz|ounce|pound|lb|gram|kg|ml|liter)\b/i.test(item)
    // Common food words (including plurals)
    const hasCommonFood = /\b(tomatoes?|onions?|garlics?|peppers?|oils?|water|salt|sugars?|flours?|cheeses?|meats?|chickens?|beef|pork|fish|rice|beans?|carrots?|celer[yi]|basil|cilantro|parsley|eggs?|milk|creams?|butters?|sauces?|broths?|stocks?)\b/i.test(item)
    
    // Check if it looks like a descriptor
    const commonDescriptors = /\b(boneless|skinless|fresh|raw|cooked|dried|frozen|canned|organic|chopped|diced|minced|sliced|shredded|grated|whole|ground|breast|thigh|leg|wing|fillet|loin|rib|back|neck|shoulder)\b/i
    const matchesDescriptor = commonDescriptors.test(item)
    // Single short word that's NOT a food word
    const isShortAdjective = words.length === 1 && item.length < 12 && !hasCommonFood
    
    // Strong signals of an ingredient:
    // 1. Has a number or unit (e.g., "1 tomato", "2 cups")
    // 2. Contains a common food word without descriptors (e.g., "carrots", "garlic")
    if (hasNumber || hasCommonUnit) {
      ingredientLikeCount++
    } else if (hasCommonFood && !matchesDescriptor) {
      // Food word without descriptors is likely an ingredient
      ingredientLikeCount++
    } else if (matchesDescriptor || isShortAdjective) {
      descriptorLikeCount++
    }
  }
  
  // If most items look like descriptors, it's NOT a sub-recipe
  if (descriptorLikeCount > 0 && descriptorLikeCount >= ingredientLikeCount) {
    return null // Treat as a regular ingredient with descriptive parentheses
  }
  
  // If we have fewer than 2 items that look like ingredients, probably not a sub-recipe
  if (ingredientLikeCount < 2 && items.length >= 2) {
    return null // Likely just descriptive text
  }

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
 * Sanitize recipe text - strip HTML, normalize whitespace, handle special characters
 */
function sanitizeRecipeText(text: string): string {
  // Strip HTML tags (common when copying from websites)
  let sanitized = text.replace(/<[^>]*>/g, '')
  
  // Decode common HTML entities
  const entities: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&frac12;': '1/2',
    '&frac14;': '1/4',
    '&frac34;': '3/4',
    '&#189;': '1/2',
    '&#188;': '1/4',
    '&#190;': '3/4'
  }
  
  for (const [entity, replacement] of Object.entries(entities)) {
    sanitized = sanitized.replace(new RegExp(entity, 'g'), replacement)
  }
  
  // Convert Unicode fractions to regular fractions
  const unicodeFractions: Record<string, string> = {
    '½': '1/2',
    '⅓': '1/3',
    '⅔': '2/3',
    '¼': '1/4',
    '¾': '3/4',
    '⅕': '1/5',
    '⅖': '2/5',
    '⅗': '3/5',
    '⅘': '4/5',
    '⅙': '1/6',
    '⅚': '5/6',
    '⅐': '1/7',
    '⅛': '1/8',
    '⅜': '3/8',
    '⅝': '5/8',
    '⅞': '7/8',
    '⅑': '1/9',
    '⅒': '1/10'
  }
  
  for (const [unicode, fraction] of Object.entries(unicodeFractions)) {
    sanitized = sanitized.replace(new RegExp(unicode, 'g'), fraction)
  }
  
  // Remove emojis (can cause parsing issues) - using ES5-compatible pattern
  sanitized = sanitized.replace(/[\uD800-\uDFFF]./g, '') // Remove surrogate pairs (emojis)
  sanitized = sanitized.replace(/[\u2600-\u27BF]/g, '') // Remove dingbats and symbols
  
  // Normalize multiple spaces/tabs to single space (but preserve newlines!)
  sanitized = sanitized.replace(/[ \t]+/g, ' ')
  
  // Remove zero-width characters and other invisible Unicode
  sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, '')
  
  return sanitized.trim()
}

/**
 * Check if a line should be skipped (not an ingredient)
 * Filters out: directions, source info, ratings, metadata, etc.
 */
function shouldSkipLine(line: string, recipeTitle?: string, allLines?: string[], currentIndex?: number): boolean {
  const trimmed = line.trim().toLowerCase()
  
  // Empty lines
  if (!trimmed) return true
  
  // Skip if this line is identical to the recipe title (duplicate)
  if (recipeTitle && trimmed === recipeTitle.toLowerCase()) {
    return true
  }
  
  // Section headers and metadata keywords
  const skipPatterns = [
    /^(directions?|instructions?|steps?|method|preparation|prep time|cook time|total time):?$/i,
    /^(source|from|recipe (from|by|courtesy)|adapted from):?$/i,
    /^(nutrition|nutritional? info(rmation)?|calories):?$/i,
    /^(notes?|tips?|variations?):?$/i,
    /^(ingredients?):?$/i, // Just the word "Ingredients" by itself
    /^(makes?|serves?|servings?|yield):?$/i, // Just the word without number
    /^(wash hands|preheat|heat|bake|cook|stir|mix|combine|pour|add|remove|place|set)/i, // Cooking actions
    /rating/i,
    /add to (cookbook|favorites)/i,
  ]
  
  for (const pattern of skipPatterns) {
    if (pattern.test(trimmed)) {
      return true
    }
  }
  
  // Skip lines that are just URLs
  if (/^https?:\/\//i.test(trimmed)) {
    return true
  }
  
  // Skip lines that look like full sentences (directions)
  // Heuristic: If it has more than 8 words and ends with period, likely a direction
  const wordCount = trimmed.split(/\s+/).length
  if (wordCount > 8 && (trimmed.endsWith('.') || trimmed.endsWith('!'))) {
    return true
  }
  
  // Skip lines that are just a number followed by "Servings" or similar
  // e.g., "12 Servings", "8 servings"
  if (/^\d+\s+(servings?|serves?|portions?|people)$/i.test(trimmed)) {
    return true
  }
  
  // Skip lines that look like organization names (multiple capitalized words without numbers)
  // e.g., "Ohio State University Cooperative Extension"
  const hasNoNumbers = !/\d/.test(line) // Original case-sensitive check
  const hasMultipleCapitalizedWords = (line.match(/\b[A-Z][a-z]+/g) || []).length >= 3
  const looksLikeOrganization = hasNoNumbers && hasMultipleCapitalizedWords && wordCount >= 3
  
  if (looksLikeOrganization) {
    return true
  }
  
  // Skip single-word lines that don't have numbers (likely section headers)
  // e.g., "Ingredients", "Directions", "Servings"
  if (wordCount === 1 && !/\d/.test(trimmed)) {
    return true
  }
  
  // Check if previous line was a section header (context-aware skipping)
  if (allLines && currentIndex !== undefined && currentIndex > 0) {
    const prevLine = allLines[currentIndex - 1].trim().toLowerCase()
    
    // If previous line was "Source:" or similar, skip current line
    if (/^(source|from|adapted from|recipe (by|from)|courtesy of):?$/i.test(prevLine)) {
      return true
    }
  }
  
  return false
}

/**
 * Extract explicit serving count from recipe text
 * Handles: "Makes: 12 Servings", "Serves 8", "Yield: 6 servings", etc.
 * Also handles split lines: "Makes:" on one line, "12 Servings" on next
 */
function extractServingCount(lines: string[]): number | undefined {
  const servingPatterns = [
    /^(makes?|serves?|servings?|yield):?\s*(\d+)/i,
    /(\d+)\s+(servings?|serves?|portions?|people)/i,
  ]
  
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    
    // Try patterns on current line
    for (const pattern of servingPatterns) {
      const match = trimmed.match(pattern)
      if (match) {
        // Extract the number (could be in capture group 2 or 1)
        const numStr = match[2] || match[1]
        const num = parseInt(numStr, 10)
        
        if (!isNaN(num) && num > 0 && num <= 1000) {
          return num
        }
      }
    }
    
    // Check for split pattern: "Makes:" on one line, "12 Servings" on next
    if (/^(makes?|serves?|yield):?$/i.test(trimmed) && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim()
      const splitMatch = nextLine.match(/^(\d+)\s*(servings?|serves?|portions?|people)?/i)
      
      if (splitMatch) {
        const num = parseInt(splitMatch[1], 10)
        if (!isNaN(num) && num > 0 && num <= 1000) {
          return num
        }
      }
    }
  }
  
  return undefined
}

/**
 * Parse a complete recipe with auto-detection of sub-recipes
 */
export function parseSmartRecipe(recipeText: string): SmartParseResult {
  // Sanitize input first
  const sanitized = sanitizeRecipeText(recipeText)
  
  // Check session storage size limit (most browsers: ~5-10MB)
  const sizeInBytes = new Blob([sanitized]).size
  const MAX_SIZE_MB = 5
  if (sizeInBytes > MAX_SIZE_MB * 1024 * 1024) {
    return {
      finalDish: { name: '', ingredients: [] },
      subRecipes: [],
      errors: [`Recipe text is too large (${(sizeInBytes / 1024 / 1024).toFixed(2)}MB). Maximum size is ${MAX_SIZE_MB}MB. Please split into multiple recipes.`]
    }
  }
  
  const lines = sanitized.split('\n').map(l => l.trim()).filter(l => l)
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

  // Extract explicit serving count from all lines
  const explicitServings = extractServingCount(lines)
  
  // First line is the recipe name
  const recipeTitle = lines[0]
  
  // Filter out non-ingredient lines
  const filteredLines = lines.filter((line, index) => {
    // First line is always the recipe name (never skip)
    if (index === 0) return true
    
    // Check if this line should be skipped (pass context)
    return !shouldSkipLine(line, recipeTitle, lines, index)
  })

  if (filteredLines.length === 1) {
    // Check if the single line looks like it has multiple ingredients mashed together
    const hasMultipleQuantities = (filteredLines[0].match(/\d+\s*(g|gram|oz|cup|tbsp|tsp|lb|kg|ml)/gi) || []).length > 1
    
    if (hasMultipleQuantities) {
      errors.push('⚠️ It looks like all ingredients are on ONE line. Please format your recipe with:\n• Recipe name on the FIRST line\n• Blank line\n• Each ingredient on a SEPARATE line\n\nExample:\nChicken Tacos\n\n2 cups chicken\n1 cup salsa\n8 tortillas')
    } else {
      errors.push('Recipe must have at least one ingredient. Add ingredients on separate lines after the recipe name.')
    }
    return {
      finalDish: { name: filteredLines[0], ingredients: [] },
      subRecipes: [],
      errors,
      explicitServings
    }
  }

  // First line is the recipe name
  const finalDishName = filteredLines[0]
  
  // Process remaining lines as ingredients
  for (let i = 1; i < filteredLines.length; i++) {
    const line = filteredLines[i]
    
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
            errors.push(`❌ Error: Failed to parse sub-recipe ingredient in "${subRecipeMatch.subRecipeName}": "${ingredientLine}"`)
            return null
          }
          
          // Check if this sub-recipe ingredient needs specification
          const ingredientCheck = isIngredientUnit(parsed.unit)
          const ingredientData: any = {
            ...parsed,
            originalLine: ingredientLine
          }

          // If ingredient needs specification, add the metadata
          // BUT only if variety/size is not already specified in the ingredient name
          if (ingredientCheck.needsSpec) {
            const hasVarietyInName = ingredientCheck.varieties?.some(variety => 
              parsed.ingredient.toLowerCase().includes(variety.toLowerCase())
            )
            
            if (!hasVarietyInName) {
              ingredientData.needsSpecification = true
              ingredientData.baseIngredient = ingredientCheck.baseIngredient
              ingredientData.specificationPrompt = `What type/size of ${ingredientCheck.baseIngredient}?`
              ingredientData.specificationOptions = ingredientCheck.varieties
            }
          }

          return ingredientData
        })
        .filter(Boolean) as ParsedSubRecipe['ingredients']

      // Validate that all sub-recipe ingredients have explicit quantities
      const missingQuantities: string[] = []
      subRecipeIngredients.forEach(ing => {
        // Check if the original line had a number in it
        const hasExplicitQuantity = /^\s*[\d\/\.]/.test(ing.originalLine)
        if (!hasExplicitQuantity) {
          missingQuantities.push(ing.ingredient)
        }
      })

      if (missingQuantities.length > 0) {
        errors.push(`❌ Error: Sub-recipe "${subRecipeMatch.subRecipeName}" has ingredients without quantities: ${missingQuantities.join(', ')}. Please add quantities for all sub-recipe ingredients (e.g., "1 cup", "2 tablespoons").`)
        continue // Skip this sub-recipe
      }

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
      // Regular ingredient (not a sub-recipe)
      const parsed = parseIngredientLine(line)
      if (!parsed) {
        errors.push(`Failed to parse ingredient: "${line}"`)
        continue
      }

      // If ingredient has parentheses, merge them into the ingredient name
      // Handle three cases:
      // 1. "4 tomatoes (fresh, diced)" → unit="tomatoes", ingredient="(fresh, diced)"
      // 2. "1 red bell pepper (diced)" → unit="red", ingredient="bell pepper (diced)"
      // 3. "1 cup chicken (boneless, skinless)" → unit="cup", ingredient="chicken (boneless, skinless)"
      
      // Check if unit is actually a descriptor/color (not a real unit)
      const realUnits = /^(cup|tbsp|tsp|tablespoon|teaspoon|oz|ounce|pound|lb|gram|g|kg|ml|liter|l|item|clove|pinch|dash|slice|piece|large|medium|small|extra-large|jumbo|xl)s?$/i
      const isUnitActuallyDescriptor = !realUnits.test(parsed.unit)
      
      if (parsed.ingredient.startsWith('(') && parsed.ingredient.endsWith(')')) {
        // Case 1: Ingredient is JUST parentheses - the base name was parsed as the unit
        // "4 tomatoes (fresh, diced)" → unit="tomatoes", ingredient="(fresh, diced)"
        const fullIngredient = `${parsed.unit} ${parsed.ingredient}`
        parsed.ingredient = mergeDescriptiveParentheses(fullIngredient)
        parsed.unit = 'item' // Reset unit since it was actually part of the ingredient name
      } else if (isUnitActuallyDescriptor && parsed.ingredient.includes('(') && parsed.ingredient.includes(')')) {
        // Case 2: Unit is actually a descriptor (like "red" in "1 red bell pepper (diced)")
        // Merge unit into ingredient, then merge parentheses
        const fullIngredient = `${parsed.unit} ${parsed.ingredient}`
        parsed.ingredient = mergeDescriptiveParentheses(fullIngredient)
        parsed.unit = 'item'
      } else if (parsed.ingredient.includes('(') && parsed.ingredient.includes(')')) {
        // Case 3: Ingredient has parentheses embedded, unit is real
        // "1 cup chicken (boneless, skinless)" → ingredient contains both base and parentheses
        parsed.ingredient = mergeDescriptiveParentheses(parsed.ingredient)
      }

      // Validate regular ingredient has quantity and unit
      if (!parsed.quantity || parsed.quantity === 0 || isNaN(parsed.quantity)) {
        errors.push(`❌ Error: Ingredient "${parsed.ingredient}" has no quantity. Please add a number (e.g., "2 cups", "4 items", "1 lb").`)
        continue // Skip this ingredient
      }

      // Validate quantity is positive and reasonable
      if (parsed.quantity < 0) {
        errors.push(`❌ Error: Ingredient "${parsed.ingredient}" has negative quantity (${parsed.quantity}). Quantities must be positive.`)
        continue
      }

      if (parsed.quantity > 100000) {
        errors.push(`⚠️ Warning: Ingredient "${parsed.ingredient}" has very large quantity (${parsed.quantity} ${parsed.unit}). Please verify this is correct.`)
      }

      // Check for vague or non-standard units
      const vagueUnits = ['some', 'a little', 'a bit', 'bunch', 'handful', 'splash']
      if (vagueUnits.includes(parsed.unit.toLowerCase())) {
        errors.push(`⚠️ Warning: Ingredient "${parsed.ingredient}" uses vague unit "${parsed.unit}". Consider using precise measurements like "cup", "tbsp", "oz" for better nutrition accuracy.`)
      }
      
      // Warn if unit is 'item' (likely missing unit) and wasn't explicitly written
      if (parsed.unit === 'item' && !line.toLowerCase().includes('item')) {
        errors.push(`⚠️ Warning: "${parsed.ingredient}" has no unit specified. Defaulting to "item" which may affect nutrition calculations. Consider adding a unit (cups, grams, etc.)`)
      }

      // Check if this ingredient needs specification (e.g., tomato size/variety)
      const ingredientCheck = isIngredientUnit(parsed.unit)
      
      const ingredientData: any = {
        ...parsed,
        originalLine: line,
        isSubRecipe: false
      }

      // If ingredient needs specification, add the metadata
      // BUT only if variety/size is not already specified in the ingredient name
      if (ingredientCheck.needsSpec) {
        const hasVarietyInName = ingredientCheck.varieties?.some(variety => 
          parsed.ingredient.toLowerCase().includes(variety.toLowerCase())
        )
        
        if (!hasVarietyInName) {
          ingredientData.needsSpecification = true
          ingredientData.baseIngredient = ingredientCheck.baseIngredient
          ingredientData.specificationPrompt = `What type/size of ${ingredientCheck.baseIngredient}?`
          ingredientData.specificationOptions = ingredientCheck.varieties
        }
      }

      finalDishIngredients.push(ingredientData)
    }
  }

  return {
    finalDish: {
      name: finalDishName,
      ingredients: finalDishIngredients
    },
    subRecipes,
    errors,
    explicitServings
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

/**
 * Generate multiple search query variants to try if initial search fails
 * Returns an array of progressively simpler queries to maximize match chances
 */
export function generateSearchVariants(ingredient: string): string[] {
  if (!ingredient || typeof ingredient !== 'string') {
    return []
  }

  const variants: string[] = []
  const original = ingredient.toLowerCase().trim()
  
  // 1. Fully cleaned version (what we normally use)
  const fullyCleaned = cleanIngredientForUSDASearch(ingredient)
  if (fullyCleaned && fullyCleaned.length > 0) {
    variants.push(fullyCleaned)
  }
  
  // 2. Minimally cleaned (just lowercase, remove symbols, trim)
  const minimalCleaned = original
    .replace(/[™®©]/g, '')
    .replace(/["""''']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (minimalCleaned && minimalCleaned !== fullyCleaned) {
    variants.push(minimalCleaned)
  }
  
  // 3. Remove everything after common separators (get main ingredient)
  const mainIngredient = original.split(/[,;]/)[0].trim()
  const cleanedMain = cleanIngredientForUSDASearch(mainIngredient)
  if (cleanedMain && cleanedMain.length > 0 && !variants.includes(cleanedMain)) {
    variants.push(cleanedMain)
  }
  
  // 4. Extract last 1-3 words (often the core noun)
  const words = fullyCleaned.split(/\s+/)
  if (words.length >= 2) {
    // Last 2 words (e.g., "boneless skinless chicken breast" → "chicken breast")
    const lastTwo = words.slice(-2).join(' ')
    if (lastTwo && !variants.includes(lastTwo)) {
      variants.push(lastTwo)
    }
  }
  if (words.length >= 3) {
    // Last 3 words
    const lastThree = words.slice(-3).join(' ')
    if (lastThree && !variants.includes(lastThree)) {
      variants.push(lastThree)
    }
  }
  
  // 5. Just the last word (the main noun, usually)
  if (words.length >= 2) {
    const lastWord = words[words.length - 1]
    if (lastWord && lastWord.length > 2 && !variants.includes(lastWord)) {
      variants.push(lastWord)
    }
  }
  
  // 6. Try plural/singular variations of the main variants
  const pluralSingularVariants: string[] = []
  variants.slice(0, 3).forEach(variant => {
    if (variant.endsWith('s') && variant.length > 3) {
      // Try removing 's' for singular
      const singular = variant.slice(0, -1)
      if (!variants.includes(singular)) {
        pluralSingularVariants.push(singular)
      }
    } else if (!variant.endsWith('s')) {
      // Try adding 's' for plural
      const plural = variant + 's'
      if (!variants.includes(plural)) {
        pluralSingularVariants.push(plural)
      }
    }
  })
  variants.push(...pluralSingularVariants)
  
  // 7. Common substitutions for better matches
  const substitutions: Array<[RegExp, string]> = [
    [/\bboneless\s+skinless\s+chicken\b/gi, 'chicken breast'],
    [/\bground\s+beef\b/gi, 'beef ground'],
    [/\bextra\s+virgin\s+olive\s+oil\b/gi, 'olive oil'],
    [/\bheavy\s+cream\b/gi, 'cream'],
    [/\bsour\s+cream\b/gi, 'cream sour'],
    [/\ball\s+purpose\s+flour\b/gi, 'flour wheat'],
    [/\bbrown\s+sugar\b/gi, 'sugar brown'],
    [/\bwhite\s+sugar\b/gi, 'sugar'],
  ]
  
  substitutions.forEach(([pattern, replacement]) => {
    const substituted = fullyCleaned.replace(pattern, replacement)
    if (substituted !== fullyCleaned && !variants.includes(substituted)) {
      variants.push(substituted)
    }
  })
  
  // Remove duplicates and empty strings
  const uniqueVariants = Array.from(new Set(variants)).filter(v => v && v.length > 0)
  
  // Limit to top 10 variants to avoid too many API calls
  return uniqueVariants.slice(0, 10)
}
