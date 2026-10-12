import Link from "next/link";
import { Plus, Search, FileText } from "lucide-react";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { D } from "@/lib/calculations/decimal";
import { formatDate, formatFine, formatMoney, formatWeight } from "@/lib/utils";
import { EmptyState, PageHeader, Stat, StatusBadge } from "@/components/page";
import { Pagination } from "@/components/pagination";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Sales Registry" };
export const dynamic = "force-dynamic";
const PAGE = 25;

export default async function SalesRegistryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; mode?: string; status?: string }>;
}) {
  const s = await requirePermission("sale.view");
  const { q = "", page = "1", mode = "", status = "" } = await searchParams;
  const pg = Math.max(1, parseInt(page, 10) || 1);

  const where: Prisma.SaleWhereInput = {
    ...(status ? { status: status as "ACTIVE" } : {}),
    ...(mode ? { billingMode: mode as "MONEY" } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q, mode: "insensitive" as const } },
            { customer: { businessName: { contains: q, mode: "insensitive" as const } } },
            { customer: { phone: { contains: q } } },
          ],
        }
      : {}),
  };

  const [total, rows, agg] = await Promise.all([
    db.sale.count({ where }),
    db.sale.findMany({
      where,
      include: { customer: { select: { businessName: true, phone: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (pg - 1) * PAGE,
      take: PAGE,
    }),
    db.sale.aggregate({
      where: { ...where, status: "ACTIVE" },
      _sum: { grandTotal: true, fineWeight: true, netWeight: true, metalLedgerImpact: true },
      _count: true,
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Sales Registry"
        subtitle={`${total} invoice${total === 1 ? "" : "s"}`}
        actions={
          s.can("sale.create") && (
            <Link href="/sales/new" className="btn btn-primary">
              <Plus size={16} /> New Sale
            </Link>
          )
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total Invoices" value={String(agg._count)} />
        <Stat label="Net Weight Sold" value={formatWeight(agg._sum.netWeight?.toString())} />
        <Stat
          label="Fine Gold Debited"
          value={formatFine(agg._sum.metalLedgerImpact?.toString())}
          sub="On metal ledger"
          tone="accent"
        />
        <Stat
          label="Total Invoice Value"
          value={formatMoney(agg._sum.grandTotal?.toString(), { dp: 0 })}
          sub="On money ledger"
        />
      </div>

      <form className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-60 flex-1 sm:max-w-sm">
          <Search size={16} className="absolute left-3 top-3.5 text-faint" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search invoice number, customer name, phone…"
            className="field !pl-9"
          />
        </div>
        <select name="mode" defaultValue={mode} className="field !w-44">
          <option value="">All billing modes</option>
          <option value="MONEY">Money billing</option>
          <option value="METAL">Metal + charges</option>
        </select>
        <select name="status" defaultValue={status} className="field !w-36">
          <option value="">All status</option>
          <option value="ACTIVE">Active</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <button className="btn">Search</button>
      </form>

      {rows.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<FileText size={30} />}
            title={q ? `No sales match “${q}”` : "No sales recorded yet"}
            hint={q ? "Try searching with a different invoice number or customer." : "Create your first sale to start wholesale billing."}
            action={
              !q &&
              s.can("sale.create") && (
                <Link href="/sales/new" className="btn btn-primary">
                  + New Sale
                </Link>
              )
            }
          />
        </div>
      ) : (
        <>
          <div className="card hidden overflow-x-auto md:block">
            <table className="dt">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Mode</th>
                  <th className="r">Net Wt</th>
                  <th className="r">Fine Gold</th>
                  <th className="r">Metal Due</th>
                  <th className="r">Taxable</th>
                  <th className="r">Grand Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((sale) => {
                  const metalImpact = D(sale.metalLedgerImpact.toString());
                  return (
                    <tr key={sale.id}>
                      <td>
                        <Link href={`/sales/${sale.id}`} className="font-medium hover:text-accent">
                          {sale.number}
                        </Link>
                      </td>
                      <td>{formatDate(sale.date)}</td>
                      <td>
                        <div className="font-medium">{sale.customer.businessName}</div>
                        {sale.customer.phone && (
                          <div className="text-xs text-muted">{sale.customer.phone}</div>
                        )}
                      </td>
                      <td>
                        <span className="text-xs font-medium text-muted">
                          {sale.billingMode === "METAL" ? "Metal + charges" : "Money"}
                        </span>
                      </td>
                      <td className="r num">{formatWeight(sale.netWeight.toString())}</td>
                      <td className="r num">{formatFine(sale.fineWeight.toString())}</td>
                      <td className="r num">
                        {metalImpact.isZero() ? (
                          <span className="text-faint">—</span>
                        ) : (
                          <span className="font-semibold text-accent">{formatFine(metalImpact)}</span>
                        )}
                      </td>
                      <td className="r num">{formatMoney(sale.taxableAmount.toString())}</td>
                      <td className="r num font-semibold">{formatMoney(sale.grandTotal.toString())}</td>
                      <td>
                        <StatusBadge status={sale.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 md:hidden">
            {rows.map((sale) => (
              <Link key={sale.id} href={`/sales/${sale.id}`} className="card block p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-ink">{sale.number}</div>
                    <div className="text-xs text-muted">{sale.customer.businessName} · {formatDate(sale.date)}</div>
                  </div>
                  <StatusBadge status={sale.status} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                  <div>
                    <div className="text-[11px] text-muted">Net Wt</div>
                    <div className="num text-[13px] font-medium">{formatWeight(sale.netWeight.toString())}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted">Fine Gold</div>
                    <div className="num text-[13px] font-semibold text-accent">
                      {D(sale.metalLedgerImpact.toString()).isZero()
                        ? formatFine(sale.fineWeight.toString())
                        : formatFine(sale.metalLedgerImpact.toString())}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted">Amount</div>
                    <div className="num text-[13px] font-semibold">{formatMoney(sale.grandTotal.toString())}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <Pagination total={total} page={pg} size={PAGE} params={{ q, mode, status }} />
        </>
      )}
    </div>
  );
}
