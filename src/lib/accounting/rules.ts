import { D, Decimal, type Numeric, roundMoney, DEFAULT_ROUNDING, roundFine, sum } from "../calculations/decimal";
import { calculateFineWeight } from "../calculations/weight";

export class BusinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessError";
  }
}

/**
 * Sign convention (receivable view): Debit increases what the customer owes us, Credit reduces it.
 * Balance > 0 → "Dr" (customer owes). Balance < 0 → "Cr".
 */
export interface LedgerEntryLike {
  debit: Numeric;
  credit: Numeric;
  status?: "ACTIVE" | "CANCELLED" | "VOID";
}

export function calculateCustomerBalance(opening: Numeric, entries: LedgerEntryLike[]): Decimal {
  return entries
    .filter((e) => (e.status ?? "ACTIVE") === "ACTIVE")
    .reduce<Decimal>((bal, e) => bal.plus(D(e.debit)).minus(D(e.credit)), D(opening));
}

export function runningBalances(opening: Numeric, entries: LedgerEntryLike[]): Decimal[] {
  let bal = D(opening);
  return entries.map((e) => {
    bal = bal.plus(D(e.debit)).minus(D(e.credit));
    return bal;
  });
}

export function formatDrCr(balance: Numeric): "Dr" | "Cr" | "" {
  const b = D(balance);
  return b.isZero() ? "" : b.isPositive() ? "Dr" : "Cr";
}

// ---------- Rate fixing ----------
export interface RateFixingResult {
  fineToFix: Decimal;
  amount: Decimal;
  remainingGoldDue: Decimal;
  newGoldBalance: Decimal;
}

/**
 * Converts fine gold owed into money. Partial fixing allowed.
 * Metal ledger: credit `fineToFix`. Money ledger: debit `amount`.
 */
export function calculateRateFixing(goldDue: Numeric, fineToFix: Numeric, rate: Numeric, allowExceed = false): RateFixingResult {
  const due = D(goldDue);
  const fix = D(fineToFix);
  const r = D(rate);
  if (fix.lessThanOrEqualTo(0)) throw new BusinessError("Fine weight to fix must be greater than zero.");
  if (r.lessThanOrEqualTo(0)) throw new BusinessError("Rate must be greater than zero.");
  if (!allowExceed && fix.greaterThan(due)) {
    throw new BusinessError(`Cannot fix ${fix.toFixed(3)} g — customer only owes ${due.toFixed(3)} g of fine gold.`);
  }
  return {
    fineToFix: roundFine(fix),
    amount: roundMoney(fix.times(r), DEFAULT_ROUNDING),
    remainingGoldDue: due.minus(fix),
    newGoldBalance: due.minus(fix),
  };
}

// ---------- Gold receipt ----------
export function calculateGoldReceipt(physicalWeight: Numeric, touch: Numeric): { fineWeight: Decimal } {
  if (D(physicalWeight).lessThanOrEqualTo(0)) throw new BusinessError("Physical weight must be greater than zero.");
  return { fineWeight: calculateFineWeight(physicalWeight, touch) };
}

// ---------- Reversals (cancellation) ----------
export interface PostedEntry {
  debit: Numeric;
  credit: Numeric;
}
/** A reversal swaps debit/credit. Original rows are never altered. */
export function reverseEntry(e: PostedEntry): PostedEntry {
  return { debit: e.credit, credit: e.debit };
}

// ---------- Returns ----------
export interface ReturnLine {
  soldPieces: Numeric;
  alreadyReturnedPieces: Numeric;
  returnPieces: Numeric;
  soldNet: Numeric;
  soldFine: Numeric;
  soldTaxable: Numeric;
}

/** Pro-rata return values from original line. Rejects over-returns. */
export function calculateReturnLine(l: ReturnLine) {
  const sold = D(l.soldPieces);
  const left = sold.minus(D(l.alreadyReturnedPieces));
  const ret = D(l.returnPieces);
  if (ret.lessThanOrEqualTo(0)) throw new BusinessError("Return quantity must be greater than zero.");
  if (ret.greaterThan(left)) throw new BusinessError(`Only ${left.toString()} piece(s) are left to return on this line.`);
  const ratio = ret.dividedBy(sold);
  return {
    net: D(l.soldNet).times(ratio),
    fine: roundFine(D(l.soldFine).times(ratio)),
    taxable: roundMoney(D(l.soldTaxable).times(ratio)),
  };
}

// ---------- Approval conversion ----------
export function calculateApprovalSplit(issuedPieces: Numeric, returnedPieces: Numeric, soldPieces: Numeric) {
  const issued = D(issuedPieces);
  const ret = D(returnedPieces);
  const sold = D(soldPieces);
  const pending = issued.minus(ret).minus(sold);
  if (pending.isNegative()) throw new BusinessError("Returned and sold pieces exceed pieces issued on approval.");
  return { pending, status: pending.isZero() ? "CLOSED" : ret.plus(sold).isZero() ? "OPEN" : "PARTIAL" } as const;
}

export const totalOf = (vals: Numeric[]) => sum(vals);
