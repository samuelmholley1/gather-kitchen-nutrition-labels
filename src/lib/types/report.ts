/**
 * Types for the "Report issue" flow for per-ingredient nutrition calculation flags.
 */

export type ReasonType = 'self_evident' | 'comment';
export type ReportContext = 'recipe' | 'ingredient';

export interface FlaggedIngredient {
  id?: string;
  name: string;
  quantity: number | null;
  units: string | null;
  flagged: boolean;
}

export interface BreakdownSnapshot {
  [key: string]: any;
}

export interface Totals {
  kcal?: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  [key: string]: any;
}

export interface ReportPayload {
  reportId: string;
  recipeId: string;
  recipeName: string;
  version?: string;
  context: ReportContext;
  ingredientId?: string;
  ingredientName?: string;
  reasonType: ReasonType;
  comment?: string;
  breakdownSnapshot?: BreakdownSnapshot;
  totals?: Totals;
  userAgent?: string;
  clientNonce: string;
}

export interface ReportResponse {
  reportId: string;
}

export interface ReportError {
  error: string;
  code?: string;
}
