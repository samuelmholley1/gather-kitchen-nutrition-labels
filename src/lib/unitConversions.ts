/**
 * Unit Conversion Utilities
 * 
 * Converts common cooking measurements to grams
 */

export interface UnitConversion {
  unit: string
  aliases: string[]
  gramsPerUnit: number
  description: string
}

/**
 * Common unit conversions to grams
 * 
 * Note: These are approximations for nutrition calculations.
 * Actual weights vary by ingredient density.
 */
export const UNIT_CONVERSIONS: Record<string, UnitConversion> = {
  // Weight units (exact)
  g: {
    unit: 'g',
    aliases: ['g', 'gram', 'grams', 'gm'],
    gramsPerUnit: 1,
    description: 'Gram (exact)',
  },
  kg: {
    unit: 'kg',
    aliases: ['kg', 'kilogram', 'kilograms'],
    gramsPerUnit: 1000,
    description: 'Kilogram',
  },
  oz: {
    unit: 'oz',
    aliases: ['oz', 'ounce', 'ounces'],
    gramsPerUnit: 28.35,
    description: 'Ounce (weight)',
  },
  lb: {
    unit: 'lb',
    aliases: ['lb', 'lbs', 'pound', 'pounds'],
    gramsPerUnit: 453.592,
    description: 'Pound',
  },
  mg: {
    unit: 'mg',
    aliases: ['mg', 'milligram', 'milligrams'],
    gramsPerUnit: 0.001,
    description: 'Milligram',
  },

  // Volume units (approximate - varies by ingredient)
  // Using water density as baseline (1 mL = 1 g)
  cup: {
    unit: 'cup',
    aliases: ['cup', 'cups', 'c'],
    gramsPerUnit: 240,
    description: 'Cup (approximate)',
  },
  tbsp: {
    unit: 'tbsp',
    aliases: ['tbsp', 'tablespoon', 'tablespoons', 'tbs', 't'],
    gramsPerUnit: 15,
    description: 'Tablespoon',
  },
  tsp: {
    unit: 'tsp',
    aliases: ['tsp', 'teaspoon', 'teaspoons', 'ts'],
    gramsPerUnit: 5,
    description: 'Teaspoon',
  },
  ml: {
    unit: 'ml',
    aliases: ['ml', 'milliliter', 'milliliters', 'mL'],
    gramsPerUnit: 1,
    description: 'Milliliter (approximate)',
  },
  l: {
    unit: 'l',
    aliases: ['l', 'liter', 'liters', 'L'],
    gramsPerUnit: 1000,
    description: 'Liter (approximate)',
  },
  floz: {
    unit: 'fl oz',
    aliases: ['fl oz', 'floz', 'fluid ounce', 'fluid ounces'],
    gramsPerUnit: 30,
    description: 'Fluid Ounce',
  },
  pint: {
    unit: 'pint',
    aliases: ['pint', 'pints', 'pt'],
    gramsPerUnit: 473,
    description: 'Pint',
  },
  quart: {
    unit: 'quart',
    aliases: ['quart', 'quarts', 'qt'],
    gramsPerUnit: 946,
    description: 'Quart',
  },
  gallon: {
    unit: 'gallon',
    aliases: ['gallon', 'gallons', 'gal'],
    gramsPerUnit: 3785,
    description: 'Gallon',
  },
}

/**
 * Find unit conversion by name (case-insensitive, handles aliases)
 * 
 * @param unitName - Unit name or alias (e.g., "tbsp", "Tablespoon", "g")
 * @returns UnitConversion object or null if not found
 */
export function findUnit(unitName: string): UnitConversion | null {
  const normalized = unitName.toLowerCase().trim()
  
  for (const conversion of Object.values(UNIT_CONVERSIONS)) {
    if (conversion.aliases.includes(normalized)) {
      return conversion
    }
  }
  
  return null
}

/**
 * Convert quantity from any unit to grams
 * 
 * @param quantity - Amount in original unit
 * @param unit - Unit name (e.g., "tbsp", "oz", "g")
 * @returns Weight in grams, or null if unit not recognized
 */
export function convertToGrams(quantity: number, unit: string): number | null {
  const conversion = findUnit(unit)
  
  if (!conversion) {
    return null
  }
  
  return quantity * conversion.gramsPerUnit
}

/**
 * Parse a quantity string that might include fractions
 * Examples: "1/2", "1 1/2", "0.5", "2"
 * 
 * @param quantityStr - Quantity string
 * @returns Decimal number
 */
export function parseQuantity(quantityStr: string): number {
  const str = quantityStr.trim()
  
  // Handle mixed fractions (e.g., "1 1/2")
  const mixedMatch = str.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1])
    const numerator = parseInt(mixedMatch[2])
    const denominator = parseInt(mixedMatch[3])
    return whole + (numerator / denominator)
  }
  
  // Handle simple fractions (e.g., "1/2")
  const fractionMatch = str.match(/^(\d+)\/(\d+)$/)
  if (fractionMatch) {
    const numerator = parseInt(fractionMatch[1])
    const denominator = parseInt(fractionMatch[2])
    return numerator / denominator
  }
  
  // Handle decimals (e.g., "0.5", "2.5")
  return parseFloat(str)
}

/**
 * Get all supported units (for UI display)
 * 
 * @returns Array of unit names with descriptions
 */
export function getSupportedUnits(): Array<{ unit: string; description: string }> {
  return Object.values(UNIT_CONVERSIONS).map(conv => ({
    unit: conv.unit,
    description: conv.description,
  }))
}
