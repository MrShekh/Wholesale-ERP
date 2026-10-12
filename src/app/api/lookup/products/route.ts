import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

/** Available stock lookup for the sale screen: barcode (exact) or design / item / name / HUID / lot search. */
export async function GET(req: Request) {
  const s = await getSession();
  if (!s || !s.can("sale.create")) return NextResponse.json({ items: [] }, { status: 401 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ items: [] });
  const ci = { contains: q, mode: "insensitive" as const };
  const rows = await db.product.findMany({
    where: { isDeleted: false, status: "AVAILABLE", OR: [{ barcode: q }, { itemCode: ci }, { designNo: ci }, { name: ci }, { huid: ci }, { lot: { lotNumber: ci } }] },
    include: { stones: true, purity: true, category: true },
    take: 8,
    orderBy: { designNo: "asc" },
  });
  return NextResponse.json({
    items: rows.map((p) => ({
      id: p.id, itemCode: p.itemCode, designNo: p.designNo, name: p.name ?? p.designNo, barcode: p.barcode, category: p.category?.name ?? "",
      purityId: p.purityId, purity: p.purity.name, touch: p.touch.toString(), pieces: p.pieces,
      gross: p.grossWeight.toString(), stone: p.stoneWeight.toString(), other: p.otherWeight.toString(), net: p.netWeight.toString(),
      stoneAmount: p.stones.reduce((a, x) => a + Number(x.amount), 0).toFixed(2),
      makingType: p.makingType, makingCharge: p.makingCharge.toString(),
    })),
    exact: rows.length === 1 && rows[0].barcode === q,
  });
}
