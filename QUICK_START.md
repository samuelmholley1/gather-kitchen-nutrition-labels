# 🚀 Quick Start Guide - 5 Minutes to Launch

**Total Time:** ~5 minutes  
**Automation Level:** Maximum - tables created automatically!

---

## ⚡ Your 4-Step Setup (No Manual Table Creation!)

### Step 1: Get USDA API Key (2 minutes)

1. Visit: https://fdc.nal.usda.gov/api-key-signup.html
2. Fill out form (name, email, organization, intended use)
3. Check email for API key
4. Copy the key

**Temporary:** Use `DEMO_KEY` to skip this step for now

---

### Step 2: Create Empty Airtable Base (30 seconds)

1. Go to: https://airtable.com
2. Click "+ Create" or "Add a base"
3. Choose "Start from scratch"
4. Name it: **Nutrition App**
5. Click "Create base"

**That's it!** Don't create any tables manually - the script does it for you.

---

### Step 3: Get Credentials (1 minute)

**A. Generate Personal Access Token (PAT):**

1. Go to: https://airtable.com/create/tokens
2. Click "Create new token"
3. Name: **Nutrition App**
4. Add scopes:
   - ✅ `data.records:read`
   - ✅ `data.records:write`
   - ✅ `schema.bases:read`
   - ✅ `schema.bases:write` ← **IMPORTANT: needed for table creation**
5. Add access: Select "Nutrition App" base
6. Click "Create token"
7. **COPY IT NOW** (you won't see it again!)

**B. Get Base ID:**

1. Open your "Nutrition App" base
2. Look at the URL: `https://airtable.com/appXXXXXXXXXXXXXX/...`
3. Copy the `appXXXXXXXXXXXXXX` part

---

### Step 4: Configure & Run Setup (2 minutes)

**A. Create .env.local file:**

```bash
cp .env.local.example .env.local
```

**B. Edit .env.local and add your values:**

```env
# Airtable
AIRTABLE_PAT_TOKEN=patXXXXXXXXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_SUBRECIPES_TABLE=SubRecipes
AIRTABLE_FINALDISHES_TABLE=FinalDishes
AIRTABLE_USDACACHE_TABLE=USDACache

# USDA API
USDA_API_KEY=your_api_key_or_DEMO_KEY

# Optional: Password (can skip for now)
# PASSWORD_HASH=your_hash
```

**C. Verify configuration:**

```bash
yarn verify:env
```

You should see all green checkmarks ✓

**D. Automatically create tables:**

```bash
yarn setup:airtable
```

This script will:
- ✅ Connect to your Airtable base
- ✅ Create SubRecipes table (10 fields)
- ✅ Create FinalDishes table (12 fields)
- ✅ Create USDACache table (9 fields)
- ✅ Configure all field types correctly
- ✅ Verify everything works

**Takes ~10 seconds!**

---

## 🎉 Launch the App

```bash
yarn dev
```

Open: http://localhost:3000

---

## ✅ What Just Happened?

You now have:
- ✅ Complete Airtable database with 3 tables
- ✅ All fields configured correctly
- ✅ USDA API integration ready
- ✅ Development environment running

**No manual clicking in Airtable!** Everything was automated.

---

## 🐛 Troubleshooting

### "Failed to connect to Airtable"
- Check PAT token is correct
- Verify token has `schema.bases:write` scope (needed to create tables)
- Verify token has access to your base

### "USDA_API_KEY missing"
- Use `DEMO_KEY` for development
- Or get real key from: https://fdc.nal.usda.gov/api-key-signup.html

### "Table already exists"
- Script will skip existing tables (safe to rerun)

### Need help?
- Run: `yarn verify:env` to check configuration
- See: `AIRTABLE_NUTRITION_SETUP.md` for detailed guide
- See: `USDA_API_SETUP.md` for API key help

---

## 📋 Next Steps (After Setup)

Once the app is running, you can start building recipes!

But for now, just verify everything works:

1. ✅ App loads at http://localhost:3000
2. ✅ Check Airtable - you should see 3 tables
3. ✅ You're ready for Phase 2 implementation!

---

## 🎯 Summary

**What you did:**
1. Got USDA API key (or used DEMO_KEY)
2. Created empty Airtable base (1 click)
3. Generated PAT token
4. Added 3 values to .env.local
5. Ran `yarn setup:airtable`

**What the automation did:**
- Created all tables
- Configured all fields
- Set up field types
- Verified connections
- Tested everything

**Time saved:** ~1.5 hours of manual clicking!

---

**Status:** ✅ Setup Complete  
**Time Taken:** ~5 minutes  
**Manual Work:** Minimal  
**Automation:** Maximum  

**Last Updated:** October 22, 2025
