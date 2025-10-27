/**
 * Flour taxonomy for USDA ingredient selection
 * Defines what counts as "specialty" vs "standard" flour
 */

export type ScoreBreakdown = {
  baseType: 'all_purpose' | 'specialty' | 'unknown';
  positives: string[];           // matched specialty tokens, tiers won
  negatives: string[];           // penalties applied (and why)
  tiers: Array<{name:string; delta:number}>;
  finalScore: number;
};

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
): ScoreBreakdown {
  let score = 0
  const d = desc.toLowerCase()
  const positives: string[] = []
  const negatives: string[] = []
  const tiers: Array<{name:string; delta:number}> = []
  
  // Determine base type FIRST (before specialty detection)
  let baseType: 'all_purpose' | 'specialty' | 'unknown' = 'unknown'
  
  if (isAllPurposeFlour(desc)) {
    baseType = 'all_purpose'
  } else if (isSpecialtyFlour(desc)) {
    baseType = 'specialty'
  }
  
  // TIER 1: Category match
  if (foodCategory?.toLowerCase().includes('cereal') || foodCategory?.toLowerCase().includes('grain')) {
    const delta = 100
    score += delta
    tiers.push({name: 'Category match (Cereal Grains)', delta})
    positives.push('Cereal Grains category')
  }
  
  // TIER 2: Specialty vs standard (base type detection already done above)
  if (baseType === 'all_purpose') {
    const delta = 500
    score += delta
    tiers.push({name: 'All-purpose flour bonus', delta})
    positives.push('All-purpose wheat flour')
  } else if (baseType === 'specialty') {
    const delta = -1000
    score += delta
    tiers.push({name: 'Specialty flour penalty', delta})
    negatives.push('Specialty flour type detected')
  }
  
  // TIER 3: Data type preference
  if (dataType === 'Foundation') {
    const delta = 150
    score += delta
    tiers.push({name: 'Foundation data type', delta})
    positives.push('Foundation data source')
  } else if (dataType === 'SR Legacy') {
    const delta = 120
    score += delta
    tiers.push({name: 'SR Legacy data type', delta})
    positives.push('SR Legacy data source')
  } else if (dataType === 'Survey (FNDDS)') {
    const delta = 100
    score += delta
    tiers.push({name: 'Survey data type', delta})
    positives.push('Survey data source')
  } else if (dataType === 'Branded') {
    const delta = -80
    score += delta
    tiers.push({name: 'Branded data penalty', delta})
    negatives.push('Branded product data')
  }
  
  // TIER 4: Specific all-purpose indicators
  if (d.includes('all-purpose') || d.includes('all purpose')) {
    const delta = 200
    score += delta
    tiers.push({name: 'All-purpose indicator', delta})
    positives.push('All-purpose keyword')
  }
  if (d.includes('enriched')) {
    const delta = 50
    score += delta
    tiers.push({name: 'Enriched indicator', delta})
    positives.push('Enriched flour')
  }
  if (d.includes('bleached') || d.includes('unbleached')) {
    const delta = 30
    score += delta
    tiers.push({name: 'Bleached/unbleached indicator', delta})
    positives.push('Standard processing')
  }
  if (d.includes('white') && d.includes('flour')) {
    const delta = 40
    score += delta
    tiers.push({name: 'White flour indicator', delta})
    positives.push('White flour')
  }
  
  // TIER 5: Protein range heuristic (AP flour typically 9-13%)
  // This would require nutrient data, skip for now
  
  return {
    baseType,
    positives,
    negatives,
    tiers,
    finalScore: score
  }
}
