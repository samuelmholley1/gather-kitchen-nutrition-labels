# 🔐 Authorize PAT Token for New Base

## Issue
Your PAT token was authorized for the old base (`appJcMC1FeOF4991w`) but needs to be authorized for the new base (`appypvroUCuby2grq`).

## Quick Fix (2 minutes)

### Option 1: Add Base Access in Airtable
1. Go to: https://airtable.com/create/tokens
2. Find your token: "Gather Kitchen Nutrition Labels"
3. Click "Edit"
4. Under "Access" → "Add a base"
5. Select: **Nutrition App** (`appypvroUCuby2grq`)
6. Scopes should include:
   - ✅ `data.records:read`
   - ✅ `data.records:write`
7. Click "Save changes"

### Option 2: Create New Token (if easier)
1. Go to: https://airtable.com/create/tokens
2. Click "Create new token"
3. Name: "Nutrition App Token"
4. Add base access: **Nutrition App** (`appypvroUCuby2grq`)
5. Scopes:
   - ✅ `data.records:read`
   - ✅ `data.records:write`
6. Click "Create token"
7. Copy the token
8. Update `.env.local`:
   ```bash
   AIRTABLE_PAT_TOKEN=your_new_token_here
   ```

---

## Test Connection

After authorizing, test with:

```bash
yarn dev
# Visit http://localhost:3000/sub-recipes/new
# Try creating a sub-recipe
```

Or run the test script:

```bash
node scripts/check-airtable-access.ts
```

---

## Next: Configure Special Fields

Once authorized, follow Step 4 in `AIRTABLE_MANUAL_SETUP.md` to configure the 4 special field types.
