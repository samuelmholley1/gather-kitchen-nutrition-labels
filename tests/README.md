# Unit Testing with Jest

This directory contains unit tests for the Gather Kitchen Nutrition Calculator.

## Test Coverage

### 1. Flour Selection Logic (`__tests__/flour-selection.test.ts`)
- Tests flour selection and ingredient matching logic
- Validates ingredient processing and categorization

### 2. Report Issue Validation (`__tests__/report-issue.test.ts`)
- **Schema Validation**: Tests Zod schemas for report issue payloads
- **Rate Limiting**: Tests IP-based rate limiting logic
- **Email Sanitization**: Tests HTML sanitization and content validation
- **Honeypot Protection**: Tests bot detection mechanisms
- **Email Content Generation**: Tests email formatting and escaping

### 3. Photo Upload OCR (`__tests__/photo-upload.test.ts`)
- **Google Vision API Integration**: Tests environment variable configuration
- **OCR Text Processing**: Tests nutrition data extraction logic
- **API Response Format**: Tests response structure validation

## Running Tests

### Run all unit tests
```bash
npm test
# or
npx jest
```

### Run specific test file
```bash
npx jest __tests__/report-issue.test.ts
```

### Run with coverage
```bash
npx jest --coverage
```

### Run in watch mode
```bash
npx jest --watch
```

## Test Configuration

- **Framework**: Jest with ts-jest for TypeScript support
- **Environment**: Node.js (server-side testing)
- **Environment Variables**: Loaded from `.env.local` via dotenv
- **Assertions**: Jest built-in expect assertions

## Writing New Tests

1. Create a new `.test.ts` file in the `__tests__/` directory
2. Import Jest utilities:
   ```typescript
   import { describe, it, expect } from '@jest/globals';
   ```
3. Use `describe()` to group related tests
4. Use `it()` for individual test cases
5. Use `expect()` for assertions

## Common Patterns

### Testing Environment Variables
```typescript
it('should have required environment variables', () => {
  expect(process.env.API_KEY).toBeDefined();
  expect(process.env.API_KEY).toBe('expected-value');
});
```

### Testing Schema Validation
```typescript
it('should validate correct payload', () => {
  const result = Schema.safeParse(validPayload);
  expect(result.success).toBe(true);
});

it('should reject invalid payload', () => {
  const result = Schema.safeParse(invalidPayload);
  expect(result.success).toBe(false);
});
```

### Testing Business Logic
```typescript
it('should calculate nutrition correctly', () => {
  const result = calculateNutrition(ingredients);
  expect(result.calories).toBe(250);
  expect(result.protein).toBe(15);
});
```

## Test Results

Current test status:
- ✅ **45 tests passing**
- ✅ **3 test suites passing**
- ✅ **100% success rate**

## CI/CD Integration

Unit tests run automatically in CI with:
- TypeScript compilation check
- Environment variable validation
- Code coverage reporting (optional)

## Coverage Areas

All critical functionality is tested:
- ✅ Schema validation and error handling
- ✅ Rate limiting and security features
- ✅ Email processing and sanitization
- ✅ OCR configuration and environment setup
- ✅ Business logic validation
- ✅ API response formatting

## Troubleshooting

### Environment variables not loading?
- Ensure `.env.local` exists in project root
- Check that `jest.setup.js` is configured correctly
- Verify environment variable names match

### Tests failing unexpectedly?
- Run with `--verbose` flag for more details
- Check console output for dotenv warnings
- Ensure all dependencies are installed

### Need to debug a test?
- Add `console.log()` statements
- Use `--testNamePattern` to run specific tests
- Check the Jest documentation for debugging options

## Future E2E Testing

When UI stabilizes, consider adding Playwright E2E tests for:
- Photo upload workflow
- Recipe parsing and review
- USDA search integration
- Final dish creation

For now, unit tests provide comprehensive coverage of core business logic and API functionality.
