# Nutrition Label Calculator - Migration Plan
## Executive Summary

This document outlines the comprehensive plan to transform the Liturgists App codebase into a Nutrition Label Calculator and Maker application. The migration will leverage the existing Next.js + TypeScript + Tailwind CSS + Airtable tech stack while implementing new features for nutrition calculation, USDA API integration, and FDA-compliant label generation.

**Project Name:** Gather Kitchen Nutrition Labels  
**Tech Stack:** Next.js 14.2.5, TypeScript, Tailwind CSS, Airtable, Yarn Berry  
**Target Completion:** Phased approach (detailed below)

---

## Table of Contents
1. [Current State Audit](#current-state-audit)
2. [Critical Questions & Decisions](#critical-questions--decisions)
3. [Adapted Implementation Prompts](#adapted-implementation-prompts)
4. [Implementation Roadmap](#implementation-roadmap)
5. [Security & Best Practices](#security--best-practices)
6. [Testing Strategy](#testing-strategy)
7. [Deployment Considerations](#deployment-considerations)

---

## Current State Audit

### ✅ Existing Infrastructure (Ready to Use)
- **Framework:** Next.js 14.2.5 with App Router architecture
- **Language:** TypeScript with strict mode enabled
- **Styling:** Tailwind CSS 3.4.7 fully configured
- **Package Manager:** Yarn Berry 4.0.2 (via Corepack)
- **Airtable SDK:** v0.12.2 installed and configured
- **Path Aliases:** `@/*` mapped to `./src/*`
- **Linting:** ESLint with Next.js configuration
- **Environment Variables:** Already using `.env.local` pattern

### ⚠️ Missing/Needs Update
- **Yarn Configuration:** No `.yarnrc.yml` file (required by Prompt 1)
- **Dependencies:** Missing `react-hook-form` (required for Prompt 8)
- **Airtable Schema:** Current single-table design needs 3 new tables
- **API Routes:** Existing routes serve liturgist data, need nutrition endpoints
- **Type Definitions:** Need new TypeScript interfaces for nutrition data
- **Utility Modules:** No calculator or FDA rounding logic yet

### 📊 Current File Structure
```
src/
├── app/                    # App Router (Next.js 14)
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── api/
│   │   ├── services/route.ts
│   │   └── signup/route.ts
│   ├── admin/
│   ├── archive/
│   ├── schedule/
│   └── signup/
├── components/
│   ├── Header.tsx
│   └── PasswordGate.tsx
├── lib/
│   └── airtable.ts        # Airtable service layer
├── types/
│   └── liturgist.ts
└── admin/
    └── liturgists.ts
```

---

## Critical Questions & Decisions

### 🔴 REQUIRED - Please Clarify Before Implementation

1. **App Scope Decision**
   - [ ] **REPLACE** the liturgist app entirely with nutrition calculator
   - [ ] **KEEP BOTH** apps side-by-side (separate routes)
   - [ ] **TRANSITION** - migrate liturgist data then replace
   
   **Impact:** Determines whether we delete existing pages or create new routes

2. **Airtable Base Strategy**
   - [ ] **NEW BASE** - Create separate "Nutrition App" base
   - [ ] **SAME BASE** - Add 3 new tables to existing liturgist base
   
   **Impact:** Affects environment variables and data isolation

3. **USDA API Access**
   - [ ] I have a USDA API key ready
   - [ ] Need documentation on obtaining API key
   - [ ] Use demo/limited access for development
   
   **Impact:** Required for ingredient search functionality

4. **Authentication Requirements**
   - [ ] Public access (no password gate)
   - [ ] Password protected (like liturgist app)
   - [ ] User authentication (login system)
   
   **Impact:** Security implementation and user experience

5. **Data Model Clarification**
   - **SubRecipes:** Are these "base recipes" or "components" (e.g., "pizza dough", "tomato sauce")?
   - **FinalDishes:** Are these complete menu items (e.g., "Margherita Pizza")?
   
   **Impact:** UI/UX design and data flow

---

## Adapted Implementation Prompts

The original prompts assumed **Pages Router** (`/pages/api`). All prompts below are **adapted for App Router** (`/app/api`) to match your existing codebase.

### 📋 Prompt 1: Project Setup (ADAPTED)

**Original Intent:** Initialize project with Yarn Berry and disable PnP  
**Adaptation:** Project already initialized; add missing configuration

**Implementation Steps:**
1. ✅ Create `.yarnrc.yml` with node-modules linker
2. ✅ Verify `airtable` package is installed (already present)
3. ✅ Add `react-hook-form` dependency for forms
4. ✅ Verify Corepack is enabled and Yarn version matches

**Files to Create/Modify:**
- `/.yarnrc.yml` (new)
- `/package.json` (add react-hook-form)

**Commands:**
```bash
yarn add react-hook-form
```

---

### 📋 Prompt 2: Airtable Base Configuration (ADAPTED)

**Original Intent:** Document Airtable schema  
**Adaptation:** Create markdown guide + update environment variables

**Implementation Steps:**
1. ✅ Create `AIRTABLE_NUTRITION_SETUP.md` guide
2. ✅ Define 3 tables with exact field names and types
3. ✅ Document JSON schema for stringified fields
4. ✅ Provide environment variable template

**Tables Schema:**

**Table 1: SubRecipes**
| Field Name | Type | Description |
|------------|------|-------------|
| Name | Single line text | Sub-recipe identifier |
| IngredientsJSON | Long text | Stringified array of ingredient objects |
| NutrientProfileJSON | Long text | Stringified nutrient data per 100g |
| ServingSizeGrams | Number | Default serving size in grams |
| CreatedAt | Created time | Auto-generated |

**Table 2: FinalDishes**
| Field Name | Type | Description |
|------------|------|-------------|
| Name | Single line text | Final dish name |
| IngredientsJSON | Long text | Stringified array (includes SubRecipes) |
| NutrientProfileJSON | Long text | Calculated nutrition per 100g |
| CreatedAt | Created time | Auto-generated |

**Table 3: USDACache**
| Field Name | Type | Description |
|------------|------|-------------|
| FdcId | Number | USDA FoodData Central ID |
| Name | Single line text | Food item name |
| NutrientProfileJSON | Long text | USDA nutrient data |
| LastUpdated | Last modified time | Auto-generated |

**Environment Variables Needed:**
```env
# Existing (keep for potential dual-app scenario)
AIRTABLE_PAT_TOKEN=your_personal_access_token
AIRTABLE_BASE_ID=app_nutrition_base_id
AIRTABLE_TABLE_NAME=SubRecipes  # Or make this dynamic

# New (if using same base)
AIRTABLE_SUBRECIPES_TABLE=SubRecipes
AIRTABLE_FINALDISHES_TABLE=FinalDishes
AIRTABLE_USDACACHE_TABLE=USDACache

# USDA API
USDA_API_KEY=your_usda_api_key
```

---

### 📋 Prompt 3: Secure Airtable Service Layer (ADAPTED)

**Original Intent:** Create `/lib/airtable.ts` with helper functions  
**Adaptation:** Extend or replace existing `/src/lib/airtable.ts`

**Implementation Steps:**
1. ✅ Define TypeScript interfaces for nutrition data models
2. ✅ Create table references for SubRecipes, FinalDishes, USDACache
3. ✅ Implement CRUD helper functions:
   - `getSubRecipes()` - Fetch all sub-recipes
   - `createSubRecipe(data)` - Create new sub-recipe
   - `getSubRecipeById(id)` - Get single sub-recipe
   - `updateSubRecipe(id, data)` - Update sub-recipe
   - `getFinalDishes()` - Fetch all final dishes
   - `createFinalDish(data)` - Create final dish
   - `findCachedIngredientByFdcId(fdcId)` - Check USDA cache
   - `cacheUSDAIngredient(data)` - Store USDA data
4. ✅ Map Airtable records to TypeScript interfaces

**New TypeScript Interfaces:**
```typescript
// /src/types/nutrition.ts
export interface NutrientProfile {
  calories: number
  totalFat: number
  saturatedFat: number
  transFat: number
  cholesterol: number
  sodium: number
  totalCarbohydrate: number
  dietaryFiber: number
  totalSugars: number
  addedSugars: number
  protein: number
  vitaminD: number
  calcium: number
  iron: number
  potassium: number
  // Per 100g basis
}

export interface Ingredient {
  fdcId?: number  // If USDA ingredient
  subRecipeId?: string  // If referencing a SubRecipe
  name: string
  quantity: number
  unit: string
  nutrientProfile?: NutrientProfile
}

export interface SubRecipe {
  id: string
  name: string
  ingredients: Ingredient[]
  nutrientProfile: NutrientProfile
  servingSizeGrams: number
  createdAt?: string
}

export interface FinalDish {
  id: string
  name: string
  ingredients: Ingredient[]
  nutrientProfile: NutrientProfile
  createdAt?: string
}

export interface USDAFood {
  fdcId: number
  name: string
  nutrientProfile: NutrientProfile
  foodPortions?: FoodPortion[]
}

export interface FoodPortion {
  id: number
  amount: number
  gramWeight: number
  modifier: string
  measureUnit: {
    name: string
    abbreviation: string
  }
}
```

**Files to Create/Modify:**
- `/src/types/nutrition.ts` (new)
- `/src/lib/airtable.ts` (extend or create new `/src/lib/airtable-nutrition.ts`)

---

### 📋 Prompt 4: Server-Side USDA API Route (ADAPTED)

**Original Intent:** Create `/pages/api/usda/search.ts`  
**Adaptation:** Create `/src/app/api/usda/search/route.ts` (App Router)

**Implementation Steps:**
1. ✅ Create App Router API route handler
2. ✅ Extract `query` parameter from URL
3. ✅ Fetch from USDA FoodData Central with API key from env
4. ✅ Return JSON results to client
5. ✅ Handle errors and rate limiting

**USDA API Endpoint:**
```
https://api.nal.usda.gov/fdc/v1/foods/search
```

**Query Parameters:**
- `api_key`: From environment variable
- `query`: User search term
- `dataType`: "Branded", "Survey (FNDDS)", "Foundation", "SR Legacy"
- `pageSize`: Limit results (e.g., 25)

**Files to Create:**
- `/src/app/api/usda/search/route.ts` (new)

**Security Considerations:**
- ✅ API key only on server (never exposed to client)
- ✅ Rate limiting (USDA has rate limits)
- ✅ Input validation on search query
- ✅ Error handling for failed requests

---

### 📋 Prompt 5: Server-Side Unit Conversion & Nutrition Calculator (ADAPTED)

**Original Intent:** Create `/lib/calculator.ts` with conversion + calculation logic  
**Adaptation:** Same path works (`/src/lib/calculator.ts`)

**Implementation Steps:**
1. ✅ Implement `convertToGrams(quantity, unit, usdaData)` function
   - Priority: Use USDA `foodPortions` for accurate conversions
   - Fallback: Standard conversion table (cups, oz, tbsp, tsp, etc.)
2. ✅ Implement `calculateNutrientProfile(ingredients, airtableService)` function
   - Recursive: Handle ingredients that are SubRecipes
   - Fetch USDA data from cache or API
   - Convert all quantities to grams
   - Aggregate all nutrients
   - Normalize to per 100g basis
3. ✅ Handle edge cases (missing data, zero quantities)

**Conversion Table (Fallback):**
```typescript
const STANDARD_CONVERSIONS: Record<string, number> = {
  // Weight
  'oz': 28.3495,
  'lb': 453.592,
  'g': 1,
  'kg': 1000,
  
  // Volume (approximate, water basis)
  'cup': 236.588,
  'tbsp': 14.7868,
  'tsp': 4.92892,
  'ml': 1,
  'l': 1000,
  'fl oz': 29.5735,
  
  // Units (must have portion data)
  'piece': null,  // Requires USDA portion data
  'slice': null,
  'item': null,
}
```

**Files to Create:**
- `/src/lib/calculator.ts` (new)

---

### 📋 Prompt 6: API Route for Creating Sub-Recipes (ADAPTED)

**Original Intent:** Create `/pages/api/sub-recipes.ts`  
**Adaptation:** Create `/src/app/api/sub-recipes/route.ts` (App Router)

**Implementation Steps:**
1. ✅ Create POST handler
2. ✅ Extract `name`, `servingSizeGrams`, `ingredients[]` from request body
3. ✅ Call `calculateNutrientProfile()` from `/src/lib/calculator.ts`
4. ✅ Call `createSubRecipe()` from Airtable service
5. ✅ Return new record ID

**Request Body Schema:**
```typescript
{
  name: string
  servingSizeGrams: number
  ingredients: [
    {
      fdcId?: number
      subRecipeId?: string
      name: string
      quantity: number
      unit: string
    }
  ]
}
```

**Response Schema:**
```typescript
{
  success: boolean
  recordId?: string
  error?: string
}
```

**Files to Create:**
- `/src/app/api/sub-recipes/route.ts` (new)

---

### 📋 Prompt 7: Client-Side Ingredient Search Component (ADAPTED)

**Original Intent:** Create React component with debounced search  
**Adaptation:** Create in `/src/components/` directory

**Implementation Steps:**
1. ✅ Create `IngredientSearch.tsx` component
2. ✅ Implement debounce hook (or use `useDebounce` from custom hook)
3. ✅ Fetch from `/api/usda/search` on debounced input
4. ✅ Display results with `onSelect` callback
5. ✅ Show loading states and errors

**Component Props:**
```typescript
interface IngredientSearchProps {
  onSelect: (ingredient: USDAFood) => void
  placeholder?: string
  className?: string
}
```

**Files to Create:**
- `/src/components/IngredientSearch.tsx` (new)
- `/src/hooks/useDebounce.ts` (new, if needed)

**UI Considerations:**
- Loading spinner during search
- "No results" message
- Keyboard navigation (arrow keys, enter to select)
- Clear button
- Result preview (show basic nutrition info)

---

### 📋 Prompt 8: Client-Side Sub-Recipe Builder UI (ADAPTED)

**Original Intent:** Create `/pages/sub-recipes/new.tsx`  
**Adaptation:** Create `/src/app/sub-recipes/new/page.tsx` (App Router)

**Implementation Steps:**
1. ✅ Create App Router page component
2. ✅ Integrate `react-hook-form` for form management
3. ✅ Use `useFieldArray` for dynamic ingredient list
4. ✅ Each row contains:
   - `IngredientSearch` component
   - Quantity input (number)
   - Unit input (text/dropdown)
   - Remove button
5. ✅ Add ingredient button
6. ✅ Submit handler posts to `/api/sub-recipes`

**Form Schema:**
```typescript
interface SubRecipeFormData {
  name: string
  servingSizeGrams: number
  ingredients: Array<{
    fdcId?: number
    subRecipeId?: string
    name: string
    quantity: number
    unit: string
  }>
}
```

**Files to Create:**
- `/src/app/sub-recipes/new/page.tsx` (new)
- Optionally: `/src/app/sub-recipes/page.tsx` (list view)

**UX Enhancements:**
- Real-time validation
- Save draft to localStorage
- Preview nutrition as you build
- Duplicate sub-recipe feature

---

### 📋 Prompt 9: FDA-Compliant Rounding Utility (ADAPTED)

**Original Intent:** Create `/utils/fdaRounding.ts`  
**Adaptation:** Create `/src/lib/fdaRounding.ts` (consistent with project structure)

**Implementation Steps:**
1. ✅ Implement FDA rounding rules per 21 CFR 101.9
2. ✅ Create individual functions for each nutrient
3. ✅ Return formatted strings (not numbers)

**FDA Rounding Rules Summary:**

| Nutrient | Rounding Rule |
|----------|---------------|
| **Calories** | < 5: "0" / 5-50: nearest 5 / > 50: nearest 10 |
| **Total Fat** | < 0.5g: "0g" / < 5g: nearest 0.5g / ≥ 5g: nearest 1g |
| **Saturated Fat** | < 0.5g: "0g" / < 1g: "< 1g" / ≥ 1g: nearest 0.5g |
| **Trans Fat** | < 0.5g: "0g" / ≥ 0.5g: nearest 0.5g |
| **Cholesterol** | < 2mg: "0mg" / 2-5mg: "< 5mg" / ≥ 5mg: nearest 5mg |
| **Sodium** | < 5mg: "0mg" / 5-140mg: nearest 5mg / > 140mg: nearest 10mg |
| **Total Carb** | < 0.5g: "0g" / < 1g: "< 1g" / ≥ 1g: nearest 1g |
| **Dietary Fiber** | < 0.5g: "0g" / < 1g: "< 1g" / ≥ 1g: nearest 1g |
| **Sugars** | < 0.5g: "0g" / < 1g: "< 1g" / ≥ 1g: nearest 1g |
| **Protein** | < 0.5g: "0g" / < 1g: "< 1g" / ≥ 1g: nearest 1g |

**Files to Create:**
- `/src/lib/fdaRounding.ts` (new)

**Function Signatures:**
```typescript
export function roundCalories(calories: number): string
export function roundTotalFat(grams: number): string
export function roundSaturatedFat(grams: number): string
export function roundTransFat(grams: number): string
export function roundCholesterol(mg: number): string
export function roundSodium(mg: number): string
export function roundTotalCarbohydrate(grams: number): string
export function roundDietaryFiber(grams: number): string
export function roundSugars(grams: number): string
export function roundProtein(grams: number): string
// ... other nutrients
```

---

### 📋 Prompt 10: FDA Nutrition Label React Component (ADAPTED)

**Original Intent:** Create `/components/ui/NutritionLabel.tsx`  
**Adaptation:** Create `/src/components/NutritionLabel.tsx`

**Implementation Steps:**
1. ✅ Create React component accepting `NutrientProfile` prop
2. ✅ Import rounding functions from `/src/lib/fdaRounding.ts`
3. ✅ Use Tailwind CSS for FDA-compliant styling
4. ✅ Implement exact layout per FDA requirements:
   - Bold "Nutrition Facts" header
   - Thick dividing lines
   - Proper indentation for sub-nutrients
   - Serving size information
   - % Daily Value column

**Component Props:**
```typescript
interface NutritionLabelProps {
  nutrientProfile: NutrientProfile
  servingSizeGrams: number
  servingSizeDescription?: string  // e.g., "1 cup (240g)"
  servingsPerContainer?: number
  className?: string
}
```

**Files to Create:**
- `/src/components/NutritionLabel.tsx` (new)

**Styling Requirements:**
- Font: Sans-serif (default Tailwind)
- Black text on white background
- Bold for main nutrients
- Regular weight for sub-nutrients (indented)
- Thick horizontal lines (border-4 or border-8)
- Proper spacing and alignment

**Export Options (Future Enhancement):**
- Download as PNG
- Download as PDF
- Copy to clipboard

---

## Implementation Roadmap

### Phase 1: Foundation Setup (Week 1)
**Goal:** Configure project and establish data infrastructure

- [ ] **Day 1-2: Configuration & Dependencies**
  - Create `.yarnrc.yml` with node-modules linker
  - Install `react-hook-form` dependency
  - Set up environment variables template
  - Document USDA API key acquisition process

- [ ] **Day 3-4: Airtable Schema**
  - Create Airtable base (or add tables to existing base)
  - Set up SubRecipes, FinalDishes, USDACache tables
  - Verify field types and test data insertion
  - Create `AIRTABLE_NUTRITION_SETUP.md` documentation

- [ ] **Day 5: Type Definitions**
  - Create `/src/types/nutrition.ts` with all interfaces
  - Update TypeScript configuration if needed
  - Create sample data for testing

**Deliverables:**
- ✅ Configured Yarn workspace
- ✅ Airtable base with 3 tables
- ✅ Type definitions
- ✅ Environment variables documented

---

### Phase 2: Backend Services (Week 2)
**Goal:** Build server-side logic and API routes

- [ ] **Day 1-2: Airtable Service Layer**
  - Extend `/src/lib/airtable.ts` (or create new file)
  - Implement CRUD functions for SubRecipes
  - Implement CRUD functions for FinalDishes
  - Implement cache functions for USDACache
  - Write unit tests for service layer

- [ ] **Day 3: USDA API Integration**
  - Create `/src/app/api/usda/search/route.ts`
  - Test USDA API calls
  - Implement error handling and rate limiting
  - Cache successful USDA lookups

- [ ] **Day 4-5: Calculator Logic**
  - Create `/src/lib/calculator.ts`
  - Implement `convertToGrams()` with USDA portion priority
  - Implement `calculateNutrientProfile()` with recursion
  - Write comprehensive unit tests
  - Test with sample recipes

**Deliverables:**
- ✅ Airtable service layer with full CRUD
- ✅ USDA API route functional
- ✅ Calculator logic tested and verified

---

### Phase 3: API Routes & Business Logic (Week 3)
**Goal:** Create endpoints for client consumption

- [ ] **Day 1-2: Sub-Recipe API**
  - Create `/src/app/api/sub-recipes/route.ts`
  - Implement POST for creating sub-recipes
  - Implement GET for listing sub-recipes
  - Create GET by ID endpoint if needed

- [ ] **Day 3: Final Dish API**
  - Create `/src/app/api/final-dishes/route.ts`
  - Implement POST for creating final dishes
  - Implement GET for listing final dishes

- [ ] **Day 4: FDA Rounding Utility**
  - Create `/src/lib/fdaRounding.ts`
  - Implement all rounding functions per FDA rules
  - Write tests to verify compliance
  - Document sources (21 CFR 101.9)

- [ ] **Day 5: Integration Testing**
  - Test full flow: ingredient → sub-recipe → final dish
  - Verify calculation accuracy
  - Test edge cases (missing data, zero values)

**Deliverables:**
- ✅ Complete API layer
- ✅ FDA-compliant rounding functions
- ✅ Integration tests passing

---

### Phase 4: Frontend Components (Week 4)
**Goal:** Build user-facing interfaces

- [ ] **Day 1-2: Ingredient Search Component**
  - Create `/src/components/IngredientSearch.tsx`
  - Implement debounce hook
  - Style with Tailwind CSS
  - Add loading and error states

- [ ] **Day 3-4: Sub-Recipe Builder**
  - Create `/src/app/sub-recipes/new/page.tsx`
  - Integrate `react-hook-form`
  - Implement dynamic ingredient array
  - Add validation and error handling

- [ ] **Day 5: Sub-Recipe List View**
  - Create `/src/app/sub-recipes/page.tsx`
  - Display all saved sub-recipes
  - Add edit/delete functionality
  - Implement search/filter

**Deliverables:**
- ✅ Ingredient search component
- ✅ Sub-recipe builder UI
- ✅ Sub-recipe management interface

---

### Phase 5: Nutrition Label & Final Dish UI (Week 5)
**Goal:** Complete the label generation functionality

- [ ] **Day 1-2: Nutrition Label Component**
  - Create `/src/components/NutritionLabel.tsx`
  - Implement FDA-compliant styling
  - Integrate rounding functions
  - Make responsive for different screen sizes

- [ ] **Day 3-4: Final Dish Builder**
  - Create `/src/app/final-dishes/new/page.tsx`
  - Similar to sub-recipe builder but includes sub-recipes
  - Allow mixing USDA ingredients + sub-recipes
  - Real-time nutrition preview

- [ ] **Day 5: Final Dish List & Label Generation**
  - Create `/src/app/final-dishes/page.tsx`
  - Display all final dishes
  - Generate and display nutrition labels
  - Add export options (future: PDF, PNG)

**Deliverables:**
- ✅ FDA-compliant nutrition label component
- ✅ Final dish builder UI
- ✅ Complete workflow functional

---

### Phase 6: Polish & Production Readiness (Week 6)
**Goal:** Prepare for deployment

- [ ] **Day 1-2: UI/UX Refinement**
  - Review all pages for consistency
  - Improve mobile responsiveness
  - Add helpful tooltips and guidance
  - Implement loading states everywhere

- [ ] **Day 3: Error Handling & Validation**
  - Comprehensive input validation
  - User-friendly error messages
  - Handle API failures gracefully
  - Add retry logic where appropriate

- [ ] **Day 4: Documentation**
  - User guide for creating sub-recipes
  - User guide for final dishes
  - API documentation for developers
  - Environment setup guide

- [ ] **Day 5: Testing & QA**
  - End-to-end testing
  - Cross-browser testing
  - Mobile device testing
  - Performance optimization

- [ ] **Day 6: Deployment**
  - Deploy to Vercel (or preferred platform)
  - Set up production environment variables
  - Monitor initial usage
  - Create rollback plan

**Deliverables:**
- ✅ Production-ready application
- ✅ Complete documentation
- ✅ Deployed and monitored

---

## Security & Best Practices

### 🔒 Security Checklist

- [ ] **API Keys Protected**
  - All API keys in environment variables only
  - Never commit `.env.local` to git
  - Use different keys for dev/prod

- [ ] **Input Validation**
  - Validate all user inputs on server side
  - Sanitize data before Airtable insertion
  - Prevent SQL/NoSQL injection (not applicable but good practice)

- [ ] **Rate Limiting**
  - Implement rate limiting on USDA API calls
  - Consider caching USDA results
  - Monitor API usage

- [ ] **CORS Configuration**
  - Only allow requests from your domain
  - Configure Next.js middleware if needed

- [ ] **Data Validation**
  - Validate nutrient values (no negatives)
  - Check for reasonable ranges
  - Handle missing data gracefully

### 🎯 Best Practices

- [ ] **TypeScript Strict Mode**
  - Already enabled in `tsconfig.json`
  - Use explicit types, avoid `any`
  - Leverage type inference

- [ ] **Error Handling**
  - Try/catch blocks in all async functions
  - Log errors to console (or monitoring service)
  - Return user-friendly messages

- [ ] **Code Organization**
  - Keep components under 300 lines
  - Extract reusable logic to hooks/utils
  - Use consistent naming conventions

- [ ] **Performance**
  - Debounce search inputs
  - Lazy load large components
  - Optimize images (Next.js Image component)
  - Cache API responses where appropriate

- [ ] **Accessibility**
  - Semantic HTML
  - ARIA labels where needed
  - Keyboard navigation
  - Screen reader compatible

---

## Testing Strategy

### Unit Tests
- [ ] `/src/lib/calculator.ts` - All conversion functions
- [ ] `/src/lib/calculator.ts` - Nutrition calculation logic
- [ ] `/src/lib/fdaRounding.ts` - All rounding functions
- [ ] `/src/lib/airtable.ts` - Service layer functions (mocked)

### Integration Tests
- [ ] API Routes - Test request/response flow
- [ ] USDA API - Test search functionality (with rate limits)
- [ ] Airtable - Test CRUD operations (use test base)
- [ ] Calculator + Airtable - Test full recipe calculation

### E2E Tests (Optional but Recommended)
- [ ] Create sub-recipe from scratch
- [ ] Search USDA ingredients
- [ ] Build final dish with sub-recipes
- [ ] Generate nutrition label

### Manual Testing Checklist
- [ ] All forms validate correctly
- [ ] Error messages display properly
- [ ] Loading states work
- [ ] Mobile responsive
- [ ] Cross-browser compatible (Chrome, Safari, Firefox)

---

## Deployment Considerations

### Environment Variables (Production)
```env
# Airtable
AIRTABLE_PAT_TOKEN=patXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_SUBRECIPES_TABLE=SubRecipes
AIRTABLE_FINALDISHES_TABLE=FinalDishes
AIRTABLE_USDACACHE_TABLE=USDACache

# USDA FoodData Central
USDA_API_KEY=your_production_api_key

# Optional: Authentication
PASSWORD_HASH=your_password_hash  # If using PasswordGate
```

### Vercel Deployment
- ✅ Already configured based on existing `VERCEL_DEPLOYMENT.md`
- Add new environment variables in Vercel dashboard
- Configure production branch
- Set up preview deployments

### Performance Monitoring
- Consider adding analytics (Vercel Analytics, Google Analytics)
- Monitor API rate limits (USDA)
- Track Airtable usage (record limits)
- Set up error tracking (Sentry, LogRocket)

### Backup & Recovery
- Airtable has version history
- Export data regularly
- Document restore procedures

---

## Risk Assessment & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| USDA API rate limits | High | Medium | Cache results, implement rate limiting |
| Airtable record limits | Medium | Low | Monitor usage, plan for database migration |
| Inaccurate nutrition calculations | High | Medium | Extensive testing, user feedback loop |
| Missing USDA portion data | Medium | High | Robust fallback conversion table |
| Complex recipes breaking calculator | Medium | Medium | Recursive logic testing, error handling |
| User confusion on UI | Low | Medium | Clear documentation, tooltips, examples |

---

## Open Questions & Next Steps

### Before Starting Implementation:
1. **Confirm CEO decisions** on Critical Questions section above
2. **Obtain USDA API key** (if not already done)
3. **Decide on app scope** (replace vs. coexist with liturgist app)
4. **Review and approve** this migration plan
5. **Set timeline** based on available resources

### Recommended First Steps:
1. Answer critical questions
2. Set up Airtable base
3. Obtain USDA API key
4. Create `.yarnrc.yml`
5. Begin Phase 1 implementation

---

## Appendix: Resources

### Official Documentation
- [USDA FoodData Central API](https://fdc.nal.usda.gov/api-guide.html)
- [FDA Nutrition Labeling](https://www.fda.gov/food/food-labeling-nutrition/nutrition-facts-label)
- [21 CFR 101.9 - Nutrition labeling of food](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-101/subpart-A/section-101.9)
- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [React Hook Form](https://react-hook-form.com/)
- [Airtable API](https://airtable.com/developers/web/api/introduction)

### Useful Tools
- [FDA Nutrition Facts Label Generator](https://www.accessdata.fda.gov/scripts/interactivenutritionfactslabel/)
- [USDA FoodData Central Search](https://fdc.nal.usda.gov/)
- [Nutrition Label Design Templates](https://www.fda.gov/food/food-labeling-nutrition/nutrition-facts-label-images)

---

**Document Version:** 1.0  
**Last Updated:** October 22, 2025  
**Author:** Chief Software Engineer  
**Status:** Awaiting CEO Approval
