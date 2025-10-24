import { parseSmartRecipe } from './src/lib/smartRecipeParser'

const test = `Grilled Chicken
1 pound chicken (boneless, skinless breast)
4 tomatoes (fresh, organic, diced)
1 red bell pepper (diced)`

const result = parseSmartRecipe(test)

console.log("Parsed ingredients:")
result.finalDish.ingredients.forEach(ing => {
  console.log(`${ing.quantity} ${ing.unit} ${ing.ingredient}`)
})

console.log("\nErrors:", result.errors.length)
result.errors.forEach(e => console.log(`  - ${e}`))
