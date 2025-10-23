# Prompt Adaptations Summary

**Purpose:** Quick reference showing how each CTO prompt was adapted for the existing Next.js App Router codebase.

---

## Key Architectural Difference

**CTO's Assumption:** Pages Router (`/pages/` directory)  
**Your Codebase:** App Router (`/src/app/` directory)

This fundamental difference requires adapting ALL API route and page locations.

---

## Prompt-by-Prompt Adaptations

### ✅ Prompt 1: Project Setup
**Original:** "Initialize a new Next.js project..."  
**Reality:** Project already initialized ✅

**Adaptations:**
- ~~Initialize new project~~ → Already done
- ~~Install airtable~~ → Already installed (v0.12.2)
- **NEW:** Create `.yarnrc.yml` (missing from current setup)
- **ADD:** Install `react-hook-form` (not yet installed)

**Action Items:**
```bash
# Create .yarnrc.yml
nodeLinker: node-modules

# Install missing dependency
yarn add react-hook-form
```

---

### ✅ Prompt 2: Airtable Base Configuration
**Original:** Generic Airtable setup instructions  
**Reality:** Already using Airtable with PAT token

**Adaptations:**
- Leverage existing Airtable connection pattern
- Add 3 new tables to existing base (OR create new base - CEO decision)
- Reuse environment variable pattern (`.env.local`)

**Environment Variables:**
```env
# Existing
AIRTABLE_PAT_TOKEN=patXXXXXXXX
AIRTABLE_BASE_ID=appXXXXXXXX

# New (add these)
AIRTABLE_SUBRECIPES_TABLE=SubRecipes
AIRTABLE_FINALDISHES_TABLE=FinalDishes
AIRTABLE_USDACACHE_TABLE=USDACache
USDA_API_KEY=xxxxxxxxxxxxxx
```

---

### ✅ Prompt 3: Secure Airtable Service Layer
**Original:** `/lib/airtable.ts`  
**Adapted:** `/src/lib/airtable.ts` (already exists!)

**Adaptations:**
- Extend existing `/src/lib/airtable.ts` OR create separate file
- Already using correct pattern (environment variables, server-side only)
- Add new helper functions for nutrition tables

**Options:**
1. **Extend existing file** - Add nutrition functions to current file
2. **Create new file** - `/src/lib/airtable-nutrition.ts` (cleaner separation)

**Recommendation:** Option 2 for better organization

---

### ✅ Prompt 4: Server-Side USDA API Route
**Original:** `/pages/api/usda/search.ts` (Pages Router)  
**Adapted:** `/src/app/api/usda/search/route.ts` (App Router)

**Key Changes:**
```typescript
// OLD (Pages Router)
export default async function handler(req, res) {
  // ...
}

// NEW (App Router)
export async function GET(request: NextRequest) {
  // ...
  return NextResponse.json(data)
}
```

**File Location:**
- ❌ `/pages/api/usda/search.ts`
- ✅ `/src/app/api/usda/search/route.ts`

---

### ✅ Prompt 5: Calculator Logic
**Original:** `/lib/calculator.ts`  
**Adapted:** `/src/lib/calculator.ts`

**Adaptations:**
- Path prefix change only (`/lib/` → `/src/lib/`)
- Logic remains identical
- Already have TypeScript configured ✅

**No significant changes** - just path adjustment

---

### ✅ Prompt 6: API Route for Creating Sub-Recipes
**Original:** `/pages/api/sub-recipes.ts` (Pages Router)  
**Adapted:** `/src/app/api/sub-recipes/route.ts` (App Router)

**Key Changes:**
```typescript
// OLD (Pages Router)
export default async function handler(req, res) {
  if (req.method === 'POST') {
    // handle POST
  }
}

// NEW (App Router)
export async function POST(request: NextRequest) {
  // handle POST
  return NextResponse.json(data)
}

export async function GET(request: NextRequest) {
  // handle GET (optional)
  return NextResponse.json(data)
}
```

**File Location:**
- ❌ `/pages/api/sub-recipes.ts`
- ✅ `/src/app/api/sub-recipes/route.ts`

---

### ✅ Prompt 7: Client-Side Ingredient Search Component
**Original:** Generic React component location  
**Adapted:** `/src/components/IngredientSearch.tsx`

**Adaptations:**
- Path prefix (`/src/components/`)
- Already using TypeScript ✅
- Already using Tailwind ✅
- Already have component patterns to follow

**Pattern Match:**
- Similar to existing `Header.tsx`, `PasswordGate.tsx`
- Use same import style: `import { useState } from 'react'`

---

### ✅ Prompt 8: Client-Side Sub-Recipe Builder UI
**Original:** `/pages/sub-recipes/new.tsx` (Pages Router)  
**Adapted:** `/src/app/sub-recipes/new/page.tsx` (App Router)

**Key Changes:**
```typescript
// OLD (Pages Router)
// File: /pages/sub-recipes/new.tsx
export default function NewSubRecipe() {
  return <div>...</div>
}

// NEW (App Router)
// File: /src/app/sub-recipes/new/page.tsx
export default function NewSubRecipePage() {
  return <div>...</div>
}
```

**File Location:**
- ❌ `/pages/sub-recipes/new.tsx`
- ✅ `/src/app/sub-recipes/new/page.tsx`

**Additional Files:**
- `/src/app/sub-recipes/page.tsx` (list view)
- `/src/app/sub-recipes/layout.tsx` (optional shared layout)

---

### ✅ Prompt 9: FDA-Compliant Rounding Utility
**Original:** `/utils/fdaRounding.ts`  
**Adapted:** `/src/lib/fdaRounding.ts`

**Adaptations:**
- Path change to match project structure (`/utils/` → `/src/lib/`)
- Logic identical
- TypeScript already configured ✅

**Reasoning:**
- Your project uses `/src/lib/` for utilities (see `airtable.ts`)
- Keeping utilities together improves organization

---

### ✅ Prompt 10: FDA Nutrition Label React Component
**Original:** `/components/ui/NutritionLabel.tsx`  
**Adapted:** `/src/components/NutritionLabel.tsx`

**Adaptations:**
- Path prefix (`/src/components/`)
- Flatten structure (no `/ui/` subdirectory unless needed)
- Already using Tailwind ✅

**Pattern Match:**
- Similar to existing components
- Use Tailwind classes (already configured)

---

## File Structure Comparison

### Original CTO Prompts Structure (Pages Router)
```
/
├── pages/
│   ├── api/
│   │   ├── usda/
│   │   │   └── search.ts
│   │   └── sub-recipes.ts
│   └── sub-recipes/
│       └── new.tsx
├── components/
│   └── ui/
│       └── NutritionLabel.tsx
├── lib/
│   ├── airtable.ts
│   └── calculator.ts
└── utils/
    └── fdaRounding.ts
```

### Adapted Structure (App Router - Your Codebase)
```
src/
├── app/
│   ├── api/
│   │   ├── usda/
│   │   │   └── search/
│   │   │       └── route.ts
│   │   ├── sub-recipes/
│   │   │   └── route.ts
│   │   └── final-dishes/
│   │       └── route.ts
│   ├── sub-recipes/
│   │   ├── page.tsx
│   │   └── new/
│   │       └── page.tsx
│   └── final-dishes/
│       ├── page.tsx
│       └── new/
│           └── page.tsx
├── components/
│   ├── IngredientSearch.tsx
│   └── NutritionLabel.tsx
├── lib/
│   ├── airtable.ts (existing)
│   ├── airtable-nutrition.ts (new)
│   ├── calculator.ts (new)
│   └── fdaRounding.ts (new)
└── types/
    ├── liturgist.ts (existing)
    └── nutrition.ts (new)
```

---

## API Route Pattern Changes

### Pages Router Pattern (CTO's Prompts)
```typescript
// File: /pages/api/example.ts
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const { query } = req.query
    // ...
    return res.status(200).json({ data })
  }
  
  if (req.method === 'POST') {
    const body = req.body
    // ...
    return res.status(201).json({ success: true })
  }
  
  return res.status(405).json({ error: 'Method not allowed' })
}
```

### App Router Pattern (Your Codebase)
```typescript
// File: /src/app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')
  // ...
  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  // ...
  return NextResponse.json({ success: true }, { status: 201 })
}
```

**Key Differences:**
1. Separate named exports for each method (GET, POST, etc.)
2. Use `NextRequest` and `NextResponse` instead of `NextApiRequest/Response`
3. Parse query params from URL object
4. Parse body with `await request.json()`
5. File must be named `route.ts`

---

## Page Component Pattern Changes

### Pages Router Pattern (CTO's Prompts)
```typescript
// File: /pages/sub-recipes/new.tsx
import type { NextPage } from 'next'

const NewSubRecipe: NextPage = () => {
  return <div>New Sub-Recipe</div>
}

export default NewSubRecipe
```

### App Router Pattern (Your Codebase)
```typescript
// File: /src/app/sub-recipes/new/page.tsx
export default function NewSubRecipePage() {
  return <div>New Sub-Recipe</div>
}

// Optional: Add metadata
export const metadata = {
  title: 'New Sub-Recipe',
  description: 'Create a new sub-recipe'
}
```

**Key Differences:**
1. File must be named `page.tsx` (not arbitrary name)
2. Each route segment is a folder
3. Can export metadata object for SEO
4. Can use Server Components by default (add 'use client' when needed)

---

## Import Path Changes

### CTO's Prompts
```typescript
import { calculateNutrientProfile } from '@/lib/calculator'
import { roundCalories } from '@/utils/fdaRounding'
```

### Your Codebase
```typescript
import { calculateNutrientProfile } from '@/lib/calculator'
import { roundCalories } from '@/lib/fdaRounding'
```

**Reason:** Consistent use of `/src/lib/` for all utilities

---

## Client vs Server Components

**Important:** App Router distinction that CTO's prompts don't mention

### Server Components (Default)
- Can access environment variables directly
- Can query database
- Cannot use React hooks (useState, useEffect)
- Better performance

```typescript
// File: /src/app/sub-recipes/page.tsx
// This is a SERVER component by default
export default async function SubRecipesPage() {
  const recipes = await getSubRecipes() // Can fetch directly
  return <div>...</div>
}
```

### Client Components (Opt-in)
- Must add `'use client'` directive
- Can use React hooks
- Can have interactivity
- Cannot access server-only APIs

```typescript
// File: /src/components/IngredientSearch.tsx
'use client' // <-- Required!

import { useState } from 'react'

export default function IngredientSearch() {
  const [search, setSearch] = useState('')
  return <input value={search} onChange={e => setSearch(e.target.value)} />
}
```

---

## Summary of ALL Adaptations

| Prompt | Original Path | Adapted Path | Key Changes |
|--------|---------------|--------------|-------------|
| 1 | N/A (new project) | N/A (existing) | Add `.yarnrc.yml`, install deps |
| 2 | N/A | N/A | Use existing Airtable pattern |
| 3 | `/lib/airtable.ts` | `/src/lib/airtable-nutrition.ts` | Add `src/` prefix, create new file |
| 4 | `/pages/api/usda/search.ts` | `/src/app/api/usda/search/route.ts` | App Router pattern, folder structure |
| 5 | `/lib/calculator.ts` | `/src/lib/calculator.ts` | Add `src/` prefix only |
| 6 | `/pages/api/sub-recipes.ts` | `/src/app/api/sub-recipes/route.ts` | App Router pattern, folder structure |
| 7 | `/components/...` | `/src/components/IngredientSearch.tsx` | Add `src/` prefix |
| 8 | `/pages/sub-recipes/new.tsx` | `/src/app/sub-recipes/new/page.tsx` | App Router pattern, folder structure |
| 9 | `/utils/fdaRounding.ts` | `/src/lib/fdaRounding.ts` | Move to `lib/`, add `src/` prefix |
| 10 | `/components/ui/NutritionLabel.tsx` | `/src/components/NutritionLabel.tsx` | Flatten structure, add `src/` prefix |

---

## Quick Decision Matrix

**When implementing a prompt, ask:**

1. **Is it an API route?**
   - YES → Use `/src/app/api/[name]/route.ts` pattern
   - NO → Continue

2. **Is it a page?**
   - YES → Use `/src/app/[route]/page.tsx` pattern
   - NO → Continue

3. **Is it a component?**
   - YES → Use `/src/components/[Name].tsx`
   - NO → Continue

4. **Is it a utility/helper?**
   - YES → Use `/src/lib/[name].ts`
   - NO → Continue

5. **Is it a type definition?**
   - YES → Use `/src/types/[name].ts`

---

**Last Updated:** October 22, 2025  
**Reference:** MIGRATION_PLAN.md for detailed implementation steps
