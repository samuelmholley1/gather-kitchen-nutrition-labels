export default function Header() {
  return (
    <header className="bg-emerald-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src="/gather_icon.png" 
              alt="Gather Kitchen" 
              className="w-8 h-8"
            />
            <h1 className="text-xl font-bold">Gather Kitchen</h1>
          </div>
          <nav className="hidden md:flex space-x-6">
            <a href="/" className="hover:text-emerald-200 transition-colors">
              Home
            </a>
            <a href="/sub-recipes" className="hover:text-emerald-200 transition-colors">
              Sub-Recipes
            </a>
            <a href="/sub-recipes/new" className="hover:text-emerald-200 transition-colors">
              New Sub-Recipe
            </a>
          </nav>
        </div>
      </div>
    </header>
  )
}