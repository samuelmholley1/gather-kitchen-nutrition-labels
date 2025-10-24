import { parseSmartRecipe } from './src/lib/smartRecipeParser.ts';

console.log('Test 1: 1 chicken (boneless, skinless breast)');
const result1 = parseSmartRecipe('Test Recipe\n1 chicken (boneless, skinless breast)');
console.log('Ingredient:', result1.ingredients[0].ingredient);
console.log('Expected: boneless skinless chicken breast\n');

console.log('Test 2: 4 tomatoes (fresh, organic, diced)');
const result2 = parseSmartRecipe('Test Recipe\n4 tomatoes (fresh, organic, diced)');
console.log('Ingredient:', result2.ingredients[0].ingredient);
console.log('Expected: fresh organic diced tomatoes\n');

console.log('Test 3: 1 red bell pepper (diced)');
const result3 = parseSmartRecipe('Test Recipe\n1 red bell pepper (diced)');
console.log('Ingredient:', result3.ingredients[0].ingredient);
console.log('Expected: red diced bell pepper\n');

console.log('Test 4: 1 cup salsa (tomato, cilantro, onions)');
const result4 = parseSmartRecipe('Test Recipe\n1 cup salsa (tomato, cilantro, onions)');
if (result4.ingredients[0].error) {
  console.log('✅ Validation error:', result4.ingredients[0].error);
} else {
  console.log('❌ Should have validation error');
}
