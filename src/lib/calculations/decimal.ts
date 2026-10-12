import Decimal from "decimal.js";

/**
 * Decimal-safe arithmetic foundation. Every weight / money / rate calculation in the
 * app goes through this module. Never use JS `number` arithmetic for business values.
 */
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };
export type Numeric = Decimal.Value;

export const ZERO = new Decimal(0);

/** Safe conversion: null / undefined / "" / NaN -> 0 */
export function D(v: Numeric | null | undefined): Decimal {
  if (v === null || v === undefined || v === "") return ZERO;
  try {
    const d = new Decimal(typeof v === "object" && "toString" in v ? v.toString() : v);
    return d.isFinite() ? d : ZERO;
  } catch {
    return ZERO;
  }
}

/** Configurable precision (spec §65). Internal precision is never reduced; only stored/displayed values are rounded. */
export interface RoundingConfig {
  weightDp: number; // 3 or 4
  fineDp: number; // 4 (never 2)
  moneyDp: number; // 2
  rateDp: number; // 4
}

export const DEFAULT_ROUNDING: RoundingConfig = { weightDp: 3, fineDp: 4, moneyDp: 2, rateDp: 4 };

export const roundWeight = (v: Numeric, c = DEFAULT_ROUNDING) => D(v).toDecimalPlaces(c.weightDp);
export const roundFine = (v: Numeric, c = DEFAULT_ROUNDING) => D(v).toDecimalPlaces(c.fineDp);
export const roundMoney = (v: Numeric, c = DEFAULT_ROUNDING) => D(v).toDecimalPlaces(c.moneyDp);
export const roundRate = (v: Numeric, c = DEFAULT_ROUNDING) => D(v).toDecimalPlaces(c.rateDp);

export const sum = (values: Numeric[]): Decimal => values.reduce<Decimal>((a, b) => a.plus(D(b)), ZERO);
