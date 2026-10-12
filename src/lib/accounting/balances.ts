import { db } from "@/lib/db";
import { D, Decimal } from "@/lib/calculations/decimal";
import type { Tx } from "./numbering";

type Client = Tx | typeof db;

/** Fine-gold balance (Dr positive = customer owes us). Ledger rows are append-only, reversals included. */
export async function customerFineBalance(customerId: string, c: Client = db): Promise<Decimal> {
  const [cust, agg] = await Promise.all([
    c.customer.findUniqueOrThrow({ where: { id: customerId }, select: { openingFine: true } }),
    c.customerMetalLedger.aggregate({
      where: { customerId, status: "ACTIVE" },
      _sum: { debitFine: true, creditFine: true },
    }),
  ]);
  return D(cust.openingFine.toString()).plus(D(agg._sum.debitFine?.toString())).minus(D(agg._sum.creditFine?.toString()));
}

export async function customerMoneyBalance(customerId: string, c: Client = db): Promise<Decimal> {
  const [cust, agg] = await Promise.all([
    c.customer.findUniqueOrThrow({ where: { id: customerId }, select: { openingCash: true } }),
    c.customerMoneyLedger.aggregate({
      where: { customerId, status: "ACTIVE" },
      _sum: { debit: true, credit: true },
    }),
  ]);
  return D(cust.openingCash.toString()).plus(D(agg._sum.debit?.toString())).minus(D(agg._sum.credit?.toString()));
}

/** Batch version for lists (outstanding customers, dashboard). Two grouped queries, no N+1. */
export async function customerBalances(customerIds?: string[]) {
  const where = customerIds ? { customerId: { in: customerIds }, status: "ACTIVE" as const } : { status: "ACTIVE" as const };
  const [custs, metal, money] = await Promise.all([
    db.customer.findMany({
      where: customerIds ? { id: { in: customerIds } } : { isDeleted: false },
      select: { id: true, openingFine: true, openingCash: true },
    }),
    db.customerMetalLedger.groupBy({ by: ["customerId"], where, _sum: { debitFine: true, creditFine: true } }),
    db.customerMoneyLedger.groupBy({ by: ["customerId"], where, _sum: { debit: true, credit: true } }),
  ]);
  const m1 = new Map(metal.map((r) => [r.customerId, r._sum]));
  const m2 = new Map(money.map((r) => [r.customerId, r._sum]));
  return new Map(
    custs.map((c) => {
      const a = m1.get(c.id);
      const b = m2.get(c.id);
      return [
        c.id,
        {
          fine: D(c.openingFine.toString()).plus(D(a?.debitFine?.toString())).minus(D(a?.creditFine?.toString())),
          money: D(c.openingCash.toString()).plus(D(b?.debit?.toString())).minus(D(b?.credit?.toString())),
        },
      ] as const;
    }),
  );
}
