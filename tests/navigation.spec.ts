import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Navigation and App Structure
 */

test.describe('Navigation', () => {
  
  test('should load home page', async ({ page }) => {
    await page.goto('/')
    
    // Verify Gather Kitchen branding (use heading to be specific)
    await expect(page.locator('h4:has-text("Gather Kitchen")')).toBeVisible()
    
    // Verify main navigation links
    await expect(page.locator('a:has-text("Import Recipe")')).toBeVisible()
    await expect(page.locator('a:has-text("Sub-Recipes")')).toBeVisible()
    await expect(page.locator('a:has-text("Final Dishes")')).toBeVisible()
  })
  
  test('should navigate to Import Recipe page', async ({ page }) => {
    await page.goto('/')
    
    await page.click('text=Import Recipe')
    await expect(page).toHaveURL('/import')
    await expect(page.locator('h1')).toContainText('Recipe Importer')
  })
  
  test('should navigate to Sub-Recipes page', async ({ page }) => {
    await page.goto('/')
    
    await page.click('text=Sub-Recipes')
    await expect(page).toHaveURL('/sub-recipes')
  })
  
  test('should navigate to Final Dishes page', async ({ page }) => {
    await page.goto('/')
    
    await page.click('text=Final Dishes')
    await expect(page).toHaveURL('/final-dishes')
  })
  
  test('should show Gather logo on all pages', async ({ page }) => {
    // Home
    await page.goto('/')
    await expect(page.locator('img[alt="Gather Kitchen"]')).toBeVisible()
    
    // Import
    await page.goto('/import')
    await expect(page.locator('img[alt="Gather Kitchen"]')).toBeVisible()
    
    // Sub-recipes
    await page.goto('/sub-recipes')
    await expect(page.locator('img[alt="Gather Kitchen"]')).toBeVisible()
    
    // Final dishes
    await page.goto('/final-dishes')
    await expect(page.locator('img[alt="Gather Kitchen"]')).toBeVisible()
  })
})

test.describe('Session Storage', () => {
  
  test('should persist parsed recipe in session storage', async ({ page }) => {
    await page.goto('/import')
    
    const recipe = `Session Test Recipe
2 cups flour
1 cup sugar`
    
    await page.locator('textarea').fill(recipe)
    await page.click('button:has-text("Parse Recipe")')
    
    await expect(page).toHaveURL(/\/import\/review/)
    
    // Check session storage
    const sessionData = await page.evaluate(() => {
      return sessionStorage.getItem('parsedRecipe')
    })
    
    expect(sessionData).toBeTruthy()
    const parsed = JSON.parse(sessionData!)
    expect(parsed.finalDish.name).toBe('Session Test Recipe')
  })
  
  test('should persist parsed recipe in session during workflow', async ({ page }) => {
    await page.goto('/import')
    
    const recipe = `Clear Test
1 cup ingredient`
    
    await page.locator('textarea').fill(recipe)
    await page.click('button:has-text("Parse Recipe")')
    
    // Should be on review page now
    await expect(page).toHaveURL(/\/import\/review/)
    
    // Session should have data
    const hasData = await page.evaluate(() => {
      return sessionStorage.getItem('parsedRecipe') !== null
    })
    
    expect(hasData).toBe(true)
  })
})

test.describe('Error Handling', () => {
  
  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate network failure
    await page.route('**/api/**', route => route.abort())
    
    await page.goto('/import')
    
    const recipe = `Network Test
2 cups flour`
    
    await page.locator('textarea').fill(recipe)
    await page.click('button:has-text("Parse Recipe")')
    
    // Should still show review page (parsing is client-side)
    await expect(page).toHaveURL(/\/import\/review/)
  })
  
  test('should show friendly error on API failure', async ({ page }) => {
    // Mock API error
    await page.route('**/api/ingredients/search*', route => {
      route.fulfill({ status: 500, body: 'Internal Server Error' })
    })
    
    await page.goto('/import')
    
    const recipe = `API Error Test
1 cup flour`
    
    await page.locator('textarea').fill(recipe)
    await page.click('button:has-text("Parse Recipe")')
    
    const ingredientButton = page.locator('button:has-text("⚠️")').first()
    await ingredientButton.click()
    
    await page.locator('input[type="text"]').fill('flour')
    await page.locator('button:has-text("Search")').click()
    
    // Should show error message
    await expect(page.locator('text=/error|failed/i')).toBeVisible()
  })
})

test.describe('Responsive Design', () => {
  
  test('should be usable on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/import')
    
    // All elements should be visible and usable
    await expect(page.locator('textarea')).toBeVisible()
    await expect(page.locator('button:has-text("Parse Recipe")')).toBeVisible()
  })
  
  test('should be usable on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/import')
    
    // Should work on tablet
    await expect(page.locator('textarea')).toBeVisible()
    await expect(page.locator('button:has-text("Parse Recipe")')).toBeVisible()
  })
  
  test('should redirect on mobile phone', async ({ browser }) => {
    // Create new page with mobile user agent
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      viewport: { width: 375, height: 667 }
    })
    const page = await context.newPage()
    
    await page.goto('/import')
    
    // Should show desktop required message
    await expect(page.locator('text=/Desktop or Tablet Required/i')).toBeVisible()
    
    await context.close()
  })
})
