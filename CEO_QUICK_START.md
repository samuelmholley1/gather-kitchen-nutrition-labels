# 🚀 CEO Quick Start Guide

**Your 5-Minute Setup** (No coding required!)

---

## Step 1: Create Airtable Base

1. Go to https://airtable.com
2. Click **"Add a base"** → **"Start from scratch"**
3. Name it: **`Nutrition App`**
4. **DO NOT create any tables** (the script does this)
5. You'll see an empty base with just "Table 1" - ignore it

---

## Step 2: Get Base ID

1. Look at your browser URL - it will look like:
   ```
   https://airtable.com/appXXXXXXXXXXXXXX/tblYYYYYYYYYYYY/...
   ```

2. Copy the part starting with `app` (that's your Base ID):
   ```
   appXXXXXXXXXXXXXX
   ```

---

## Step 3: Update Environment Variable

1. Open this file in VS Code:
   ```
   .env.local
   ```

2. Find this line:
   ```bash
   AIRTABLE_BASE_ID=appBkAC9I7VUItgax
   ```

3. Replace it with YOUR new base ID:
   ```bash
   AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
   ```

4. Save the file (⌘+S on Mac)

---

## Step 4: Run Automation

1. Open VS Code terminal (View → Terminal)

2. Run this command:
   ```bash
   yarn tsx scripts/setup-airtable-base.ts
   ```

3. You should see:
   ```
   🚀 Nutrition App - Airtable Base Setup
   ========================================
   
   📋 Creating table: SubRecipes
      ✅ Created with 10 fields
   
   📋 Creating table: FinalDishes
      ✅ Created with 12 fields
   
   📋 Creating table: USDACache
      ✅ Created with 9 fields
   
   ✅ Base setup complete!
   ```

---

## Step 5: Verify

1. Go back to Airtable in your browser
2. Refresh the page (⌘+R on Mac)
3. You should now see **3 tables**:
   - SubRecipes
   - FinalDishes
   - USDACache
4. Click into each table - all fields are already created!

---

## ✅ Done!

That's it! Tell me when you've finished, and I'll continue building the rest of the app.

---

## ❓ Troubleshooting

### "Missing required environment variables"
- Check that `.env.local` has `AIRTABLE_PAT_TOKEN` and `AIRTABLE_BASE_ID`
- Make sure you saved the file after editing

### "Command not found: tsx"
- Run: `yarn install` first
- Then try again: `yarn tsx scripts/setup-airtable-base.ts`

### "Failed to create table"
- Make sure your Personal Access Token has "schema.bases:write" permission
- Check that the base ID is correct (starts with "app")

### Tables not showing up
- Refresh your Airtable browser tab
- Make sure you're looking at the correct base
- Check the URL matches your base ID

---

## 📞 Need Help?

Just paste the error message and I'll help you fix it!
