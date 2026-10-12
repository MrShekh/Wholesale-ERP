import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { customerBalances } from "@/lib/accounting/balances";
import { formatBalance, formatMoney } from "@/lib/utils";
import { EmptyState, PageHeader, StatusBadge } from "@/components/page";
import { Pagination } from "@/components/pagination";

export const metadata = { title: "Customers" };
export const dynamic = "force-dynamic";
const PAGE = 25;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; status?: string }> }) {
  const s = await requirePermission("customer.view");
  const { q = "", page = "1", status = "" } = await searchParams;
  const pg = Math.max(1, parseInt(page, 10) || 1);
  const where = {
    isDeleted: false,
    ...(status ? { status: status as "ACTIVE" } : {}),
    ...(q ? { OR: [{ businessName: { contains: q, mode: "insensitive" as const } }, { phone: { contains: q } }, { gstin: { contains: q, mode: "insensitive" as const } }, { code: { contains: q, mode: "insensitive" as const } }, { city: { contains: q, mode: "insensitive" as const } }] } : {}),
  };
  const [total, rows] = await Promise.all([
    db.customer.count({ where }),
    db.customer.findMany({ where, orderBy: { businessName: "asc" }, skip: (pg - 1) * PAGE, take: PAGE }),
  ]);
  const bal = await customerBalances(rows.map((r) => r.id));

  return (
    <div>
      <PageHeader title="Customers" subtitle={`${total} customer${total === 1 ? "" : "s"}`}
        actions={s.can("customer.manage") && <Link href="/customers/new" className="btn btn-primary"><Plus size={16} /> Add Customer</Link>} />

      <form className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-60 flex-1 sm:max-w-sm">
          <Search size={16} className="absolute left-3 top-3.5 text-faint" />
          <input name="q" defaultValue={q} placeholder="Search name, phone, GSTIN, city…" className="field !pl-9" />
        </div>
        <select name="status" defaultValue={status} className="field !w-40">
          <option value="">All status</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="BLOCKED">Blocked</option>
        </select>
        <button className="btn">Search</button>
      </form>

      {rows.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Users size={30} />} title={q ? `No customers match “${q}”` : "No customers yet"} hint={q ? "Try a different name or phone number." : "Add your first customer to start billing."}
            action={!q && s.can("customer.manage") && <Link href="/customers/new" className="btn btn-primary">+ Add First Customer</Link>} />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card hidden overflow-x-auto md:block">
            <table className="dt">
              <thead><tr><th>Code</th><th>Customer</th><th>City</th><th>Mode</th><th className="r">Fine gold</th><th className="r">Money</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((c) => {
                  const b = bal.get(c.id)!;
                  return (
                    <tr key={c.id}>
                      <td className="num text-muted">{c.code}</td>
                      <td><Link href={`/customers/${c.id}`} className="font-medium hover:text-accent">{c.businessName}</Link><div className="text-xs text-muted">{c.phone ?? "—"}</div></td>
                      <td>{c.city ?? "—"}</td>
                      <td className="text-muted">{c.defaultBillingMode === "METAL" ? "Metal + charges" : "Money"}</td>
                      <td className="r num font-medium">{formatBalance(b.fine, "fine")}</td>
                      <td className="r num font-medium">{formatBalance(b.money, "money")}</td>
                      <td><StatusBadge status={c.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {rows.map((c) => {
              const b = bal.get(c.id)!;
              return (
                <Link key={c.id} href={`/customers/${c.id}`} className="card block p-4">
                  <div className="flex items-start justify-between"><div className="font-medium">{c.businessName}</div><StatusBadge status={c.status} /></div>
                  <div className="text-xs text-muted">{c.phone ?? "—"} · {c.city ?? "—"}</div>
                  <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
                    <div><div className="text-[11px] text-muted">Fine gold</div><div className="num font-semibold">{formatBalance(b.fine, "fine")}</div></div>
                    <div><div className="text-[11px] text-muted">Money</div><div className="num font-semibold">{formatMoney(b.money.abs(), { dp: 0 })} {b.money.isNegative() ? "Cr" : b.money.isZero() ? "" : "Dr"}</div></div>
                  </div>
                </Link>
              );
            })}
          </div>
          <Pagination total={total} page={pg} size={PAGE} params={{ q, status }} />
        </>
      )}
    </div>
  );
}
