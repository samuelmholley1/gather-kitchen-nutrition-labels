/**
 * Zod validation schema for report issue payload.
 */

import { z } from 'zod';

export const FlaggedIngredientSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Ingredient name required'),
  quantity: z.number().nullable().optional(),
  units: z.string().nullable().optional(),
  flagged: z.boolean(),
});

export const TotalsSchema = z.record(z.string(), z.any()).optional();

export const BreakdownSnapshotSchema = z.record(z.string(), z.any()).optional();

export const ReportPayloadSchema = z.object({
  reportId: z.string().min(1, 'Report ID required'),
  recipeId: z.string().min(1, 'Recipe ID required'),
  recipeName: z.string().min(1, 'Recipe name required'),
  version: z.string().optional(),
  context: z.enum(['recipe', 'ingredient']),
  ingredientId: z.string().optional(),
  ingredientName: z.string().optional(),
  reasonType: z.enum(['usda_wrong', 'quantity_mismatch', 'wrong_match', 'calculation_error', 'unit_conversion', 'duplicate_missing', 'yield_adjustment', 'other']),
  comment: z
    .string()
    .max(2000, 'Comment must be 2000 characters or less')
    .optional(),
  ccInfoGather: z.boolean().optional().default(false),
  breakdownSnapshot: BreakdownSnapshotSchema,
  totals: TotalsSchema,
  userAgent: z.string().optional(),
  clientNonce: z.string().min(1, 'Client nonce required'),
})
  // Validate that if context is 'ingredient', ingredientId and ingredientName are required
  .refine(
    (data) => {
      if (data.context === 'ingredient') {
        return data.ingredientId && data.ingredientName;
      }
      return true;
    },
    {
      message: 'ingredientId and ingredientName are required when context is "ingredient"',
      path: ['ingredientId'],
    }
  )
  // Validate that if reasonType is 'other', comment must be provided and non-empty
  .refine(
    (data) => {
      if (data.reasonType === 'other') {
        return data.comment && data.comment.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Comment is required when reason type is "other"',
      path: ['comment'],
    }
  );

export type ReportPayloadType = z.infer<typeof ReportPayloadSchema>;
