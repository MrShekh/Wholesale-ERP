import { describe, expect, it } from "vitest";
import { calculateNetWeight, calculateFineWeight, calculateStoneWeightInGram, calculateStones } from "./weight";
import { calculateMakingCharge, calculateGoldValue } from "./pricing";
import { calculateSaleTotals, type SaleItemInput } from "./sale";
import { calculateTax } from "../tax/gst";
import {
  calculateApprovalSplit, calculateCustomerBalance, calculateGoldReceipt, calculateRateFixing,
  calculateReturnLine, reverseEntry, BusinessError,
} from "../accounting/rules";
import { D, roundMoney } from "./decimal";

describe("weights", () => {
  it("net = gross - stone - other", () => {
    expect(calculateNetWeight("12.5", "2", "0.3").toString()).toBe("10.2");
    expect(calculateNetWeight("20", "2", "1").toString()).toBe("17");
  });
  it("never negative", () => expect(calculateNetWeight(1, 5, 0).toString()).toBe("0"));
  it("fine = net × touch / 100", () => {
    expect(calculateFineWeight("17", "75").toString()).toBe("12.75");
    expect(calculateFineWeight("20", "75").toString()).toBe("15");
    expect(calculateFineWeight("10", "92").toString()).toBe("9.2");
    expect(calculateFineWeight("18", "75").toString()).toBe("13.5");
  });
  it("custom touch keeps 4 dp, no 2dp rounding", () => {
    expect(calculateFineWeight("10.333", "91.6").toFixed(4)).toBe("9.4650");
    expect(calculateFineWeight("1.2345", "58.5").toFixed(4)).toBe("0.7222");
  });
  it("avoids float errors", () => expect(calculateNetWeight("0.3", "0.1", "0.1").toString()).toBe("0.1"));
});

describe("stones", () => {
  it("carat → gram (0.2)", () => expect(calculateStoneWeightInGram("2.5", "CARAT").toString()).toBe("0.5"));
  it("configurable conversion", () => expect(calculateStoneWeightInGram("2", "CARAT", { gramsPerCarat: "0.25", caratsPerCent: "0.01", gramsPerPiece: 0, gramsPerCustomUnit: 0 }).toString()).toBe("0.5"));
  it("cent", () => expect(calculateStoneWeightInGram("50", "CENT").toString()).toBe("0.1"));
  it("multiple stones with different methods", () => {
    const r = calculateStones([
      { pieces: 10, weight: "1", unit: "CARAT", method: "PER_CARAT", rate: 40000 },
      { pieces: 20, weight: "0.5", unit: "GRAM", method: "PER_PIECE", rate: 50 },
      { pieces: 1, weight: "0.4", unit: "GRAM", method: "FIXED", rate: 0, fixedAmount: 700 },
      { pieces: 5, weight: "0.1", unit: "GRAM", method: "INCLUDED", rate: 0, deductFromGross: false },
    ]);
    expect(r.totalAmount.toString()).toBe("41700");
    expect(r.totalWeightGram.toString()).toBe("1.2");
    expect(r.totalDeductGram.toString()).toBe("1.1");
  });
});

describe("making & gold value", () => {
  const base = { netWeight: 20, pieces: 50, goldValue: 160000 };
  it("per gram", () => expect(calculateMakingCharge({ ...base, type: "PER_GRAM", rate: 500 }).toString()).toBe("10000"));
  it("per piece", () => expect(calculateMakingCharge({ ...base, type: "PER_PIECE", rate: 200 }).toString()).toBe("10000"));
  it("percent", () => expect(calculateMakingCharge({ ...base, type: "PERCENT", rate: 8 }).toString()).toBe("12800"));
  it("fixed / custom", () => {
    expect(calculateMakingCharge({ ...base, type: "FIXED", rate: 750 }).toString()).toBe("750");
    expect(calculateMakingCharge({ ...base, type: "CUSTOM", rate: 0, amount: 1234.5 }).toString()).toBe("1234.5");
  });
  it("gold value", () => expect(calculateGoldValue(20, 8000).toString()).toBe("160000"));
});

describe("tax", () => {
  it("intra-state splits CGST/SGST", () => {
    const t = calculateTax({ taxableAmount: 190000, gstRate: 3, companyStateCode: "27", placeOfSupplyStateCode: "27" });
    expect(t.cgst.toString()).toBe("2850");
    expect(t.sgst.toString()).toBe("2850");
    expect(t.igst.toString()).toBe("0");
  });
  it("inter-state uses IGST", () => {
    const t = calculateTax({ taxableAmount: 190000, gstRate: 3, companyStateCode: "27", placeOfSupplyStateCode: "24" });
    expect(t.igst.toString()).toBe("5700");
    expect(t.cgst.toString()).toBe("0");
  });
});

describe("sale totals", () => {
  const item: SaleItemInput = {
    pieces: 10, grossWeight: 20, stoneWeight: 0, otherWeight: 0, touch: 75,
    goldRate: 8000, makingType: "FIXED", makingRate: 10000, stoneAmount: 20000,
  };
  const opts = { gstRate: 3, companyStateCode: "27", placeOfSupplyStateCode: "27" };

  it("MONEY mode: spec example ₹1,90,000 taxable", () => {
    const t = calculateSaleTotals([item], { ...opts, mode: "MONEY" });
    expect(t.goldValue.toString()).toBe("160000");
    expect(t.taxableAmount.toString()).toBe("190000");
    expect(t.gstAmount.toString()).toBe("5700");
    expect(t.grandTotal.toString()).toBe("195700");
    expect(t.metalLedgerDebit.toString()).toBe("0");
  });

  it("METAL mode: gold and money stay separate", () => {
    const t = calculateSaleTotals([item], { ...opts, mode: "METAL" });
    expect(t.fineWeight.toString()).toBe("15");
    expect(t.metalLedgerDebit.toString()).toBe("15");
    expect(t.taxableAmount.toString()).toBe("30000");
    expect(t.moneyLedgerDebit.toString()).toBe("30900");
  });

  it("METAL mode can optionally tax metal value", () => {
    const t = calculateSaleTotals([item], { ...opts, mode: "METAL", taxMetalValueInMetalMode: true });
    expect(t.taxableAmount.toString()).toBe("190000");
    expect(t.moneyLedgerDebit.toString()).toBe("195700");
  });

  it("spec §68 example: gross 20, stone 2, touch 75 → fine 13.5, making 9000, stone 20000", () => {
    const t = calculateSaleTotals([{ ...item, stoneWeight: 2, makingType: "FIXED", makingRate: 9000 }], { ...opts, mode: "METAL" });
    expect(t.netWeight.toString()).toBe("18");
    expect(t.fineWeight.toString()).toBe("13.5");
    expect(t.makingAmount.toString()).toBe("9000");
    expect(t.stoneAmount.toString()).toBe("20000");
  });

  it("discount reduces taxable; round-off recorded", () => {
    const t = calculateSaleTotals([{ ...item, discount: 1000.4 }], { ...opts, mode: "MONEY", roundOffToRupee: true });
    expect(t.taxableAmount.toString()).toBe("188999.6");
    expect(t.gstAmount.toString()).toBe("5669.98");
    expect(t.grandTotal.toFixed(2)).toBe("194670.00");
    expect(t.roundOff.toFixed(2)).toBe("0.42");
  });

  it("net override honoured", () => {
    const t = calculateSaleTotals([{ ...item, netWeightOverride: 19.5 }], { ...opts, mode: "METAL" });
    expect(t.netWeight.toString()).toBe("19.5");
  });

  it("decimal rounding is half-up with 2dp money", () => {
    expect(roundMoney("10.005").toString()).toBe("10.01");
    expect(roundMoney("10.004").toString()).toBe("10");
  });
});

describe("balances, receipts, rate fixing", () => {
  it("customer balance ignores cancelled entries", () => {
    const bal = calculateCustomerBalance("10", [
      { debit: "15", credit: 0 },
      { debit: 0, credit: "9.2" },
      { debit: "100", credit: 0, status: "CANCELLED" },
    ]);
    expect(bal.toString()).toBe("15.8");
  });
  it("gold receipt 10g @ 92 = 9.2g fine", () => expect(calculateGoldReceipt(10, 92).fineWeight.toString()).toBe("9.2"));
  it("rate fixing 50g @ 8000 = ₹4,00,000", () => {
    const r = calculateRateFixing(50, 50, 8000);
    expect(r.amount.toString()).toBe("400000");
    expect(r.remainingGoldDue.toString()).toBe("0");
  });
  it("partial rate fixing 40 of 100", () => {
    const r = calculateRateFixing(100, 40, 8000);
    expect(r.remainingGoldDue.toString()).toBe("60");
    expect(r.amount.toString()).toBe("320000");
  });
  it("rejects over fixing & invalid input", () => {
    expect(() => calculateRateFixing(10, 20, 8000)).toThrow(BusinessError);
    expect(() => calculateRateFixing(10, 0, 8000)).toThrow(BusinessError);
  });
  it("cancellation reversal swaps debit/credit and nets to zero", () => {
    const orig = { debit: "195700", credit: 0 };
    const rev = reverseEntry(orig);
    expect(calculateCustomerBalance(0, [orig, rev]).toString()).toBe("0");
  });
});

describe("returns & approval", () => {
  const line = { soldPieces: 10, alreadyReturnedPieces: 0, soldNet: 100, soldFine: "75", soldTaxable: 190000 };
  it("partial return pro-rata", () => {
    const r = calculateReturnLine({ ...line, returnPieces: 4 });
    expect(r.net.toString()).toBe("40");
    expect(r.fine.toString()).toBe("30");
    expect(r.taxable.toString()).toBe("76000");
  });
  it("blocks over-return", () => {
    expect(() => calculateReturnLine({ ...line, alreadyReturnedPieces: 8, returnPieces: 3 })).toThrow(BusinessError);
  });
  it("approval: 10 issued, 4 returned, 6 sold → closed", () => {
    expect(calculateApprovalSplit(10, 4, 6).status).toBe("CLOSED");
    expect(calculateApprovalSplit(10, 4, 0).status).toBe("PARTIAL");
    expect(calculateApprovalSplit(10, 0, 0).status).toBe("OPEN");
    expect(() => calculateApprovalSplit(10, 6, 6)).toThrow(BusinessError);
  });
  it("D handles junk", () => expect(D("abc").toString()).toBe("0"));
});
