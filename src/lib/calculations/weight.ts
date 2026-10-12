import { D, Decimal, DEFAULT_ROUNDING, type Numeric, type RoundingConfig, roundFine, roundWeight, sum } from "./decimal";

/** Net = Gross − Stone − Other. Never negative. */
export function calculateNetWeight(gross: Numeric, stone: Numeric, other: Numeric = 0): Decimal {
  const net = D(gross).minus(D(stone)).minus(D(other));
  return net.isNegative() ? new Decimal(0) : net;
}

/** Fine = Net × Touch / 100 (full internal precision, rounded only for storage). */
export function calculateFineWeight(net: Numeric, touch: Numeric, cfg: RoundingConfig = DEFAULT_ROUNDING): Decimal {
  return roundFine(D(net).times(D(touch)).dividedBy(100), cfg);
}

export type StoneUnit = "CARAT" | "GRAM" | "PIECE" | "CENT" | "CUSTOM";

export interface ConversionConfig {
  /** grams per carat — configurable, default 0.2 */
  gramsPerCarat: Numeric;
  /** 1 cent = 0.01 carat by default */
  caratsPerCent: Numeric;
  /** grams per piece when unit is PIECE or CUSTOM (usually 0 — pieces carry no mass) */
  gramsPerPiece: Numeric;
  gramsPerCustomUnit: Numeric;
}

export const DEFAULT_CONVERSION: ConversionConfig = {
  gramsPerCarat: "0.2",
  caratsPerCent: "0.01",
  gramsPerPiece: 0,
  gramsPerCustomUnit: 0,
};

export function calculateStoneWeightInGram(
  weight: Numeric,
  unit: StoneUnit,
  conv: ConversionConfig = DEFAULT_CONVERSION,
): Decimal {
  const w = D(weight);
  switch (unit) {
    case "GRAM":
      return w;
    case "CARAT":
      return w.times(D(conv.gramsPerCarat));
    case "CENT":
      return w.times(D(conv.caratsPerCent)).times(D(conv.gramsPerCarat));
    case "PIECE":
      return w.times(D(conv.gramsPerPiece));
    case "CUSTOM":
      return w.times(D(conv.gramsPerCustomUnit));
  }
}

export type StoneRateMethod = "PER_CARAT" | "PER_GRAM" | "PER_PIECE" | "FIXED" | "INCLUDED";

export interface StoneInput {
  pieces: Numeric;
  weight: Numeric;
  unit: StoneUnit;
  method: StoneRateMethod;
  rate: Numeric;
  /** Fixed amount when method = FIXED */
  fixedAmount?: Numeric;
  /** Whether this stone's weight is deducted from gross to arrive at net metal */
  deductFromGross?: boolean;
}

export interface StoneResult {
  weightGram: Decimal;
  weightCarat: Decimal;
  amount: Decimal;
  deductGram: Decimal;
}

export function calculateStone(s: StoneInput, conv: ConversionConfig = DEFAULT_CONVERSION): StoneResult {
  const weightGram = calculateStoneWeightInGram(s.weight, s.unit, conv);
  const gpc = D(conv.gramsPerCarat);
  const weightCarat = gpc.isZero() ? new Decimal(0) : weightGram.dividedBy(gpc);
  let amount = new Decimal(0);
  switch (s.method) {
    case "PER_CARAT":
      amount = weightCarat.times(D(s.rate));
      break;
    case "PER_GRAM":
      amount = weightGram.times(D(s.rate));
      break;
    case "PER_PIECE":
      amount = D(s.pieces).times(D(s.rate));
      break;
    case "FIXED":
      amount = D(s.fixedAmount ?? s.rate);
      break;
    case "INCLUDED":
      amount = new Decimal(0);
      break;
  }
  return { weightGram, weightCarat, amount, deductGram: s.deductFromGross === false ? new Decimal(0) : weightGram };
}

export function calculateStones(stones: StoneInput[], conv: ConversionConfig = DEFAULT_CONVERSION) {
  const results = stones.map((s) => calculateStone(s, conv));
  return {
    results,
    totalWeightGram: roundWeight(sum(results.map((r) => r.weightGram)), { ...DEFAULT_ROUNDING, weightDp: 4 }),
    totalDeductGram: sum(results.map((r) => r.deductGram)),
    totalAmount: sum(results.map((r) => r.amount)),
  };
}
