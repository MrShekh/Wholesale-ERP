import { D, Decimal, DEFAULT_ROUNDING, type Numeric, type RoundingConfig, roundFine, roundMoney, roundWeight, sum } from "./decimal";
import { calculateFineWeight, calculateNetWeight, calculateStones, DEFAULT_CONVERSION, type ConversionConfig, type StoneInput } from "./weight";
import { calculateGoldValue, calculateMakingCharge, type MakingType } from "./pricing";
import { calculateTax } from "../tax/gst";

export type BillingMode = "MONEY" | "METAL";

export interface SaleItemInput {
  pieces: Numeric;
  grossWeight: Numeric;
  /** Manual stone weight (g). Ignored when `stones` is supplied. */
  stoneWeight?: Numeric;
  otherWeight?: Numeric;
  /** Permissioned manual override of net weight */
  netWeightOverride?: Numeric | null;
  stones?: StoneInput[];
  touch: Numeric;
  goldRate: Numeric;
  makingType: MakingType;
  makingRate: Numeric;
  makingAmount?: Numeric;
  stoneAmount?: Numeric;
  otherCharges?: Numeric;
  discount?: Numeric;
}

export interface SaleOptions {
  mode: BillingMode;
  gstRate: Numeric;
  companyStateCode: string;
  placeOfSupplyStateCode: string;
  /** In METAL mode, also levy GST on the notional gold value (legally common). Default false. */
  taxMetalValueInMetalMode?: boolean;
  /** Round invoice total to nearest rupee and record the round-off */
  roundOffToRupee?: boolean;
  rounding?: RoundingConfig;
  conversion?: ConversionConfig;
}

export interface SaleItemResult {
  pieces: Decimal;
  grossWeight: Decimal;
  stoneWeight: Decimal;
  otherWeight: Decimal;
  netWeight: Decimal;
  touch: Decimal;
  fineWeight: Decimal;
  goldRate: Decimal;
  goldValue: Decimal; // notional metal value (always computed, so profit & conversions work)
  makingAmount: Decimal;
  stoneAmount: Decimal;
  otherCharges: Decimal;
  discount: Decimal;
  /** goldValue billed in money (0 in METAL mode) */
  billedGoldValue: Decimal;
  taxableAmount: Decimal;
}

export interface SaleTotals {
  items: SaleItemResult[];
  pieces: Decimal;
  grossWeight: Decimal;
  stoneWeight: Decimal;
  otherWeight: Decimal;
  netWeight: Decimal;
  fineWeight: Decimal;
  goldValue: Decimal;
  makingAmount: Decimal;
  stoneAmount: Decimal;
  otherCharges: Decimal;
  discount: Decimal;
  taxableAmount: Decimal;
  cgst: Decimal;
  sgst: Decimal;
  igst: Decimal;
  gstAmount: Decimal;
  roundOff: Decimal;
  grandTotal: Decimal;
  /** Fine gold added to customer's metal ledger (debit). 0 in MONEY mode. */
  metalLedgerDebit: Decimal;
  /** Amount added to customer's money ledger (debit). */
  moneyLedgerDebit: Decimal;
}

export function calculateSaleItem(i: SaleItemInput, o: SaleOptions): SaleItemResult {
  const cfg = o.rounding ?? DEFAULT_ROUNDING;
  const conv = o.conversion ?? DEFAULT_CONVERSION;
  const stoneCalc = i.stones?.length ? calculateStones(i.stones, conv) : null;
  const stoneWeightForNet = stoneCalc ? stoneCalc.totalDeductGram : D(i.stoneWeight);
  const stoneWeightDisplay = stoneCalc ? stoneCalc.totalWeightGram : D(i.stoneWeight);
  const stoneAmount = stoneCalc ? stoneCalc.totalAmount.plus(D(i.stoneAmount)) : D(i.stoneAmount);

  const computedNet = calculateNetWeight(i.grossWeight, stoneWeightForNet, i.otherWeight);
  const net = i.netWeightOverride !== null && i.netWeightOverride !== undefined ? D(i.netWeightOverride) : computedNet;
  const fine = calculateFineWeight(net, i.touch, cfg);
  const goldValue = calculateGoldValue(net, i.goldRate);
  const making = calculateMakingCharge({
    type: i.makingType,
    rate: i.makingRate,
    netWeight: net,
    pieces: i.pieces,
    goldValue,
    amount: i.makingAmount,
  });

  const billedGold = o.mode === "MONEY" ? goldValue : new Decimal(0);
  const taxGold = o.mode === "MONEY" ? goldValue : o.taxMetalValueInMetalMode ? goldValue : new Decimal(0);
  const other = D(i.otherCharges);
  const discount = D(i.discount);
  const charges = making.plus(stoneAmount).plus(other);
  const taxable = roundMoney(taxGold.plus(charges).minus(discount), cfg);

  return {
    pieces: D(i.pieces),
    grossWeight: D(i.grossWeight),
    stoneWeight: stoneWeightDisplay,
    otherWeight: D(i.otherWeight),
    netWeight: roundWeight(net, { ...cfg, weightDp: 4 }),
    touch: D(i.touch),
    fineWeight: fine,
    goldRate: D(i.goldRate),
    goldValue: roundMoney(goldValue, cfg),
    makingAmount: roundMoney(making, cfg),
    stoneAmount: roundMoney(stoneAmount, cfg),
    otherCharges: roundMoney(other, cfg),
    discount: roundMoney(discount, cfg),
    billedGoldValue: roundMoney(billedGold, cfg),
    taxableAmount: taxable,
  };
}

export function calculateSaleTotals(inputs: SaleItemInput[], o: SaleOptions): SaleTotals {
  const cfg = o.rounding ?? DEFAULT_ROUNDING;
  const items = inputs.map((i) => calculateSaleItem(i, o));
  const col = (f: (r: SaleItemResult) => Decimal) => sum(items.map(f));

  const taxable = col((r) => r.taxableAmount);
  const tax = calculateTax(
    { taxableAmount: taxable, gstRate: o.gstRate, companyStateCode: o.companyStateCode, placeOfSupplyStateCode: o.placeOfSupplyStateCode },
    cfg,
  );
  const preRound = taxable.plus(tax.totalTax);
  const grand = o.roundOffToRupee ? preRound.toDecimalPlaces(0) : preRound;
  const fine = roundFine(col((r) => r.fineWeight), cfg);

  return {
    items,
    pieces: col((r) => r.pieces),
    grossWeight: col((r) => r.grossWeight),
    stoneWeight: col((r) => r.stoneWeight),
    otherWeight: col((r) => r.otherWeight),
    netWeight: col((r) => r.netWeight),
    fineWeight: fine,
    goldValue: col((r) => r.goldValue),
    makingAmount: col((r) => r.makingAmount),
    stoneAmount: col((r) => r.stoneAmount),
    otherCharges: col((r) => r.otherCharges),
    discount: col((r) => r.discount),
    taxableAmount: taxable,
    cgst: tax.cgst,
    sgst: tax.sgst,
    igst: tax.igst,
    gstAmount: tax.totalTax,
    roundOff: grand.minus(preRound),
    grandTotal: roundMoney(grand, cfg),
    metalLedgerDebit: o.mode === "METAL" ? fine : new Decimal(0),
    moneyLedgerDebit: roundMoney(grand, cfg),
  };
}
