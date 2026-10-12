import { D, Decimal, DEFAULT_ROUNDING, type Numeric, type RoundingConfig, roundMoney } from "../calculations/decimal";

export interface TaxInput {
  taxableAmount: Numeric;
  /** total GST percent e.g. 3 */
  gstRate: Numeric;
  companyStateCode: string;
  placeOfSupplyStateCode: string;
}

export interface TaxResult {
  taxable: Decimal;
  intraState: boolean;
  cgstRate: Decimal;
  sgstRate: Decimal;
  igstRate: Decimal;
  cgst: Decimal;
  sgst: Decimal;
  igst: Decimal;
  totalTax: Decimal;
}

/** Intra-state → CGST + SGST (half each). Inter-state → IGST. */
export function calculateTax(i: TaxInput, cfg: RoundingConfig = DEFAULT_ROUNDING): TaxResult {
  const taxable = D(i.taxableAmount);
  const rate = D(i.gstRate);
  const intra = i.companyStateCode.trim() !== "" && i.companyStateCode === i.placeOfSupplyStateCode;
  const z = new Decimal(0);
  if (intra) {
    const half = rate.dividedBy(2);
    const cgst = roundMoney(taxable.times(half).dividedBy(100), cfg);
    const sgst = roundMoney(taxable.times(half).dividedBy(100), cfg);
    return { taxable, intraState: true, cgstRate: half, sgstRate: half, igstRate: z, cgst, sgst, igst: z, totalTax: cgst.plus(sgst) };
  }
  const igst = roundMoney(taxable.times(rate).dividedBy(100), cfg);
  return { taxable, intraState: false, cgstRate: z, sgstRate: z, igstRate: rate, cgst: z, sgst: z, igst, totalTax: igst };
}
