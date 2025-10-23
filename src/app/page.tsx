import Link from "next/link";
import Header from "@/components/Header";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      <Header />
      <main>
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20">
        <div className="max-w-5xl mx-auto text-center">
          <div className="mb-8">
            <span className="inline-block px-4 py-2 bg-emerald-100 text-emerald-800 rounded-full text-sm font-semibold mb-4">
              FDA-Compliant • USDA-Powered • Free Forever
            </span>
          </div>
          
          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            Professional Nutrition Labels
            <br />
            <span className="text-emerald-600">Made Simple</span>
          </h1>
          
          <p className="text-xl text-gray-700 mb-12 max-w-3xl mx-auto">
            Calculate accurate nutrition facts for your recipes using USDA data. 
            Generate FDA-compliant labels in seconds. Perfect for food service, 
            meal prep, and commercial kitchens.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sub-recipes/new"
              className="px-8 py-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-lg font-semibold shadow-lg hover:shadow-xl"
            >
              Create Your First Recipe
            </Link>
            
            <Link
              href="/final-dishes"
              className="px-8 py-4 bg-white text-emerald-600 border-2 border-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors text-lg font-semibold"
            >
              View Nutrition Labels
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Everything You Need for Perfect Nutrition Labels
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-8 hover:shadow-lg transition-shadow">
              <div className="text-5xl mb-4">🔬</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                USDA Database
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Search 400,000+ foods with complete nutrition data. Foundation foods, 
                SR Legacy, and branded products all in one place.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-8 hover:shadow-lg transition-shadow">
              <div className="text-5xl mb-4">⚖️</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Smart Unit Conversion
              </h3>
              <p className="text-gray-700 leading-relaxed">
                4-tier conversion system: custom ratios, USDA portions, 
                standard conversions, with cooking yield adjustments.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-8 hover:shadow-lg transition-shadow">
              <div className="text-5xl mb-4">📊</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                FDA Compliant
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Automatic rounding per 21 CFR 101.9. Professional labels 
                ready for packaging, menus, and regulatory compliance.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-8 hover:shadow-lg transition-shadow">
              <div className="text-5xl mb-4">🍽️</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Sub-Recipes
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Build component recipes (sauces, doughs, bases) once. 
                Reuse them in multiple final dishes automatically.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl p-8 hover:shadow-lg transition-shadow">
              <div className="text-5xl mb-4">✏️</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Editable Labels
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Click any nutrient value to override. Perfect for proprietary 
                ingredients or manual adjustments.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-8 hover:shadow-lg transition-shadow">
              <div className="text-5xl mb-4">📥</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Export Anywhere
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Download as PNG/JPEG, copy to clipboard, or print. 
                Perfect for packaging, menus, websites, and social media.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Three Simple Steps
          </h2>
          
          <div className="space-y-8">
            {/* Step 1 */}
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
                1
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Search USDA Ingredients
                </h3>
                <p className="text-gray-700">
                  Type any ingredient name (chicken, flour, tomatoes) and select from 
                  400,000+ foods with complete nutrition data.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
                2
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Build Your Recipe
                </h3>
                <p className="text-gray-700">
                  Add ingredients with quantities. Create sub-recipes for components 
                  you use often. Set serving sizes and cooking methods.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
                3
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Generate FDA-Compliant Label
                </h3>
                <p className="text-gray-700">
                  Get an instant nutrition label with automatic FDA rounding. 
                  Edit any value, then export as image or print.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-emerald-600 to-blue-600 rounded-2xl p-12 text-center text-white shadow-2xl">
          <h2 className="text-4xl font-bold mb-4">
            Ready to Create Professional Nutrition Labels?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Free forever. No credit card required. FDA-compliant labels in minutes.
          </p>
          <Link
            href="/sub-recipes/new"
            className="inline-block px-10 py-5 bg-white text-emerald-600 rounded-lg hover:bg-gray-100 transition-colors text-xl font-bold shadow-lg"
          >
            Get Started Now →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 border-t border-gray-200">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="font-bold text-gray-900 mb-3">Gather Kitchen</h4>
              <p className="text-gray-600 text-sm">
                Professional nutrition label calculator powered by USDA FoodData Central.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-gray-900 mb-3">Quick Links</h4>
              <div className="space-y-2 text-sm">
                <Link href="/sub-recipes" className="block text-gray-600 hover:text-emerald-600">
                  Sub-Recipes
                </Link>
                <Link href="/final-dishes" className="block text-gray-600 hover:text-emerald-600">
                  Final Dishes
                </Link>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold text-gray-900 mb-3">Resources</h4>
              <div className="space-y-2 text-sm">
                <a href="https://fdc.nal.usda.gov/" target="_blank" rel="noopener noreferrer" className="block text-gray-600 hover:text-emerald-600">
                  USDA FoodData Central
                </a>
                <a href="https://www.fda.gov/food/nutrition-facts-label" target="_blank" rel="noopener noreferrer" className="block text-gray-600 hover:text-emerald-600">
                  FDA Nutrition Labels
                </a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-8 text-center text-gray-600 text-sm">
            <p>© {new Date().getFullYear()} Gather Kitchen Nutrition Labels. Built with USDA FoodData Central API.</p>
          </div>
        </div>
      </footer>
      </main>
    </div>
  );
}
