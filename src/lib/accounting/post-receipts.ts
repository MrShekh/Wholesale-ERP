import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { nextNumber, type Tx } from "@/lib/accounting/numbering";
import { BusinessError, calculateGoldReceipt, calculateRateFixing } from "@/lib/accounting/rules";
import { customerFineBalance } from "@/lib/accounting/balances";
import { D, type Numeric } from "@/lib/calculations/decimal";
import type { Actor } from "./post-sale";

function wrap<T>(label: string, fn: () => Promise<T>): Promise<T> {
  return fn().catch((e) => {
    if (e instanceof BusinessError) throw e;
    console.error(label, e);
    throw new BusinessError(`Unable to save this ${label}. No ledger changes were made.`);
  });
}

export function postCashReceipt(
  i: { customerId: string; date: string; amount: Numeric; paymentMode: "CASH" | "UPI" | "BANK_TRANSFER" | "NEFT" | "RTGS" | "CHEQUE" | "CARD" | "OTHER"; referenceNo?: string; bank?: string; remarks?: string },
  actor: Actor,
) {
  return wrap("receipt", () =>
    db.$transaction(async (tx: Tx) => {
      if (D(i.amount).lessThanOrEqualTo(0)) throw new BusinessError("Amount must be greater than zero.");
      const date = new Date(i.date);
      const number = await nextNumber(tx, "CASH_RECEIPT", date);
      const r = await tx.cashReceipt.create({
        data: { number, date, customerId: i.customerId, amount: D(i.amount).toString(), paymentMode: i.paymentMode, referenceNo: i.referenceNo, bank: i.bank, remarks: i.remarks, createdById: actor.id },
      });
      await tx.customerMoneyLedger.create({
        data: { customerId: i.customerId, date, txnType: i.paymentMode === "CASH" ? "CASH_RECEIPT" : "BANK_RECEIPT", docType: "CASH_RECEIPT", docId: r.id, reference: number, credit: D(i.amount).toString(), paymentMode: i.paymentMode, remarks: i.remarks, userId: actor.id },
      });
      await writeAudit(tx, { userId: actor.id, userName: actor.name, module: "Payments", action: "CASH_RECEIPT_CREATED", recordType: "CashReceipt", recordId: r.id, recordRef: number, newValue: { amount: D(i.amount).toString(), mode: i.paymentMode } });
      return { id: r.id, number };
    }),
  );
}

export function postGoldReceipt(
  i: { customerId: string; date: string; physicalWeight: Numeric; touch: Numeric; reference?: string; remarks?: string },
  actor: Actor,
) {
  return wrap("gold receipt", () =>
    db.$transaction(async (tx: Tx) => {
      const { fineWeight } = calculateGoldReceipt(i.physicalWeight, i.touch);
      const date = new Date(i.date);
      const number = await nextNumber(tx, "GOLD_RECEIPT", date);
      const r = await tx.goldReceipt.create({
        data: { number, date, customerId: i.customerId, physicalWeight: D(i.physicalWeight).toString(), touch: D(i.touch).toString(), fineWeight: fineWeight.toString(), reference: i.reference, remarks: i.remarks, createdById: actor.id },
      });
      await tx.customerMetalLedger.create({
        data: { customerId: i.customerId, date, txnType: "GOLD_RECEIPT", docType: "GOLD_RECEIPT", docId: r.id, reference: number, creditFine: fineWeight.toString(), physicalWeight: D(i.physicalWeight).toString(), touch: D(i.touch).toString(), remarks: i.remarks, userId: actor.id },
      });
      await writeAudit(tx, { userId: actor.id, userName: actor.name, module: "Gold", action: "GOLD_RECEIPT_CREATED", recordType: "GoldReceipt", recordId: r.id, recordRef: number, newValue: { physical: D(i.physicalWeight).toString(), touch: D(i.touch).toString(), fine: fineWeight.toString() } });
      return { id: r.id, number, fineWeight: fineWeight.toString() };
    }),
  );
}

/** Rate fixing: metal ledger CREDIT (fine ↓), money ledger DEBIT (cash ↑). Partial allowed. */
export function postRateFixing(
  i: { customerId: string; date: string; fineWeight: Numeric; rate: Numeric; reference?: string; notes?: string },
  actor: Actor,
) {
  return wrap("rate fixing", () =>
    db.$transaction(async (tx: Tx) => {
      const due = await customerFineBalance(i.customerId, tx);
      const calc = calculateRateFixing(due, i.fineWeight, i.rate);
      const date = new Date(i.date);
      const number = await nextNumber(tx, "RATE_FIXING", date);
      const r = await tx.rateFixing.create({
        data: { number, date, customerId: i.customerId, fineWeight: calc.fineToFix.toString(), rate: D(i.rate).toString(), amount: calc.amount.toString(), reference: i.reference, notes: i.notes, createdById: actor.id },
      });
      await tx.customerMetalLedger.create({
        data: { customerId: i.customerId, date, txnType: "RATE_FIXING", docType: "RATE_FIXING", docId: r.id, reference: number, creditFine: calc.fineToFix.toString(), remarks: `Fixed @ ₹${D(i.rate).toString()}/g`, userId: actor.id },
      });
      await tx.customerMoneyLedger.create({
        data: { customerId: i.customerId, date, txnType: "RATE_FIXING", docType: "RATE_FIXING", docId: r.id, reference: number, debit: calc.amount.toString(), remarks: `${calc.fineToFix.toString()} g @ ₹${D(i.rate).toString()}`, userId: actor.id },
      });
      await writeAudit(tx, { userId: actor.id, userName: actor.name, module: "Rate Fixing", action: "RATE_FIX_CREATED", recordType: "RateFixing", recordId: r.id, recordRef: number, newValue: { fine: calc.fineToFix.toString(), rate: D(i.rate).toString(), amount: calc.amount.toString() } });
      return { id: r.id, number, amount: calc.amount.toString(), remaining: calc.remainingGoldDue.toString() };
    }, { isolationLevel: "Serializable" }),
  );
}
