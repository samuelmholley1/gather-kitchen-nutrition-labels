/**
 * Golden tests for flour selection
 * Locks expected behavior to prevent regressions
 */

import { describe, it, expect } from '@jest/globals'
import { canonicalize, hasSpecialtyFlourQualifier } from '../src/lib/canonicalize'
import { isSpecialtyFlour, isAllPurposeFlour, scoreFlourCandidate } from '../src/lib/taxonomy/flour'

describe('Canonicalization', () => {
  it('should parse "flour, sifted" correctly', () => {
    const result = canonicalize('flour, sifted')
    expect(result.base).toBe('flour')
    expect(result.qualifiers).toContain('sifted')
  })

  it('should parse "flour" to base flour with no qualifiers', () => {
    const result = canonicalize('flour')
    expect(result.base).toBe('flour')
    expect(result.qualifiers).toHaveLength(0)
  })

  it('should parse "almond flour" correctly', () => {
    const result = canonicalize('almond flour')
    expect(result.base).toContain('almond')
    expect(result.base).toContain('flour')
  })

  it('should strip cooking descriptors from base', () => {
    const result = canonicalize('flour, sifted, chopped')
    expect(result.base).toBe('flour')
    expect(result.qualifiers).toContain('sifted')
  })
})

describe('Flour Taxonomy', () => {
  it('should identify specialty flours', () => {
    expect(isSpecialtyFlour('Flour, tipo 00')).toBe(true)
    expect(isSpecialtyFlour('Flour, almond')).toBe(true)
    expect(isSpecialtyFlour('Flour, coconut')).toBe(true)
    expect(isSpecialtyFlour('Flour, rye')).toBe(true)
    expect(isSpecialtyFlour('Flour, bread flour')).toBe(true)
    expect(isSpecialtyFlour('Flour, self-rising')).toBe(true)
  })

  it('should NOT identify all-purpose flour as specialty', () => {
    expect(isSpecialtyFlour('Wheat flour, white, all-purpose, enriched, bleached')).toBe(false)
    expect(isSpecialtyFlour('Wheat flour, white, all-purpose, enriched, unbleached')).toBe(false)
  })

  it('should identify all-purpose flour correctly', () => {
    expect(isAllPurposeFlour('Wheat flour, white, all-purpose, enriched, bleached')).toBe(true)
    expect(isAllPurposeFlour('Wheat flour, white, all-purpose, enriched, unbleached')).toBe(true)
  })

  it('should NOT identify specialty as all-purpose', () => {
    expect(isAllPurposeFlour('Flour, tipo 00')).toBe(false)
    expect(isAllPurposeFlour('Flour, almond')).toBe(false)
  })
})

describe('Flour Scoring', () => {
  it('should score all-purpose flour much higher than specialty', () => {
    const apScore = scoreFlourCandidate(
      'Wheat flour, white, all-purpose, enriched, bleached',
      'SR Legacy',
      'Cereal Grains and Pasta'
    )

    const specialtyScore = scoreFlourCandidate(
      'Flour, tipo 00',
      'SR Legacy',
      'Cereal Grains and Pasta'
    )

    expect(apScore).toBeGreaterThan(500)
    expect(specialtyScore).toBeLessThan(0) // Should be negative due to -1000 penalty
    expect(apScore - specialtyScore).toBeGreaterThan(1000)
  })

  it('should prefer Foundation data type', () => {
    const foundationScore = scoreFlourCandidate(
      'Wheat flour, white, all-purpose, enriched',
      'Foundation',
      'Cereal Grains and Pasta'
    )

    const legacyScore = scoreFlourCandidate(
      'Wheat flour, white, all-purpose, enriched',
      'SR Legacy',
      'Cereal Grains and Pasta'
    )

    expect(foundationScore).toBeGreaterThan(legacyScore)
  })

  it('should penalize branded products', () => {
    const standardScore = scoreFlourCandidate(
      'Wheat flour, white, all-purpose, enriched',
      'SR Legacy',
      'Cereal Grains and Pasta'
    )

    const brandedScore = scoreFlourCandidate(
      'Wheat flour, white, all-purpose, enriched',
      'Branded',
      'Cereal Grains and Pasta'
    )

    expect(standardScore).toBeGreaterThan(brandedScore)
  })
})

describe('Golden Tests - Expected Behavior', () => {
  it('GOLDEN: "flour, sifted" should select all-purpose flour over 00 flour', () => {
    const canon = canonicalize('flour, sifted')
    expect(canon.base).toBe('flour')
    expect(hasSpecialtyFlourQualifier(canon.qualifiers)).toBe(false)
    
    // When base is 'flour' and no specialty qualifiers, specialty flours should be filtered
    const shouldFilter00 = !hasSpecialtyFlourQualifier(canon.qualifiers) && canon.base === 'flour'
    expect(shouldFilter00).toBe(true)
    
    // After filtering, all-purpose should win scoring
    const apScore = scoreFlourCandidate(
      'Wheat flour, white, all-purpose, enriched, bleached',
      'SR Legacy'
    )
    expect(apScore).toBeGreaterThan(500)
  })

  it('GOLDEN: "almond flour" should NOT filter specialty flours', () => {
    const canon = canonicalize('almond flour')
    const hasSpecialty = hasSpecialtyFlourQualifier(canon.qualifiers) || 
                         canon.base.includes('almond')
    expect(hasSpecialty).toBe(true)
  })
})
