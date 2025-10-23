# E2E Testing with Playwright

This directory contains end-to-end tests for the Gather Kitchen Nutrition Calculator.

## Test Coverage

### 1. Smart Recipe Importer (`smart-recipe-importer.spec.ts`)
- **Happy Path**: Complete workflow from parsing to review
- **Edge Cases**:
  - Empty parentheses detection
  - Unbalanced parentheses detection
  - Unicode fraction handling (½, ¼, etc.)
  - Duplicate sub-recipe warnings
  - Very long ingredient names (255 char limit)
  - Extreme quantity overflow protection
  - Empty recipe validation
  - No ingredients validation

### 2. USDA Ingredient Search (`usda-search.spec.ts`)
- **Search Functionality**:
  - Modal opening/closing
  - 10-second timeout handling
  - No results handling
  - Search results display
  - Ingredient selection and confirmation
- **Save Functionality**:
  - Save button state management
  - Progress indicators during save

### 3. Navigation & App Structure (`navigation.spec.ts`)
- **Navigation**:
  - Home page loading
  - Navigation between pages
  - Logo presence on all pages
- **Session Storage**:
  - Recipe persistence during workflow
  - Cleanup after save
- **Error Handling**:
  - Network failure gracefully handled
  - API error messages
- **Responsive Design**:
  - Desktop support (1920x1080)
  - Tablet support (768x1024)
  - Mobile phone redirect (375x667)

## Running Tests

### Run all tests (headless)
```bash
npm test
```

### Run with interactive UI
```bash
npm run test:ui
```

### Run with visible browser
```bash
npm run test:headed
```

### Debug mode (step through tests)
```bash
npm run test:debug
```

### Run specific test file
```bash
npx playwright test tests/smart-recipe-importer.spec.ts
```

### Run specific test
```bash
npx playwright test -g "should parse and save a recipe with sub-recipes"
```

## Test Reports

After running tests, view the HTML report:
```bash
npx playwright show-report
```

## Writing New Tests

1. Create a new `.spec.ts` file in the `tests/` directory
2. Import Playwright test utilities:
   ```typescript
   import { test, expect } from '@playwright/test'
   ```
3. Use `test.describe()` to group related tests
4. Use `test()` for individual test cases
5. Use `expect()` for assertions

## Common Patterns

### Mock API Responses
```typescript
await page.route('**/api/endpoint*', async route => {
  await route.fulfill({
    status: 200,
    body: JSON.stringify({ data: 'mock data' })
  })
})
```

### Check Session Storage
```typescript
const data = await page.evaluate(() => {
  return sessionStorage.getItem('key')
})
```

### Simulate Mobile Device
```typescript
await page.setViewportSize({ width: 375, height: 667 })
```

## CI/CD Integration

Tests are configured to run in CI with:
- Automatic retries (2 attempts)
- Single worker for stability
- Screenshot and trace capture on failures

## Edge Cases Tested

All critical edge cases from the red team audit are covered:
- ✅ Unicode fractions (½, ¼, ¾, ⅓, ⅔, etc.)
- ✅ Division by zero protection
- ✅ Empty parentheses
- ✅ Unbalanced parentheses
- ✅ Long ingredient names (>255 chars)
- ✅ Quantity overflow (>1,000,000)
- ✅ USDA API timeout (10 seconds)
- ✅ Navigation warnings (beforeunload)
- ✅ Mobile restrictions
- ✅ Duplicate sub-recipes

## Troubleshooting

### Tests failing locally?
1. Ensure dev server is running: `npm run dev`
2. Clear session storage: Open DevTools → Application → Session Storage → Clear
3. Update Playwright: `npx playwright install`

### Need to update snapshots?
```bash
npx playwright test --update-snapshots
```

### Debugging tips
- Use `page.pause()` to pause execution and inspect
- Add `{ timeout: 60000 }` to slow tests
- Check screenshots in `test-results/` after failures
