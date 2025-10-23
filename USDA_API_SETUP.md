# USDA FoodData Central API - Reference Guide

**Purpose:** Reference documentation for USDA API integration  
**Required For:** Ingredient search functionality  
**Cost:** FREE  
**Status:** ✅ API Key Obtained (see `CREDENTIALS.md`)  
**Last Updated:** October 22, 2025

---

## Quick Reference

✅ **API Key:** Configured in `.env.local`  
✅ **Account Details:** Documented in `CREDENTIALS.md`  
📚 **Official Docs:** https://fdc.nal.usda.gov/api-guide.html

---

## Testing Your API Key

### Quick Test in Browser

1. Click this link (API key already included):
```
https://api.nal.usda.gov/fdc/v1/foods/search?api_key=eyPAexFvLLxbfvGRq1DvS6RSDnTf6JHT1DX1ag6k&query=apple
```

2. You should see JSON response with apple products
3. ✅ If you see data, your API key is working!

**Expected Response:**
```json
{
  "totalHits": 245,
  "currentPage": 1,
  "totalPages": 25,
  "foods": [
    {
      "fdcId": 171477,
      "description": "Apple, raw, with skin",
      "dataType": "SR Legacy",
      ...
    }
  ]
}
```

---

## Step-by-Step Instructions

### Step 1: Navigate to API Key Signup

**URL:** https://fdc.nal.usda.gov/api-key-signup.html

Or:
1. Go to https://fdc.nal.usda.gov/
2. Click "API" in the top navigation
3. Click "Get an API Key" or "Sign Up for an API Key"

### Step 2: Complete the Signup Form

Fill out the following fields:

| Field | What to Enter |
|-------|---------------|
| **First Name** | Your first name |
| **Last Name** | Your last name |
| **Email Address** | Your email (will receive API key here) |
| **Organization** | "Gather Kitchen" or your business name |
| **Intended Use** | "Nutrition label calculator for food service" |

**Example Intended Use Text:**
```
I am developing a nutrition label calculator application for 
commercial kitchen use. The app will allow chefs to calculate 
accurate nutrition facts for recipes and menu items using 
USDA FoodData Central ingredient data.
```

### Step 3: Submit and Receive API Key

1. Click "Submit" or "Request API Key"
2. Check your email (usually instant, may take up to 5 minutes)
3. Email subject: "Your FoodData Central API Key"
4. Copy the API key from the email

**Example API Key Format:**
```
DEMO_KEY
```
or
```
abcdef1234567890abcdef1234567890abcdef12
```

---

## Adding API Key to Project

### Method 1: Environment Variables (Recommended)

1. Open `/Users/samuelholley/Projects/gather_kitchen_nutrition_labels/.env.local`
2. Add the following line:

```env
USDA_API_KEY=your_actual_api_key_here
```

**Full Example `.env.local`:**
```env
# Airtable Configuration
AIRTABLE_PAT_TOKEN=patXXXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXXXX
AIRTABLE_SUBRECIPES_TABLE=SubRecipes
AIRTABLE_FINALDISHES_TABLE=FinalDishes
AIRTABLE_USDACACHE_TABLE=USDACache

# USDA FoodData Central API
USDA_API_KEY=abcdef1234567890abcdef1234567890abcdef12

# Optional: Password Protection
PASSWORD_HASH=your_hashed_password
```

3. Save the file
4. Restart your development server:
```bash
yarn dev
```

### Method 2: Vercel Deployment (Production)

1. Log into Vercel dashboard
2. Select your project
3. Go to "Settings" → "Environment Variables"
4. Add new variable:
   - **Name:** `USDA_API_KEY`
   - **Value:** Your API key
   - **Environment:** Production, Preview, Development (select all)
5. Click "Save"
6. Redeploy your application

---

## API Key Limitations & Best Practices

### Rate Limits

**DEMO_KEY Limits:**
- 1,000 requests per hour per IP address
- Shared among all users of DEMO_KEY
- **NOT recommended for production**

**Personal API Key Limits:**
- Unknown exact limit (likely 1,000-10,000 requests/hour)
- Dedicated to your application
- **Required for production use**

### Best Practices

✅ **DO:**
- Get a personal API key (don't use DEMO_KEY in production)
- Cache USDA results in Airtable `USDACache` table
- Check cache before calling API
- Implement exponential backoff on rate limit errors

❌ **DON'T:**
- Share your API key publicly
- Commit API key to Git (use `.env.local`)
- Make unnecessary API calls (always check cache first)
- Use DEMO_KEY in production

### Caching Strategy

Our application implements aggressive caching:

1. **User searches for "chicken breast"**
2. App checks `USDACache` table first
3. If found: Return cached data (instant, no API call)
4. If not found: Call USDA API
5. Store result in `USDACache`
6. Return to user
7. Future searches: Use cached data

**Result:** Most searches don't hit the API at all!

---

## Testing Your API Key

### Test in Browser

1. Replace `YOUR_API_KEY` in the URL below:
```
https://api.nal.usda.gov/fdc/v1/foods/search?api_key=YOUR_API_KEY&query=chicken%20breast
```

2. Paste into browser address bar
3. You should see JSON response with food data

**Expected Response:**
```json
{
  "totalHits": 245,
  "currentPage": 1,
  "totalPages": 25,
  "foods": [
    {
      "fdcId": 171477,
      "description": "Chicken, broilers or fryers, breast, meat only, cooked, roasted",
      "dataType": "SR Legacy",
      ...
    }
  ]
}
```

### Test in Application

Once you've added the API key to `.env.local`:

1. Start the dev server: `yarn dev`
2. Navigate to the ingredient search page
3. Search for "apple"
4. If results appear: ✅ API key working!
5. If error appears: ❌ Check console for error message

**Common Errors:**

| Error Message | Solution |
|---------------|----------|
| `401 Unauthorized` | API key is invalid or missing |
| `403 Forbidden` | API key format is wrong |
| `429 Too Many Requests` | Rate limit exceeded, wait 1 hour |
| `500 Internal Server Error` | USDA API is down, try again later |

---

## USDA FoodData Central API Documentation

**Official Docs:** https://fdc.nal.usda.gov/api-guide.html

### Key Endpoints We Use

#### 1. Food Search
```
GET https://api.nal.usda.gov/fdc/v1/foods/search
```

**Parameters:**
- `api_key` (required) - Your API key
- `query` (required) - Search term (e.g., "apple")
- `dataType` (optional) - Filter by food type
  - `Foundation` - Most complete nutrient data
  - `SR Legacy` - Standard Reference (older)
  - `Survey (FNDDS)` - Food and Nutrient Database
  - `Branded` - Commercial products
- `pageSize` (optional) - Results per page (default: 50, max: 200)
- `pageNumber` (optional) - Page number (default: 1)

**Example Request:**
```javascript
const response = await fetch(
  'https://api.nal.usda.gov/fdc/v1/foods/search?' + new URLSearchParams({
    api_key: process.env.USDA_API_KEY,
    query: 'apple',
    dataType: 'Foundation',
    pageSize: '25'
  })
)
const data = await response.json()
```

#### 2. Food Details (by ID)
```
GET https://api.nal.usda.gov/fdc/v1/food/{fdcId}
```

**Parameters:**
- `api_key` (required) - Your API key
- `format` (optional) - Response format (`abridged` or `full`)

**Example:**
```
https://api.nal.usda.gov/fdc/v1/food/171477?api_key=YOUR_KEY
```

### Data Types Explained

| Data Type | Description | Completeness | Best For |
|-----------|-------------|--------------|----------|
| **Foundation** | Research-quality data | ⭐⭐⭐⭐⭐ | Generic ingredients |
| **SR Legacy** | USDA Standard Reference | ⭐⭐⭐⭐ | Common foods |
| **Survey (FNDDS)** | What Americans eat | ⭐⭐⭐ | Mixed dishes |
| **Branded** | Commercial products | ⭐⭐ | Specific brands |

**Recommendation:** Prioritize `Foundation` and `SR Legacy` for most accurate data.

---

## Troubleshooting

### Problem: "API key not working"

**Checklist:**
- [ ] API key is in `.env.local` (not `.env`)
- [ ] File is named exactly `.env.local` (not `.env.local.txt`)
- [ ] No quotes around the API key value
- [ ] No spaces in `USDA_API_KEY=value`
- [ ] Development server restarted after adding key
- [ ] API key copied correctly (no extra spaces)

### Problem: "Too Many Requests"

**Solutions:**
1. Wait 1 hour (rate limit resets)
2. Check if you're using DEMO_KEY (get personal key)
3. Verify caching is working (check Airtable `USDACache`)
4. Reduce page size in searches

### Problem: "Empty search results"

**Possible Causes:**
- Search term too specific (try broader terms)
- Typo in search term
- Food not in USDA database (try alternative name)

**Examples:**
- ❌ "Bob's Red Mill All-Purpose Flour" (too specific)
- ✅ "all purpose flour" (will return results)

### Problem: "Missing nutrient data"

**Explanation:**
Not all foods have complete nutrient profiles. Some may be missing:
- Vitamins (A, C, D, E, K)
- Minerals (Calcium, Iron, Potassium)
- Sub-nutrients (Saturated Fat, Added Sugars)

**Solution:**
- Use `Foundation` or `SR Legacy` data types (more complete)
- Accept that some nutrients may show as 0 (with footnote on label)
- Manually enter missing values (future enhancement)

---

## Support & Resources

### USDA Support
- **Email:** fdc@ars.usda.gov
- **Documentation:** https://fdc.nal.usda.gov/api-guide.html
- **FAQ:** https://fdc.nal.usda.gov/faq.html

### Our Application Support
- **Technical Issues:** Contact development team
- **Feature Requests:** See roadmap in `IMPLEMENTATION_CHECKLIST.md`
- **Bug Reports:** Submit via issue tracker

---

## Appendix: Sample API Responses

### Search Response (Abbreviated)
```json
{
  "totalHits": 245,
  "currentPage": 1,
  "totalPages": 25,
  "foods": [
    {
      "fdcId": 171477,
      "description": "Chicken, broilers or fryers, breast, meat only, cooked, roasted",
      "dataType": "SR Legacy",
      "brandOwner": "",
      "foodNutrients": [
        {
          "nutrientId": 1008,
          "nutrientName": "Energy",
          "nutrientNumber": "208",
          "unitName": "kcal",
          "value": 165
        },
        {
          "nutrientId": 1003,
          "nutrientName": "Protein",
          "nutrientNumber": "203",
          "unitName": "g",
          "value": 31.02
        }
        // ... more nutrients
      ]
    }
  ]
}
```

### Food Detail Response (Portions)
```json
{
  "fdcId": 171477,
  "description": "Chicken, broilers or fryers, breast, meat only, cooked, roasted",
  "foodPortions": [
    {
      "id": 123456,
      "amount": 0.5,
      "gramWeight": 86,
      "modifier": "breast, bone and skin removed",
      "measureUnit": {
        "id": 1234,
        "name": "breast",
        "abbreviation": "breast"
      }
    },
    {
      "id": 123457,
      "amount": 1.0,
      "gramWeight": 140,
      "modifier": "",
      "measureUnit": {
        "id": 1005,
        "name": "cup, chopped or diced",
        "abbreviation": "cup"
      }
    }
  ]
}
```

---

**Status:** ✅ Ready for API Key Acquisition  
**Next Steps:**
1. Obtain your USDA API key
2. Add to `.env.local`
3. Test in application
4. Proceed with development

**Last Updated:** October 22, 2025
