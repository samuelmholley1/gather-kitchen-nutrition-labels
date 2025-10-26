/**
 * Ingredient canonicalization
 * Transforms raw ingredient strings into structured { base, qualifiers }
 * This prevents descriptor-stripping from breaking ingredient selection
 */

export interface Canon {
  base: string
  qualifiers: string[]
}

/**
 * Canonicalize an ingredient string
 * 
 * Examples:
 * - "flour, sifted" → { base: "flour", qualifiers: ["sifted"] }
 * - "chicken (boneless, skinless)" → { base: "chicken", qualifiers: ["boneless", "skinless"] }
 * - "2 cups flour" → { base: "flour", qualifiers: [] }
 * 
 * Cooking descriptors that don't affect ingredient selection are stripped from base
 * but preserved in qualifiers if they appear in parentheses/commas
 */
export function canonicalize(input: string): Canon {
  const lower = input.toLowerCase().replace(/\s+/g, ' ').trim()
  
  // Split on parentheses and commas to extract parts
  const parts = lower.split(/[(),]/).map(s => s.trim()).filter(Boolean)
  
  // First part is the base, but we need to strip cooking descriptors
  const cookingDescriptors = /\b(sifted|chopped|diced|minced|sliced|shredded|grated|finely|coarse|crushed|ground|fresh|raw|cooked|dried|frozen)\b/g
  const rawBase = parts[0] || lower
  const base = rawBase.replace(cookingDescriptors, '').replace(/\s+/g, ' ').trim() || rawBase
  
  // Remaining parts are qualifiers
  const qualifiers = parts.slice(1).filter(q => q.length > 0)
  
  return { base, qualifiers }
}

/**
 * Check if qualifiers indicate a specialty flour type
 */
export function hasSpecialtyFlourQualifier(qualifiers: string[]): boolean {
  const specialtyKeywords = [
    'almond', 'coconut', 'rye', 'spelt', 'self-rising', 'self rising',
    'gluten-free', 'gluten free', 'bread', 'cake', 'pastry',
    '00', 'tipo 00', 'buckwheat', 'rice', 'oat', 'corn', 'potato',
    'sorghum', 'millet', 'teff', 'kamut', 'einkorn', 'emmer', 'farro'
  ]
  
  return qualifiers.some(q => 
    specialtyKeywords.some(keyword => q.includes(keyword))
  )
}
