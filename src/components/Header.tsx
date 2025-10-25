export default function Header() {
  return (
    <header className="bg-emerald-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <a href="/" className="hover:opacity-80 transition-opacity">
              <img 
                src="/gather_logo.png" 
                alt="Gather Kitchen" 
                className="h-10 w-auto"
              />
            </a>
          </div>
          <nav className="hidden md:flex space-x-6">
            <a href="/" className="hover:text-emerald-200 transition-colors font-semibold">
              🚀 Smart Import
            </a>
            <a href="/sub-recipes/new" className="hover:text-emerald-200 transition-colors">
              Manual Import
            </a>
            <a href="/sub-recipes" className="hover:text-emerald-200 transition-colors">
              Sub-Recipes
            </a>
            <a href="/final-dishes" className="hover:text-emerald-200 transition-colors">
              Final Dishes
            </a>
          </nav>
        </div>
      </div>
    </header>
  )
}