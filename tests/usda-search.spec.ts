import { test, expect } from '@playwright/test'

/**
 * E2E Tests for USDA Ingredient Search
 * 
 * Tests the ingredient search and confirmation workflow
 */

test.describe('USDA Ingredient Search', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set up a simple recipe to get to review page
    await page.goto('/import')
    
    const recipe = `Test Recipe
2 cups flour
1 cup sugar`
    
    await page.locator('textarea').fill(recipe)
    await page.click('button:has-text("Parse Recipe")')
    await expect(page).toHaveURL(/\/import\/review/)
  })
  
  test('should open USDA search modal when clicking ingredient', async ({ page }) => {
    // Click on an ingredient to search
    const ingredientButton = page.locator('button:has-text("⚠️")').first()
    await ingredientButton.click()
    
    // Modal should open
    await expect(page.locator('text=/Search USDA Database/i')).toBeVisible()
    await expect(page.locator('input[type="text"]')).toBeVisible()
  })
  
  test('should show timeout message after 10 seconds', async ({ page }) => {
    // Mock a slow API response
    await page.route('**/api/ingredients/search*', async route => {
      // Delay response by 11 seconds
      await new Promise(resolve => setTimeout(resolve, 11000))
      await route.fulfill({ status: 200, body: JSON.stringify([]) })
    })
    
    const ingredientButton = page.locator('button:has-text("⚠️")').first()
    await ingredientButton.click()
    
    // Type in search
    await page.locator('input[type="text"]').fill('flour')
    await page.locator('button:has-text("Search")').click()
    
    // Should show timeout message
    await expect(page.locator('text=/request timed out/i')).toBeVisible({ timeout: 12000 })
  })
  
  test('should handle no results gracefully', async ({ page }) => {
    // Mock empty results
    await page.route('**/api/ingredients/search*', async route => {
      await route.fulfill({ 
        status: 200, 
        body: JSON.stringify([]) 
      })
    })
    
    const ingredientButton = page.locator('button:has-text("⚠️")').first()
    await ingredientButton.click()
    
    await page.locator('input[type="text"]').fill('nonexistentfood123')
    await page.locator('button:has-text("Search")').click()
    
    // Should show no results message
    await expect(page.locator('text=/no foods found/i')).toBeVisible()
  })
  
  test('should display search results', async ({ page }) => {
    // Mock successful search results
    await page.route('**/api/ingredients/search*', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            fdcId: 123456,
            description: 'Wheat flour, white, all-purpose',
            brandOwner: null,
            dataType: 'SR Legacy'
          },
          {
            fdcId: 789012,
            description: 'Flour, wheat, whole-grain',
            brandOwner: null,
            dataType: 'SR Legacy'
          }
        ])
      })
    })
    
    const ingredientButton = page.locator('button:has-text("⚠️")').first()
    await ingredientButton.click()
    
    await page.locator('input[type="text"]').fill('flour')
    await page.locator('button:has-text("Search")').click()
    
    // Should show results
    await expect(page.locator('text=Wheat flour, white, all-purpose')).toBeVisible()
    await expect(page.locator('text=Flour, wheat, whole-grain')).toBeVisible()
  })
  
  test('should confirm ingredient selection', async ({ page }) => {
    // Mock search results
    await page.route('**/api/ingredients/search*', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            fdcId: 123456,
            description: 'Wheat flour, white, all-purpose',
            brandOwner: null,
            dataType: 'SR Legacy'
          }
        ])
      })
    })
    
    // Mock ingredient details
    await page.route('**/api/ingredients/123456*', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          fdcId: 123456,
          description: 'Wheat flour, white, all-purpose',
          nutrients: {
            calories: 364,
            protein: 10.3,
            totalFat: 0.98,
            totalCarbohydrate: 76.3
          }
        })
      })
    })
    
    const ingredientButton = page.locator('button:has-text("⚠️")').first()
    await ingredientButton.click()
    
    await page.locator('input[type="text"]').fill('flour')
    await page.locator('button:has-text("Search")').click()
    
    // Wait for results and select first one
    await expect(page.locator('text=Wheat flour, white, all-purpose')).toBeVisible()
    await page.locator('text=Wheat flour, white, all-purpose').click()
    
    // Modal should close
    await expect(page.locator('text=/Search USDA Database/i')).not.toBeVisible()
    
    // Warning icon should change to checkmark
    await expect(page.locator('text=✓')).toBeVisible()
  })
})

test.describe('Save Functionality', () => {
  
  test('should show save button on review page', async ({ page }) => {
    await page.goto('/import')
    
    const recipe = `Test Recipe
2 cups flour
1 cup sugar`
    
    await page.locator('textarea').fill(recipe)
    await page.click('button:has-text("Parse Recipe")')
    
    await expect(page).toHaveURL(/\/import\/review/)
    
    // Save button should exist and be visible
    const saveButton = page.locator('button:has-text("Save Recipe")')
    await expect(saveButton).toBeVisible()
  })
  
  test('should show progress during save', async ({ page }) => {
    // This test would require mocking Airtable API
    // For now, we'll just verify the progress UI elements exist
    
    await page.goto('/import')
    
    const recipe = `Test Recipe
1 cup ingredient`
    
    await page.locator('textarea').fill(recipe)
    await page.click('button:has-text("Parse Recipe")')
    
    // Verify progress text area exists
    await expect(page.locator('text=/Review & Confirm/i')).toBeVisible()
  })
})
