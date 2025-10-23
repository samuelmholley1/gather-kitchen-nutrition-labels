# RED TEAM AUDIT - UX/UI/FUNCTIONALITY ISSUES

## 🔴 CRITICAL ISSUES

### 1. **Review Page Doesn't Show Errors to User**
**Location:** `/src/app/import/review/page.tsx`
**Problem:** Parser errors stored in `parseResult.errors` are never displayed to the user
**Impact:** HIGH - User doesn't know if there are warnings about duplicates, nested parentheses, etc.
**Example:**
```typescript
// Parser returns errors array, but review page doesn't display them
const result: SmartParseResult = JSON.parse(stored)
// result.errors exists but is never shown!
```

### 2. **No Visual Feedback While Searching USDA**
**Location:** `/src/components/IngredientSearch.tsx`
**Problem:** User clicks search, nothing happens for up to 10 seconds (timeout)
**Impact:** HIGH - Appears broken, user doesn't know if it's working
**Fix Needed:** Add loading spinner, "Searching..." message

### 3. **Confirmed Ingredients Can't Be Changed**
**Location:** `/src/app/import/review/page.tsx`
**Problem:** Once confirmed, there's no way to re-search or change selection
**Impact:** MEDIUM - If user picks wrong USDA match, they're stuck
**Fix Needed:** Add "Change" button on confirmed ingredients

### 4. **No Indication of How Many Ingredients Left to Confirm**
**Location:** `/src/app/import/review/page.tsx`
**Problem:** User has to count ⚠️ icons manually
**Impact:** MEDIUM - Confusing workflow, especially with many ingredients
**Fix Needed:** Show "3 of 12 ingredients confirmed" counter

### 5. **Parse Errors Not Validated Before Navigation**
**Location:** `/src/app/import/page.tsx`
**Problem:** Parser errors (empty parentheses, unbalanced) stored but user sent to review page anyway
**Impact:** HIGH - User sees review page but can't save because recipe is invalid
**Fix Needed:** Check `result.errors` before navigation, show errors on import page

### 6. **No Way to Go Back and Edit Recipe Text**
**Location:** `/src/app/import/review/page.tsx`
**Problem:** Once on review page, user can't go back to import page to fix recipe
**Impact:** MEDIUM - Have to start over if recipe has errors
**Fix Needed:** Add "← Edit Recipe" button that preserves text

### 7. **Session Storage Lost on Refresh**
**Location:** All pages using sessionStorage
**Problem:** User refreshes review page → redirected to import, loses all work
**Impact:** MEDIUM - Frustrating if accidentally refresh
**Fix Needed:** Add localStorage backup or save draft

## 🟡 IMPORTANT UX ISSUES

### 8. **Unclear What Happens After "Parse Recipe"**
**Location:** `/src/app/import/page.tsx`
**Problem:** No explanation that next page is where you confirm USDA matches
**Impact:** MEDIUM - User may be confused by review page
**Fix Needed:** Add text: "Next: Review and confirm ingredient matches"

### 9. **No Progress Indicator on Parse**
**Location:** `/src/app/import/page.tsx`
**Problem:** Shows spinner but doesn't indicate what's happening
**Impact:** LOW - Minor UX issue
**Fix Needed:** Show "Detecting sub-recipes..." message

### 10. **Save Button Always Enabled**
**Location:** `/src/app/import/review/page.tsx`
**Problem:** Save button is green even when ingredients unconfirmed
**Impact:** MEDIUM - User might try to save too early
**Fix Needed:** Disable until all confirmed, or show warning

### 11. **No Preview of What Will Be Created**
**Location:** `/src/app/import/review/page.tsx`
**Problem:** User doesn't know they're about to create X sub-recipes + 1 final dish
**Impact:** MEDIUM - Unclear what "Save" does
**Fix Needed:** Show summary: "This will create: 2 sub-recipes, 1 final dish"

### 12. **Duplicate Sub-Recipe Warning Not Prominent**
**Location:** Parser warnings in `parseResult.errors`
**Problem:** Critical warning buried in non-displayed errors array
**Impact:** HIGH - User might create duplicate sub-recipes unknowingly
**Fix Needed:** Show warnings in big yellow banner at top of review page

### 13. **Long Ingredient Names Truncated Silently**
**Location:** Parser truncates to 255 chars
**Problem:** User doesn't know their ingredient name was cut off
**Impact:** LOW - Rare but confusing when it happens
**Fix Needed:** Show warning if truncation occurred

### 14. **No Validation on Empty USDA Search**
**Location:** `/src/components/IngredientSearch.tsx`
**Problem:** User can click "Search" with empty query
**Impact:** LOW - Wastes API call
**Fix Needed:** Disable button if query empty

## 🟢 MINOR UI POLISH ISSUES

### 15. **Inconsistent Button Styling**
**Location:** Various pages
**Problem:** Some buttons are emerald, some gray, no clear hierarchy
**Impact:** LOW - Minor visual inconsistency
**Fix Needed:** Establish button hierarchy (primary/secondary/tertiary)

### 16. **No Keyboard Shortcuts**
**Location:** Import and review pages
**Problem:** User must click buttons, no Enter to parse/confirm
**Impact:** LOW - Power user convenience
**Fix Needed:** Enter to parse, Enter to confirm search

### 17. **Mobile Redirect Message Could Be Friendlier**
**Location:** `/src/components/MobileRestrict.tsx`
**Problem:** Just says "Desktop or Tablet Required" - could explain why
**Impact:** LOW - Minor UX
**Fix Needed:** "For the best experience with ingredient search..."

### 18. **No "Are You Sure?" on Clear Button**
**Location:** `/src/app/import/page.tsx`
**Problem:** Accidental click on Clear loses all recipe text
**Impact:** MEDIUM - Frustrating if clicked by accident
**Fix Needed:** Add confirmation dialog

## 📊 FUNCTIONALITY GAPS

### 19. **Can't Save Partially Confirmed Recipe**
**Location:** `/src/app/import/review/page.tsx`
**Problem:** All ingredients must be confirmed - can't save draft
**Impact:** MEDIUM - If user can't find USDA match, stuck
**Fix Needed:** Allow saving with "Skip" option for unfound ingredients

### 20. **No Way to Skip USDA for Non-Food Ingredients**
**Location:** Review page workflow
**Problem:** What if ingredient is "1 pinch love"? No USDA match exists
**Impact:** HIGH - Blocks legitimate recipes
**Fix Needed:** Add "Skip / Manual Entry" option

### 21. **No Bulk Confirm for Common Ingredients**
**Location:** `/src/app/import/review/page.tsx`
**Problem:** If 5 ingredients need "salt", must confirm each separately
**Impact:** LOW - Minor inconvenience
**Fix Needed:** "Apply to all similar ingredients" option

### 22. **No Recipe Validation Before Parse**
**Location:** `/src/app/import/page.tsx`
**Problem:** Doesn't check for minimum requirements before parsing
**Impact:** MEDIUM - Better to fail fast with clear message
**Fix Needed:** Check >1 line, has ingredients before starting parse

## 🎯 PRIORITY FIXES

### **Must Fix Before Sara Uses:**
1. ✅ Display parser errors on review page (warnings about duplicates, etc.)
2. ✅ Show loading state while searching USDA
3. ✅ Prevent navigation to review if critical errors exist
4. ✅ Add counter showing "X of Y ingredients confirmed"
5. ✅ Add "Skip USDA" option for ingredients without matches

### **Should Fix Soon:**
6. Add "Change" button for confirmed ingredients
7. Add "← Edit Recipe" back button
8. Disable save button until all confirmed
9. Add confirmation on Clear button
10. Show preview of what will be created

### **Nice to Have:**
11. Keyboard shortcuts (Enter to submit)
12. Progress messages during parse
13. localStorage backup
14. Better button hierarchy
15. Bulk confirm similar ingredients

## 🧪 TEST COVERAGE GAPS

**Tests Currently Failing:**
- 17 of 32 tests failing
- Main issue: Review page not showing ingredients in tests
- Root cause: Client-side rendering issues with test environment

**Missing Test Coverage:**
- Error display on review page
- Back button functionality  
- Skip USDA functionality
- Partial save workflows
- Draft persistence

## ✅ WHAT'S WORKING WELL

- ✅ Smart parser correctly detects sub-recipes
- ✅ Unicode fraction handling
- ✅ Overflow protection
- ✅ Mobile restrictions
- ✅ Session storage during workflow
- ✅ Airtable save functionality
- ✅ USDA API timeout handling
