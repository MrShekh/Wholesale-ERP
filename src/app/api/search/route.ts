import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ hits: [] }, { status: 401 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ hits: [] });
  const ci = { contains: q, mode: "insensitive" as const };
  const asNumber = /^\d+(\.\d+)?$/.test(q) ? q : null;

  const [customers, suppliers, products, sales] = await Promise.all([
    db.customer.findMany({ where: { isDeleted: false, OR: [{ businessName: ci }, { phone: ci }, { gstin: ci }, { code: ci }, { contactPerson: ci }] }, take: 5, orderBy: { businessName: "asc" } }),
    db.supplier.findMany({ where: { isDeleted: false, OR: [{ companyName: ci }, { phone: ci }, { gstin: ci }, { code: ci }] }, take: 3 }),
    db.product.findMany({
      where: { isDeleted: false, OR: [{ designNo: ci }, { itemCode: ci }, { barcode: ci }, { huid: ci }, { name: ci }, ...(asNumber ? [{ grossWeight: asNumber }, { netWeight: asNumber }] : [])] },
      include: { purity: true }, take: 6,
    }),
    db.sale.findMany({ where: { number: ci }, include: { customer: true }, take: 4, orderBy: { createdAt: "desc" } }),
  ]);

  const hits = [
    ...customers.map((c) => ({ type: "customer", id: c.id, title: c.businessName, subtitle: [c.code, c.phone, c.city].filter(Boolean).join(" · "), href: `/customers/${c.id}` })),
    ...sales.map((x) => ({ type: "sale", id: x.id, title: x.number, subtitle: x.customer.businessName, href: `/sales/${x.id}` })),
    ...products.map((p) => ({ type: "product", id: p.id, title: `${p.designNo} · ${p.name ?? ""}`, subtitle: `${p.itemCode} · ${p.purity.name} · ${p.grossWeight} g · ${p.status.replace("_", " ").toLowerCase()}`, href: `/inventory?q=${encodeURIComponent(p.designNo)}` })),
    ...suppliers.map((x) => ({ type: "supplier", id: x.id, title: x.companyName, subtitle: [x.code, x.phone].filter(Boolean).join(" · "), href: `/suppliers` })),
  ];
  return NextResponse.json({ hits });
}
