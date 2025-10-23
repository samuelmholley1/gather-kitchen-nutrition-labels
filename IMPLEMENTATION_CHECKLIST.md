# Nutrition Label Calculator - Implementation Checklist

**Quick Reference:** Track your progress through the migration

---

## 🔴 CRITICAL: Pre-Implementation Decisions

- [ ] **App Scope:** Replace liturgist app OR keep both? → _____________
- [ ] **Airtable Base:** New base OR add tables to existing? → _____________
- [ ] **USDA API Key:** Acquired? → Yes / No
- [ ] **Authentication:** Public, Password, or Login? → _____________
- [ ] **Data Model:** Understand SubRecipes vs FinalDishes? → Yes / No

---

## Phase 1: Foundation (Week 1) ✅ COMPLETE

### Configuration
- [x] Create `.yarnrc.yml` (node-modules linker)
- [x] Run `yarn add react-hook-form`
- [x] Create `.env.local.example` template
- [x] Document USDA API key setup

### Airtable Schema ⏳ **AUTOMATED - CEO ACTION REQUIRED**
- [ ] Create new empty Airtable base (name: "Nutrition App")
- [ ] Copy base ID from URL
- [ ] Update `AIRTABLE_BASE_ID` in `.env.local`
- [ ] Run automation: `yarn tsx scripts/setup-airtable-base.ts` ⚡
- [ ] Verify 3 tables created (SubRecipes, FinalDishes, USDACache)
- [ ] Test data insertion in each table
- [x] Create `AIRTABLE_NUTRITION_SETUP.md` (manual instructions)
- [x] Create `AIRTABLE_CLI_SETUP.md` (automated instructions)
- [x] Create `/scripts/setup-airtable-base.ts` (automation script)

### Type Definitions
- [x] Create `/src/types/nutrition.ts`
- [x] Define `NutrientProfile` interface
- [x] Define `Ingredient` interface
- [x] Define `SubRecipe` interface
- [x] Define `FinalDish` interface
- [x] Define `USDAFood` interface
- [x] Define `FoodPortion` interface

---

## Phase 2: Backend Services (Week 2) ⏳ IN PROGRESS

### Airtable Service Layer
- [ ] Create/extend `/src/lib/airtable-nutrition.ts` (or modify existing)
- [ ] Implement `getSubRecipes()`
- [ ] Implement `createSubRecipe(data)`
- [ ] Implement `getSubRecipeById(id)`
- [ ] Implement `updateSubRecipe(id, data)`
- [ ] Implement `getFinalDishes()`
- [ ] Implement `createFinalDish(data)`
- [ ] Implement `findCachedIngredientByFdcId(fdcId)`
- [ ] Implement `cacheUSDAIngredient(data)`
- [ ] Write unit tests (optional but recommended)

### USDA API Integration ✅ COMPLETE
- [x] Create `/src/lib/usda.ts`
- [x] Implement `searchFoods()` with query param
- [x] Implement `getFoodDetails()` for single food
- [x] Implement `getFoodsBatch()` for batch requests
- [x] Fetch from USDA FoodData Central API
- [x] Add nutrient mapping (30+ nutrients)
- [x] Add error handling
- [x] Transform USDA data to NutrientProfile
- [x] Test with real USDA API key ✅

### Calculator Logic ✅ COMPLETE
- [x] Create `/src/lib/calculator.ts`
- [x] Implement 4-tier unit conversion (custom > USDA > standard > error)
- [x] Implement `convertToGrams(ingredient, customConversions)`
- [x] Create standard conversion table (cups, oz, etc.)
- [x] Implement `calculateNutritionProfile(ingredients, customConversions)`
- [x] Add recursive logic support for SubRecipe ingredients
- [x] Normalize to per 100g basis
- [x] Implement `applyYieldAdjustment()` for cooking losses
- [x] Implement `scaleToServing()` for serving sizes
- [x] Implement validation functions
- [x] TypeScript compile validation ✅

### Automation Scripts ✅ COMPLETE
- [x] Create `/scripts/setup-airtable-base.ts`
- [x] Automated table creation via Airtable Metadata API
- [x] All 3 tables (SubRecipes, FinalDishes, USDACache)
- [x] All field types and configurations
- [x] Install tsx and dotenv dependencies

---

## Phase 3: API Routes & Utilities (Week 3)

### Sub-Recipe API
- [ ] Create `/src/app/api/sub-recipes/route.ts`
- [ ] Implement POST handler (create)
- [ ] Implement GET handler (list all)
- [ ] Add input validation
- [ ] Test with Postman/curl

### Final Dish API
- [ ] Create `/src/app/api/final-dishes/route.ts`
- [ ] Implement POST handler (create)
- [ ] Implement GET handler (list all)
- [ ] Add input validation
- [ ] Test with Postman/curl

### FDA Rounding Utility ✅ COMPLETE
- [x] Create `/src/lib/fdaRounding.ts`
- [x] Implement `roundCalories()`
- [x] Implement `roundTotalFat()`
- [x] Implement `roundSaturatedFat()`
- [x] Implement `roundTransFat()`
- [x] Implement `roundCholesterol()`
- [x] Implement `roundSodium()`
- [x] Implement `roundTotalCarbohydrate()`
- [x] Implement `roundDietaryFiber()`
- [x] Implement `roundTotalSugars()`
- [x] Implement `roundAddedSugars()`
- [x] Implement `roundProtein()`
- [x] Implement `roundVitaminD()`
- [x] Implement `roundCalcium()`
- [x] Implement `roundIron()`
- [x] Implement `roundPotassium()`
- [x] Implement `calculateDailyValuePercent()`
- [x] Implement `formatNutrient()` helper
- [x] Define `FDA_DAILY_VALUES` constants
- [ ] Implement `roundTotalCarbohydrate()`
- [ ] Implement `roundDietaryFiber()`
- [ ] Implement `roundSugars()`
- [ ] Implement `roundProtein()`
- [ ] Write tests to verify FDA compliance
- [ ] Document 21 CFR 101.9 sources

### Integration Testing
- [ ] Test full flow: USDA search → sub-recipe → final dish
- [ ] Verify calculation accuracy
- [ ] Test with complex recipes (nested sub-recipes)

---

## Phase 4: Frontend Components (Week 4)

### Ingredient Search Component
- [ ] Create `/src/components/IngredientSearch.tsx`
- [ ] Create `/src/hooks/useDebounce.ts` (if needed)
- [ ] Implement text input with debounce
- [ ] Fetch from `/api/usda/search`
- [ ] Display results in list
- [ ] Add `onSelect` callback prop
- [ ] Add loading spinner
- [ ] Add error message display
- [ ] Style with Tailwind CSS
- [ ] Test on multiple devices

### Sub-Recipe Builder
- [ ] Create `/src/app/sub-recipes/new/page.tsx`
- [ ] Set up `react-hook-form`
- [ ] Add name input field
- [ ] Add serving size input
- [ ] Implement `useFieldArray` for ingredients
- [ ] Add IngredientSearch to each row
- [ ] Add quantity/unit inputs
- [ ] Add "Remove ingredient" button
- [ ] Add "Add ingredient" button
- [ ] Implement form submission
- [ ] Add validation and error messages
- [ ] Test full workflow

### Sub-Recipe List View
- [ ] Create `/src/app/sub-recipes/page.tsx`
- [ ] Fetch and display all sub-recipes
- [ ] Add search/filter functionality
- [ ] Add edit button (future)
- [ ] Add delete button
- [ ] Style cards/table

---

## Phase 5: Nutrition Label & Final Dish (Week 5)

### Nutrition Label Component
- [ ] Create `/src/components/NutritionLabel.tsx`
- [ ] Accept `NutrientProfile` prop
- [ ] Import FDA rounding functions
- [ ] Implement "Nutrition Facts" header
- [ ] Add serving size section
- [ ] Add calories (large, bold)
- [ ] Add thick dividing lines
- [ ] Add Total Fat with sub-nutrients (indented)
- [ ] Add Cholesterol
- [ ] Add Sodium
- [ ] Add Total Carbohydrate with sub-nutrients
- [ ] Add Protein
- [ ] Add vitamins/minerals
- [ ] Add % Daily Value column
- [ ] Style with Tailwind for FDA compliance
- [ ] Make responsive
- [ ] Test on printed output

### Final Dish Builder
- [ ] Create `/src/app/final-dishes/new/page.tsx`
- [ ] Set up `react-hook-form`
- [ ] Add name input
- [ ] Implement ingredient array (USDA + SubRecipes)
- [ ] Add dropdown to select SubRecipes
- [ ] Add quantity/unit inputs
- [ ] Show real-time nutrition preview
- [ ] Implement form submission
- [ ] Add validation

### Final Dish List & Labels
- [ ] Create `/src/app/final-dishes/page.tsx`
- [ ] Fetch and display all final dishes
- [ ] Render NutritionLabel for each
- [ ] Add print button
- [ ] Add export options (future: PDF, PNG)
- [ ] Add search/filter

---

## Phase 6: Polish & Production (Week 6)

### UI/UX Refinement
- [ ] Review all pages for consistency
- [ ] Ensure mobile responsiveness
- [ ] Add helpful tooltips
- [ ] Add user guidance text
- [ ] Implement loading states everywhere
- [ ] Add success/error toasts

### Error Handling
- [ ] Comprehensive input validation
- [ ] User-friendly error messages
- [ ] Handle API failures gracefully
- [ ] Add retry logic for failed requests
- [ ] Test offline behavior

### Documentation
- [ ] Write user guide for sub-recipes
- [ ] Write user guide for final dishes
- [ ] Document API endpoints
- [ ] Create environment setup guide
- [ ] Add inline code comments

### Testing & QA
- [ ] End-to-end testing (all flows)
- [ ] Cross-browser testing (Chrome, Safari, Firefox)
- [ ] Mobile device testing (iOS, Android)
- [ ] Performance optimization
- [ ] Accessibility audit
- [ ] Security review

### Deployment
- [ ] Set up production environment variables in Vercel
- [ ] Deploy to production
- [ ] Test production deployment
- [ ] Monitor for errors
- [ ] Create rollback plan
- [ ] Document deployment process

---

## Post-Launch

### Monitoring
- [ ] Set up analytics
- [ ] Monitor USDA API usage
- [ ] Track Airtable record count
- [ ] Set up error tracking (Sentry, etc.)

### Optimization
- [ ] Analyze performance metrics
- [ ] Optimize slow queries
- [ ] Improve cache strategy
- [ ] Reduce API calls

### Feature Enhancements (Future)
- [ ] Export labels as PDF
- [ ] Export labels as PNG
- [ ] Batch label generation
- [ ] Recipe duplication
- [ ] Recipe templates
- [ ] Multi-user support
- [ ] Recipe sharing

---

## Notes & Blockers

**Date:** _______________

**Current Phase:** _______________

**Blockers:**
- 
- 
- 

**Questions for CEO:**
- 
- 
- 

**Completed This Session:**
- 
- 
- 

---

**Last Updated:** _______________ by _______________
