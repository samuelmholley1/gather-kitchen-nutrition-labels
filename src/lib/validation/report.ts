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
  recipeId: z.string().min(1, 'Recipe ID required'),
  recipeName: z.string().min(1, 'Recipe name required'),
  version: z.string().optional(),
  ingredients: z
    .array(FlaggedIngredientSchema)
    .min(1, 'At least one ingredient is required')
    .refine(
      (ingredients: any[]) => ingredients.some((ing) => ing.flagged === true),
      'At least one ingredient must be flagged'
    ),
  totals: TotalsSchema,
  breakdownSnapshot: BreakdownSnapshotSchema,
  reasonType: z.enum(['self_evident', 'comment']),
  comment: z
    .string()
    .max(2000, 'Comment must be 2000 characters or less')
    .optional(),
  userAgent: z.string().optional(),
  clientNonce: z.string().min(1, 'Client nonce required'),
})
  // Validate that if reasonType is 'comment', comment must be provided
  .refine(
    (data: any) => {
      if (data.reasonType === 'comment') {
        return data.comment && data.comment.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Comment is required when reason type is "comment"',
      path: ['comment'],
    }
  );

export type ReportPayloadType = z.infer<typeof ReportPayloadSchema>;
