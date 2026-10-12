import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { customerBalances } from "@/lib/accounting/balances";

export async function GET(req: Request) {
  const s = await getSession();
  if (!s || !s.can("customer.view")) return NextResponse.json({ items: [] }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") ?? "").trim();
  const id = sp.get("id");
  const where = id
    ? { id }
    : { isDeleted: false, status: { not: "BLOCKED" as const }, ...(q ? { OR: [{ businessName: { contains: q, mode: "insensitive" as const } }, { phone: { contains: q } }, { code: { contains: q, mode: "insensitive" as const } }, { gstin: { contains: q, mode: "insensitive" as const } }] } : {}) };
  const rows = await db.customer.findMany({ where, take: 8, orderBy: { businessName: "asc" } });
  const bal = await customerBalances(rows.map((r) => r.id));
  const lastSales = await Promise.all(rows.map((r) => db.sale.findFirst({ where: { customerId: r.id, status: "ACTIVE" }, orderBy: { date: "desc" }, select: { number: true, date: true, grandTotal: true } })));

  return NextResponse.json({
    items: rows.map((c, i) => ({
      id: c.id, code: c.code, name: c.businessName, phone: c.phone, city: c.city, gstin: c.gstin, state: c.state, stateCode: c.stateCode,
      creditLimit: c.creditLimit.toString(), creditDays: c.creditDays, billingMode: c.defaultBillingMode,
      makingType: c.defaultMakingType, makingRate: c.defaultMakingRate.toString(), goldMargin: c.defaultGoldMargin.toString(), discountPct: c.defaultDiscountPct.toString(),
      fine: bal.get(c.id)!.fine.toString(), money: bal.get(c.id)!.money.toString(),
      lastSale: lastSales[i] ? { number: lastSales[i]!.number, date: lastSales[i]!.date.toISOString(), total: lastSales[i]!.grandTotal.toString() } : null,
    })),
  });
}
