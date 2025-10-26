/**
 * Flour taxonomy for USDA ingredient selection
 * Defines what counts as "specialty" vs "standard" flour
 */

/**
 * Check if a USDA food description indicates specialty flour
 * 
 * Specialty flours should NOT be selected when user says just "flour"
 */
export function isSpecialtyFlour(desc: string): boolean {
  const d = desc.toLowerCase()
  
  // Italian/European specialty
  if (/\b(00|tipo 00)\b/.test(d)) return true
  
  // Nut/seed flours
  if (/\b(almond|coconut|hazelnut|walnut|pecan|pistachio|macadamia)\b/.test(d)) return true
  
  // Grain alternatives
  if (/\b(rye|spelt|buckwheat|quinoa|amaranth|teff|millet|sorghum|kamut|einkorn|emmer|farro)\b/.test(d)) return true
  
  // Rice/corn/potato
  if (/\b(rice flour|corn flour|potato flour|cornmeal|cornstarch)\b/.test(d)) return true
  
  // Legume flours
  if (/\b(chickpea|garbanzo|lentil|soy|pea flour)\b/.test(d)) return true
  
  // Root/starch flours
  if (/\b(cassava|tapioca|arrowroot|carob)\b/.test(d)) return true
  
  // Oat flour
  if (/\boat flour\b/.test(d)) return true
  
  // Specialty purpose (not all-purpose)
  if (/\b(self[- ]rising|gluten[- ]free|bread flour|cake flour|pastry flour)\b/.test(d)) return true
  
  return false
}

/**
 * Check if a USDA food description indicates standard all-purpose flour
 */
export function isAllPurposeFlour(desc: string): boolean {
  const d = desc.toLowerCase()
  
  // Must contain wheat or all-purpose indicators
  const hasWheat = /\b(wheat|all[- ]purpose|ap flour)\b/.test(d)
  if (!hasWheat) return false
  
  // Must not be specialty
  if (isSpecialtyFlour(d)) return false
  
  // Prefer enriched/bleached/unbleached (standard processing)
  return true
}

/**
 * Deterministic scoring for flour candidates
 * Higher score = better match for generic "flour" query
 */
export function scoreFlourCandidate(
  desc: string,
  dataType: string,
  foodCategory?: string
): number {
  let score = 0
  const d = desc.toLowerCase()
  
  // TIER 1: Category match
  if (foodCategory?.toLowerCase().includes('cereal') || foodCategory?.toLowerCase().includes('grain')) {
    score += 100
  }
  
  // TIER 2: Specialty vs standard
  if (isAllPurposeFlour(desc)) {
    score += 500 // Massive boost for all-purpose
  } else if (isSpecialtyFlour(desc)) {
    score -= 1000 // Eliminate specialty flours
  }
  
  // TIER 3: Data type preference
  if (dataType === 'Foundation') score += 150
  else if (dataType === 'SR Legacy') score += 120
  else if (dataType === 'Survey (FNDDS)') score += 100
  else if (dataType === 'Branded') score -= 80
  
  // TIER 4: Specific all-purpose indicators
  if (d.includes('all-purpose') || d.includes('all purpose')) score += 200
  if (d.includes('enriched')) score += 50
  if (d.includes('bleached') || d.includes('unbleached')) score += 30
  if (d.includes('white') && d.includes('flour')) score += 40
  
  // TIER 5: Protein range heuristic (AP flour typically 9-13%)
  // This would require nutrient data, skip for now
  
  return score
}
