/**
 * E2E Test: Complete Recipe Import Flow
 * 
 * Tests the entire workflow:
 * 1. Paste recipe text
 * 2. Parse ingredients
 * 3. Search USDA for matches
 * 4. Create sub-recipes (if any)
 * 5. Create final dish
 * 6. Verify in Airtable
 * 
 * Run: npx playwright test tests/e2e/recipe-import.spec.ts
 */

import { test, expect } from '@playwright/test'

const SAMPLE_RECIPE = `Pineapple Chicken

150 g boneless skinless chicken breast
50 g julienned yellow onion
75 g red bell pepper
2 g green onion sliced
1 tsp sesame seeds
6 oz pineapple juice
85 g pineapple chunks
2 tbsp low sodium soy sauce
1 tsp rice vinegar
2 tsp fresh grated ginger
2 tsp chopped garlic
1 tbsp arrowroot
1 tbsp olive oil
85 g coconut rice`

test.describe('Recipe Import Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to import page
    await page.goto('/import')
  })

  test('should parse and save a complete recipe', async ({ page }) => {
    // Step 1: Paste recipe
    const textarea = page.locator('textarea')
    await textarea.fill(SAMPLE_RECIPE)
    
    // Verify preview shows ingredient count
    await expect(page.locator('text=/\\d+ ingredients found/')).toBeVisible()
    
    // Step 2: Click Parse Recipe
    await page.click('button:has-text("Parse Recipe")')
    
    // Step 3: Wait for review page
    await expect(page).toHaveURL('/import/review')
    
    // Step 4: Wait for USDA auto-search to complete
    await expect(page.locator('text=Searching USDA')).toBeHidden({ timeout: 30000 })
    
    // Step 5: Verify all ingredients are confirmed
    await expect(page.locator('text=All ingredients confirmed!')).toBeVisible({ timeout: 60000 })
    
    // Step 6: Click Save Recipe
    await page.click('button:has-text("Save Recipe")')
    
    // Step 7: Verify success redirect to final dishes
    await expect(page).toHaveURL('/final-dishes', { timeout: 30000 })
    
    // Step 8: Verify the recipe appears in the list
    await expect(page.locator('text=Pineapple Chicken')).toBeVisible()
  })

  test('should handle recipes with sub-recipes', async ({ page }) => {
    const recipeWithSubRecipe = `Chicken Tacos

2 cups shredded chicken
1 cup salsa verde (1/2 cup tomatillos, 1/4 cup onions, 2 tbsp cilantro)
8 corn tortillas
1/2 cup cheese`

    const textarea = page.locator('textarea')
    await textarea.fill(recipeWithSubRecipe)
    
    await page.click('button:has-text("Parse Recipe")')
    await expect(page).toHaveURL('/import/review')
    
    // Should show sub-recipe detected
    await expect(page.locator('text=Sub-Recipe: salsa verde')).toBeVisible()
    
    // Wait for auto-search
    await expect(page.locator('text=Searching USDA')).toBeHidden({ timeout: 30000 })
    await expect(page.locator('text=All ingredients confirmed!')).toBeVisible({ timeout: 60000 })
    
    // Save
    await page.click('button:has-text("Save Recipe")')
    await expect(page).toHaveURL('/final-dishes', { timeout: 30000 })
    
    // Verify both final dish and sub-recipe were created
    await expect(page.locator('text=Chicken Tacos')).toBeVisible()
    
    await page.goto('/sub-recipes')
    await expect(page.locator('text=salsa verde')).toBeVisible()
  })

  test('should handle parser errors gracefully', async ({ page }) => {
    const invalidRecipe = 'Just A Recipe Name With No Ingredients'
    
    const textarea = page.locator('textarea')
    await textarea.fill(invalidRecipe)
    
    await page.click('button:has-text("Parse Recipe")')
    
    // Should show error on review page
    await expect(page).toHaveURL('/import/review')
    await expect(page.locator('text=Recipe must have at least one ingredient')).toBeVisible()
  })

  test('should validate against Airtable schema', async ({ page }) => {
    // This test ensures the API can actually write to Airtable
    const textarea = page.locator('textarea')
    await textarea.fill(SAMPLE_RECIPE)
    
    await page.click('button:has-text("Parse Recipe")')
    await expect(page).toHaveURL('/import/review')
    
    // Intercept the API call
    const responsePromise = page.waitForResponse(resp => 
      resp.url().includes('/api/final-dishes') && resp.request().method() === 'POST'
    )
    
    await expect(page.locator('text=All ingredients confirmed!')).toBeVisible({ timeout: 60000 })
    await page.click('button:has-text("Save Recipe")')
    
    const response = await responsePromise
    
    // Should NOT be a 500 error
    expect(response.status()).not.toBe(500)
    
    // Should be successful
    expect(response.status()).toBe(200)
    
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.finalDish).toBeDefined()
  })
})
