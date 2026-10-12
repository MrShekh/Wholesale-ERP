import { D, Decimal, type Numeric } from "./decimal";

export type MakingType = "PER_GRAM" | "PER_PIECE" | "PERCENT" | "FIXED" | "CUSTOM";

export interface MakingInput {
  type: MakingType;
  rate: Numeric;
  netWeight: Numeric;
  pieces: Numeric;
  /** needed for PERCENT: gold value (net × rate) */
  goldValue: Numeric;
  /** for FIXED / CUSTOM: explicit amount */
  amount?: Numeric;
}

export function calculateMakingCharge(m: MakingInput): Decimal {
  switch (m.type) {
    case "PER_GRAM":
      return D(m.netWeight).times(D(m.rate));
    case "PER_PIECE":
      return D(m.pieces).times(D(m.rate));
    case "PERCENT":
      return D(m.goldValue).times(D(m.rate)).dividedBy(100);
    case "FIXED":
      return D(m.amount ?? m.rate);
    case "CUSTOM":
      return D(m.amount);
  }
}

/** Gold value = Net weight × rate per gram (rate is for the item's purity). */
export function calculateGoldValue(netWeight: Numeric, ratePerGram: Numeric): Decimal {
  return D(netWeight).times(D(ratePerGram));
}
