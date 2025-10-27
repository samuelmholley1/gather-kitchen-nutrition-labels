/**
 * Types for the "Report issue" flow for per-ingredient nutrition calculation flags.
 */

export type ReasonType = 'self_evident' | 'comment';

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
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  [key: string]: any;
}

export interface ReportPayload {
  recipeId: string;
  recipeName: string;
  version?: string;
  ingredients: FlaggedIngredient[];
  totals?: Totals;
  breakdownSnapshot?: BreakdownSnapshot;
  reasonType: ReasonType;
  comment?: string;
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
