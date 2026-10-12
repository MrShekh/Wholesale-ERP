import Link from "next/link";
import { Package, Plus, Search } from "lucide-react";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { formatFine, formatMoney, formatWeight } from "@/lib/utils";
import { EmptyState, PageHeader, Stat } from "@/components/page";
import { Pagination } from "@/components/pagination";
import { StockTable, type StockRow } from "@/modules/inventory/components/stock-table";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Jewellery Stock" };
export const dynamic = "force-dynamic";
const PAGE = 30;
const STATUSES = ["AVAILABLE", "SOLD", "ON_APPROVAL", "RESERVED", "IN_TRANSIT", "RETURNED", "DAMAGED", "ADJUSTED"];

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requirePermission("inventory.view");
  const sp = await searchParams;
  const { q = "", category = "", purity = "", status = "AVAILABLE", supplier = "", min = "", max = "" } = sp;
  const pg = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const ci = { contains: q, mode: "insensitive" as const };

  const where: Prisma.ProductWhereInput = {
    isDeleted: false,
    ...(status && status !== "ALL" ? { status: status as "AVAILABLE" } : {}),
    ...(category ? { categoryId: category } : {}),
    ...(purity ? { purityId: purity } : {}),
    ...(supplier ? { supplierId: supplier } : {}),
    ...(min || max ? { grossWeight: { ...(min ? { gte: min } : {}), ...(max ? { lte: max } : {}) } } : {}),
    ...(q ? { OR: [{ designNo: ci }, { itemCode: ci }, { barcode: ci }, { huid: ci }, { name: ci }, { lot: { lotNumber: ci } }] } : {}),
  };

  const [total, rows, agg, cats, purities, suppliers] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({ where, include: { category: true, purity: true, supplier: true, location: true, lot: true }, orderBy: { createdAt: "desc" }, skip: (pg - 1) * PAGE, take: PAGE }),
    db.product.aggregate({ where, _sum: { pieces: true, grossWeight: true, stoneWeight: true, netWeight: true, fineWeight: true, purchaseCost: true } }),
    db.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.purity.findMany({ where: { isActive: true }, orderBy: { touch: "desc" } }),
    db.supplier.findMany({ where: { isDeleted: false }, select: { id: true, companyName: true }, orderBy: { companyName: "asc" } }),
  ]);

  const canCost = s.can("cost.view");
  const data: StockRow[] = rows.map((p) => ({
    id: p.id, design: p.designNo, code: p.itemCode, name: p.name ?? "", category: p.category?.name ?? "—", pieces: p.pieces,
    gross: formatWeight(p.grossWeight.toString(), 3, false), stone: formatWeight(p.stoneWeight.toString(), 3, false), other: formatWeight(p.otherWeight.toString(), 3, false),
    net: formatWeight(p.netWeight.toString(), 3, false), purity: p.purity.name, touch: p.touch.toString(), fine: formatFine(p.fineWeight.toString(), false),
    status: p.status, barcode: p.barcode ?? "", huid: p.huid ?? "", supplier: p.supplier?.companyName ?? "", location: p.location?.name ?? "", lot: p.lot?.lotNumber ?? "",
    cost: canCost ? formatMoney(p.purchaseCost.toString(), { dp: 0 }) : null,
  }));

  return (
    <div>
      <PageHeader
        title="Jewellery Stock"
        subtitle={`${total} item${total === 1 ? "" : "s"} match your filters`}
        actions={
          s.can("inventory.manage") && (
            <Link href="/inventory/new" className="btn btn-primary">
              <Plus size={16} /> Add Stock Item
            </Link>
          )
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pieces" value={String(agg._sum.pieces ?? 0)} />
        <Stat label="Gross weight" value={formatWeight(agg._sum.grossWeight?.toString())} />
        <Stat label="Net weight" value={formatWeight(agg._sum.netWeight?.toString())} />
        <Stat label="Fine gold" value={formatFine(agg._sum.fineWeight?.toString())} tone="accent" />
      </div>

      <form className="mb-4 flex flex-wrap items-end gap-2">
        <div className="relative min-w-56 flex-1 sm:max-w-xs"><Search size={16} className="absolute left-3 top-3.5 text-faint" /><input name="q" defaultValue={q} placeholder="Design, barcode, HUID, lot…" className="field !pl-9" /></div>
        <select name="category" defaultValue={category} className="field !w-40"><option value="">All categories</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select name="purity" defaultValue={purity} className="field !w-36"><option value="">All purity</option>{purities.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select name="supplier" defaultValue={supplier} className="field !w-48"><option value="">All suppliers</option>{suppliers.map((p) => <option key={p.id} value={p.id}>{p.companyName}</option>)}</select>
        <select name="status" defaultValue={status} className="field !w-40"><option value="ALL">Any status</option>{STATUSES.map((x) => <option key={x} value={x}>{x.replace("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</option>)}</select>
        <input name="min" defaultValue={min} placeholder="Min g" inputMode="decimal" className="field num !w-24" />
        <input name="max" defaultValue={max} placeholder="Max g" inputMode="decimal" className="field num !w-24" />
        <button className="btn">Apply</button>
      </form>

      {rows.length === 0 ? (
        <div className="card"><EmptyState icon={<Package size={30} />} title="No stock found" hint="Try clearing filters, or add stock through a purchase." /></div>
      ) : (
        <>
          <StockTable rows={data} canCost={canCost} />
          <Pagination total={total} page={pg} size={PAGE} params={{ q, category, purity, supplier, status, min, max }} />
        </>
      )}
    </div>
  );
}
