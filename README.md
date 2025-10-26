# Gather Kitchen Nutrition Labels

A professional Next.js web application for calculating accurate nutrition facts and generating FDA-compliant nutrition labels for recipes. Features smart recipe parsing, USDA FoodData Central integration, sub-recipe support, and exportable nutrition label images (PNG/JPEG).

## 🌟 Features

### Smart Recipe Importer
- **Paste-and-Parse** - Paste entire recipes as plain text
- **Intelligent Parsing** - Automatically extracts recipe name, ingredients, and quantities
- **Sub-Recipe Detection** - Recognizes nested recipes in parentheses
  - Example: `1 cup salsa verde (1/2 cup tomatillos, 1/4 cup onions, 2 tbsp cilantro)`
- **Real-time Validation** - Live feedback as you type
- **Keyboard Shortcuts** - Ctrl/Cmd + Enter to parse

### USDA Integration
- **Live Search** - Search 1.2M+ foods from USDA FoodData Central
- **Smart Matching** - Auto-suggests best matches for ingredients
- **Comprehensive Data** - 30+ nutrients per food item
- **Manual Override** - Edit any ingredient match before saving
- **Nutrient Profiles** - Calories, macros, vitamins, minerals

### Nutrition Calculation
- **Automatic Calculation** - Precise per-serving nutrition facts
- **FDA Rounding Rules** - All nutrients rounded per 21 CFR 101.9
- **Unit Conversion** - Handles g, kg, oz, lb, cups, tbsp, tsp, ml, etc.
- **Servings Management** - Customizable serving size and servings per container
- **Sub-Recipe Scaling** - Intelligent weight-based sub-recipe calculations

### FDA-Compliant Nutrition Labels
- **Editable Labels** - Click any value to override
- **Export to PNG/JPEG** - High-quality downloadable images
- **Copy to Clipboard** - One-click paste into documents
- **Print-Friendly** - Clean print layout
- **Allergen Display** - Optional allergen warnings
- **Regulation Compliant** - Follows FDA 21 CFR 101.9

### Recipe Management
- **Sub-Recipes** - Create reusable recipe components
- **Final Dishes** - Combine sub-recipes and ingredients
- **Component Tracking** - Track what goes into each dish
- **Airtable Backend** - All data synced to cloud database
- **Version History** - Track updates and changes

## 🏗️ Technology Stack

- **Next.js 14** - React framework with App Router
- **React 18** - UI library with hooks
- **TypeScript** - Full type safety
- **Tailwind CSS** - Utility-first styling
- **Airtable** - Cloud database and backend
- **USDA FoodData Central API** - Official nutrition database
- **html2canvas / html-to-image** - Image export functionality
- **Playwright** - End-to-end testing
- **Vercel** - Production deployment

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Smart Recipe Importer (main landing)
│   ├── layout.tsx                  # Root layout
│   ├── import/
│   │   └── review/
│   │       └── page.tsx            # Review parsed recipe + USDA matching
│   ├── sub-recipes/
│   │   ├── page.tsx                # Browse all sub-recipes
│   │   ├── new/page.tsx            # Create sub-recipe manually
│   │   └── [id]/page.tsx           # View/edit sub-recipe details
│   ├── final-dishes/
│   │   ├── page.tsx                # Browse all final dishes
│   │   ├── new/page.tsx            # Create final dish manually
│   │   └── [id]/page.tsx           # View nutrition label + export
│   └── api/
│       ├── usda-search/
│       │   └── route.ts            # USDA FoodData Central proxy
│       ├── sub-recipes/
│       │   └── route.ts            # Sub-recipe CRUD operations
│       └── final-dishes/
│           └── route.ts            # Final dish CRUD operations
├── components/
│   ├── NutritionLabel.tsx          # FDA-compliant label with export
│   ├── Header.tsx                  # Site navigation
│   ├── Modal.tsx                   # Reusable modal component
│   └── Toast.tsx                   # Toast notifications
├── lib/
│   ├── airtable.ts                 # Airtable SDK wrapper
│   ├── calculator.ts               # Nutrition calculation engine
│   ├── fdaRounding.ts              # FDA rounding rules
│   ├── smartRecipeParser.ts       # Recipe text parser
│   ├── smartRecipeSaver.ts        # Save parsed recipes to DB
│   ├── usda.ts                     # USDA API integration
│   ├── retry.ts                    # Network retry logic
│   └── security.ts                 # Input validation
└── types/
    ├── nutrition.ts                # Core nutrition type definitions
    └── recipe.ts                   # Recipe and USDA types

tests/
├── navigation.spec.ts              # Basic navigation tests
├── smart-recipe-importer.spec.ts  # Recipe parsing tests
├── usda-search.spec.ts            # USDA search tests
└── README.md                       # Testing documentation
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Airtable account (free tier works)
- USDA FoodData Central API key (free)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/samuelmholley1/gather-kitchen-nutrition-labels.git
   cd gather-kitchen-nutrition-labels
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   
   Create `.env.local` in the root directory:
   ```env
   # Airtable Configuration
   AIRTABLE_PAT_TOKEN=your_personal_access_token_here
   AIRTABLE_BASE_ID=your_base_id_here
   
   # USDA FoodData Central API
   USDA_API_KEY=your_usda_api_key_here
   ```

4. **Set up Airtable base**
   
   Run the setup script to create tables automatically:
   ```bash
   npm run setup:airtable
   ```
   
   Or follow manual setup instructions in `AIRTABLE_SETUP.md`

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm test` - Run Playwright tests
- `npm run test:ui` - Run tests in UI mode
- `npm run setup:airtable` - Initialize Airtable tables

## 🗄️ Airtable Setup

### Required Tables

Your Airtable base needs three tables:

#### 1. `SubRecipes`
Stores reusable recipe components (e.g., "Salsa Verde", "Pizza Dough")

| Field Name | Field Type | Notes |
|------------|------------|-------|
| Name | Single line text | Sub-recipe name |
| Ingredients | Long text (JSON) | Array of ingredient objects |
| RawWeight | Number | Total weight before cooking (grams) |
| FinalWeight | Number | Total weight after cooking (grams) |
| YieldPercentage | Number | Cooking yield % (default 100) |
| ServingSize | Number | Grams per serving |
| ServingsPerRecipe | Number | Total servings |
| NutritionProfile | Long text (JSON) | Nutrient data |
| Category | Single select | Component, Sauce, Base, etc. |
| Notes | Long text | Optional notes |
| CreatedAt | Date | Auto-timestamp |
| UpdatedAt | Date | Auto-timestamp |

#### 2. `FinalDishes`
Complete recipes ready for nutrition labels

| Field Name | Field Type | Notes |
|------------|------------|-------|
| Name | Single line text | Dish name |
| Components | Long text (JSON) | Ingredients + sub-recipes |
| TotalWeight | Number | Total weight (grams) |
| ServingSize | Number | Grams per serving |
| ServingsPerContainer | Number | Total servings |
| NutritionLabel | Long text (JSON) | Per-serving nutrition |
| SubRecipeLinks | Link to SubRecipes | Linked sub-recipes |
| Status | Single select | Draft, Published |
| Notes | Long text | Optional notes |
| CreatedAt | Date | Auto-timestamp |

#### 3. `ConversionFactors` (Optional)
Custom unit conversions for specific ingredients

| Field Name | Field Type | Notes |
|------------|------------|-------|
| IngredientName | Single line text | e.g., "flour" |
| Unit | Single line text | e.g., "cup" |
| GramsPerUnit | Number | e.g., 120 |

### Getting Credentials

#### Airtable PAT Token
1. Visit https://airtable.com/create/tokens
2. Click "Create new token"
3. Name it "Gather Kitchen Nutrition Labels"
4. Add scopes: `data.records:read` and `data.records:write`
5. Add access to your base
6. Copy the token to `.env.local`

#### Airtable Base ID
1. Visit https://airtable.com/api
2. Click on your base
3. Find the Base ID (starts with `app...`)
4. Copy to `.env.local`

See `AIRTABLE_SETUP.md` for detailed instructions.

## 🌐 USDA API Setup

### Getting Your API Key

1. **Sign up for free**
   Visit: https://fdc.nal.usda.gov/api-key-signup.html

2. **Fill out the form**
   - Email address
   - Organization: "Gather Kitchen" or your business name
   - Reason: "Nutrition label generation for recipes"

3. **Check your email**
   You'll receive your API key immediately

4. **Add to `.env.local`**
   ```env
   USDA_API_KEY=your_key_here
   ```

### API Limits

- **Free tier**: 1,000 requests/hour
- **Rate limiting**: Built-in retry logic with exponential backoff
- **Caching**: Considered for future optimization

See `USDA_API_SETUP.md` for detailed documentation.

## 🌐 Deployment

### Vercel (Recommended)

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Visit https://vercel.com
   - Import your GitHub repository
   - Add environment variables
   - Deploy!

### Environment Variables for Production

Add these in Vercel dashboard:

```env
AIRTABLE_PAT_TOKEN=your_token
AIRTABLE_BASE_ID=your_base_id
USDA_API_KEY=your_api_key
```

See `VERCEL_DEPLOYMENT.md` for step-by-step guide.

## � Key Features Explained

### Smart Recipe Parser

Paste recipes in natural language:

```
Chicken Tacos

2 cups shredded chicken
1 cup salsa verde (1/2 cup tomatillos, 1/4 cup onions, 2 tbsp cilantro)
8 corn tortillas
1/2 cup cheese
```

The parser automatically:
- ✅ Extracts recipe name ("Chicken Tacos")
- ✅ Identifies 4 top-level ingredients
- ✅ Detects 1 sub-recipe ("salsa verde") with 3 components
- ✅ Parses quantities and units for each ingredient

### USDA Integration Workflow

1. **Parse recipe** → Extract ingredients
2. **Search USDA** → Auto-query FoodData Central
3. **Review matches** → Confirm or change selections
4. **Calculate nutrition** → Aggregate all nutrient data
5. **Generate label** → FDA-compliant formatting

### Nutrition Label Export

The `NutritionLabel` component generates professional labels:

```tsx
<NutritionLabel
  dishName="Chicken Tacos"
  servingSize="2 tacos (240g)"
  servingsPerContainer={4}
  nutrients={calculatedNutrients}
  allergens={['Milk', 'Wheat']}
/>
```

**Export options:**
- 📥 Download PNG (high-res, transparent background)
- 📥 Download JPEG (smaller file size)
- 📋 Copy to clipboard (paste anywhere)
- 🖨️ Print (clean layout)

See `NUTRITION_LABEL_DOCS.md` for full documentation.

## 📖 Documentation Files

- `AIRTABLE_SETUP.md` - Detailed Airtable configuration
- `USDA_API_SETUP.md` - USDA FoodData Central setup
- `NUTRITION_LABEL_DOCS.md` - NutritionLabel component docs
- `VERCEL_DEPLOYMENT.md` - Deployment guide
- `TESTING_SUMMARY.md` - Test coverage and strategy
- `SUB_RECIPE_LOGIC.md` - Sub-recipe calculation logic
- `PRODUCTION_READY.md` - Launch checklist

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Run in headed mode (see browser)
npm run test:headed

# Debug mode
npm run test:debug
```

### Test Coverage

- ✅ Navigation and routing
- ✅ Smart recipe parser
- ✅ USDA search integration
- ✅ Error handling
- ✅ Edge cases (empty inputs, malformed recipes)

See `tests/README.md` for test documentation.

## 🔒 Security & Privacy

- **API Keys Protected** - Never commit `.env.local` (already in `.gitignore`)
- **Input Validation** - All user input sanitized and validated
- **Rate Limiting** - USDA API calls throttled to prevent abuse
- **Error Handling** - Graceful degradation on API failures
- **HTTPS Required** - Clipboard API requires secure context in production

## 🐛 Troubleshooting

### "Cannot connect to Airtable"
- ✅ Check PAT token is valid and has correct scopes
- ✅ Verify Base ID is correct (starts with `app...`)
- ✅ Ensure tables exist in your base

### "USDA search not working"
- ✅ Verify API key is set in `.env.local`
- ✅ Check you haven't exceeded rate limits (1,000/hour)
- ✅ Test API key at https://fdc.nal.usda.gov/api-guide.html

### "Nutrition calculation seems wrong"
- ✅ Verify ingredient quantities and units are correct
- ✅ Check USDA food matches are accurate
- ✅ Confirm serving size is set correctly
- ✅ Review sub-recipe scaling calculations

### "Label export not working"
- ✅ Ensure `html2canvas` or `html-to-image` is installed
- ✅ Check browser console for errors
- ✅ Try different export format (PNG vs JPEG)
- ✅ Verify no browser extensions blocking canvas access

### "Tests failing"
- ✅ Run `npm install` to ensure dependencies are current
- ✅ Check Playwright browsers are installed: `npx playwright install`
- ✅ Verify `.env.local` has test credentials
- ✅ Check test reports in `playwright-report/`

## 🔮 Future Enhancements

Potential features for future releases:

### Recipe Features
- 📸 Photo upload for dishes
- 📝 Ingredient list on label export
- 🔄 Recipe versioning and change history
- 📊 Batch label export (generate 100+ labels at once)
- 🏷️ Custom branding/themes for labels
- 📧 Email nutrition labels directly

### Calculation Features
- 🍳 Cooking loss calculations (evaporation, fat rendering)
- 📐 More unit conversions (international units)
- 🧂 Salt equivalency calculations
- 💊 Supplement facts labels (vitamins, minerals)
- 🥤 Beverage-specific labels

### Data Management
- ☁️ Recipe import/export (JSON, CSV)
- 🔍 Advanced search and filtering
- 📱 Mobile app (React Native)
- 🌐 Multi-language support
- 👥 Team collaboration features

### Integrations
- 🔗 Google Sheets sync
- 📅 Google Calendar meal planning
- 🛒 Shopping list generation
- 📧 SendGrid email integration
- 💬 Slack notifications

## 📞 Contact

**Gather Kitchen**  
**Developer:** Samuel Holley  
**Repository:** [github.com/samuelmholley1/gather-kitchen-nutrition-labels](https://github.com/samuelmholley1/gather-kitchen-nutrition-labels)

## 📄 License

Private - For Gather Kitchen use

---

**Built for accurate nutrition labeling and FDA compliance** 🥗💪

## 🎯 Quick Links

- [Smart Recipe Importer Guide](INGREDIENT_SPECIFICATION_PLAN.md)
- [Sub-Recipe Logic](SUB_RECIPE_LOGIC.md)
- [FDA Compliance](NUTRITION_LABEL_DOCS.md)
- [Testing Guide](tests/README.md)
- [Production Checklist](PRODUCTION_READY.md)
````