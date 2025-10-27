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
 * Cooking descriptors that don't affect ingredient selection are preserved in qualifiers
 * but NOT stripped from base (to avoid breaking selection)
 */
export function canonicalize(input: string): Canon {
  const lower = input.toLowerCase().replace(/\s+/g, ' ').trim()
  
  // Split on parentheses and commas to extract parts
  const parts = lower.split(/[(),]/).map(s => s.trim()).filter(Boolean)
  
  // First part is the base - preserve cooking descriptors that don't change type
  const rawBase = parts[0] || lower
  
  // Non-type-changing qualifiers (prep methods that don't affect ingredient selection)
  const prepQualifiers = /\b(sifted|chopped|diced|minced|sliced|shredded|grated|finely|coarse|crushed|ground)\b/g
  
  // Extract prep qualifiers from the base
  const prepMatches = rawBase.match(prepQualifiers) || []
  const base = rawBase.replace(prepQualifiers, '').replace(/\s+/g, ' ').trim() || rawBase
  
  // Combine prep qualifiers with other parts
  const qualifiers = [...prepMatches, ...parts.slice(1)].filter(q => q.length > 0)
  
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
