const { ReportPayloadSchema } = require('./src/lib/validation/report.ts');

const payload = {
  reportId: 'report-123',
  recipeId: 'recipe-123', 
  recipeName: 'Chocolate Cake',
  version: '1.0',
  context: 'ingredient',
  ingredientId: 'ing-1',
  ingredientName: 'flour',
  reasonType: 'self_evident',
  comment: undefined,
  breakdownSnapshot: { items: [] },
  totals: { kcal: 500, carbs: 50, protein: 5, fat: 10 },
  userAgent: 'Mozilla/5.0',
  clientNonce: 'nonce-123',
};

const result = ReportPayloadSchema.safeParse(payload);
console.log('Success:', result.success);
if (!result.success) {
  console.log('Errors:');
  result.error.issues.forEach(issue => {
    console.log(`- ${issue.path.join('.')}: ${issue.message}`);
  });
}
