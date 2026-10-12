import Link from "next/link";
import { Users, FileText, Hourglass, PackageSearch } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { customerBalances } from "@/lib/accounting/balances";
import { D, sum } from "@/lib/calculations/decimal";
import { formatBalance, formatDate, formatFine, formatMoney, formatMoneyShort, formatWeight } from "@/lib/utils";
import { EmptyState, PageHeader, Section, Stat, StatusBadge } from "@/components/page";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function greeting() {
  const h = new Date().toLocaleString("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" });
  const n = Number(h);
  return n < 12 ? "Good morning" : n < 17 ? "Good afternoon" : "Good evening";
}

export default async function DashboardPage() {
  const session = await requireSession();
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const today = new Date(todayStr);
  const ninetyAgo = new Date(Date.now() - 90 * 86400000);

  const [todaySales, recentSales, stockAgg, approvalAgg, approvals, aging, balances, customers] = await Promise.all([
    db.sale.aggregate({ where: { date: today, status: "ACTIVE" }, _sum: { grandTotal: true }, _count: true }),
    db.sale.findMany({ where: { status: "ACTIVE" }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 6, include: { customer: { select: { businessName: true } } } }),
    db.product.aggregate({ where: { status: "AVAILABLE", isDeleted: false }, _sum: { grossWeight: true, netWeight: true, fineWeight: true, pieces: true }, _count: true }),
    db.product.aggregate({ where: { status: "ON_APPROVAL", isDeleted: false }, _sum: { netWeight: true }, _count: true }),
    db.approvalMemo.findMany({ where: { status: { in: ["OPEN", "PARTIAL"] } }, orderBy: { date: "asc" }, take: 5, include: { customer: { select: { businessName: true } }, items: true } }),
    db.product.findMany({ where: { status: "AVAILABLE", isDeleted: false, createdAt: { lt: ninetyAgo } }, orderBy: { createdAt: "asc" }, take: 5 }),
    customerBalances(),
    db.customer.findMany({ where: { isDeleted: false }, select: { id: true, businessName: true } }),
  ]);

  const names = new Map(customers.map((c) => [c.id, c.businessName]));
  const rows = [...balances.entries()].map(([id, b]) => ({ id, name: names.get(id) ?? "", ...b }));
  const cashReceivable = sum(rows.filter((r) => r.money.isPositive()).map((r) => r.money));
  const fineReceivable = sum(rows.filter((r) => r.fine.isPositive()).map((r) => r.fine));
  const topMoney = rows.filter((r) => r.money.isPositive()).sort((a, b) => b.money.comparedTo(a.money)).slice(0, 5);
  const topFine = rows.filter((r) => !r.fine.isZero()).sort((a, b) => b.fine.abs().comparedTo(a.fine.abs())).slice(0, 5);

  return (
    <div>
      <PageHeader title={`${greeting()}, ${session.user.name.split(" ")[0]}`} subtitle="Here's your business overview." />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Today's Sales" value={formatMoneyShort(todaySales._sum.grandTotal?.toString())} sub={`${todaySales._count} invoice${todaySales._count === 1 ? "" : "s"}`} href="/sales" />
        <Stat label="Cash Receivable" value={formatMoneyShort(cashReceivable)} sub={`${topMoney.length ? rows.filter((r) => r.money.isPositive()).length : 0} customers`} />
        <Stat label="Gold Receivable" value={formatWeight(fineReceivable)} sub="Fine gold owed" tone="accent" />
        <Stat label="Stock Weight" value={formatWeight(stockAgg._sum.netWeight?.toString())} sub={`${stockAgg._count} items · fine ${formatFine(stockAgg._sum.fineWeight?.toString())}`} href="/inventory" />
        <Stat label="On Approval" value={`${approvalAgg._count} items`} sub={formatWeight(approvalAgg._sum.netWeight?.toString())} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Section title="Recent Sales" className="lg:col-span-3" action={<Link href="/sales" className="text-[13px] text-accent hover:underline">View all</Link>}>
          {recentSales.length === 0 ? (
            <EmptyState icon={<FileText size={28} />} title="No sales yet" hint="Your latest invoices will appear here." action={<Link href="/sales/new" className="btn btn-primary btn-sm">+ New Sale</Link>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="dt">
                <thead><tr><th>Invoice</th><th>Customer</th><th className="r">Fine gold</th><th className="r">Amount</th></tr></thead>
                <tbody>
                  {recentSales.map((s) => (
                    <tr key={s.id}>
                      <td><Link href={`/sales/${s.id}`} className="font-medium hover:text-accent">{s.number}</Link><div className="text-xs text-muted">{formatDate(s.date)}</div></td>
                      <td>{s.customer.businessName}</td>
                      <td className="r num">{D(s.metalLedgerImpact.toString()).isZero() ? <span className="text-faint">—</span> : formatFine(s.metalLedgerImpact.toString())}</td>
                      <td className="r num font-medium">{formatMoney(s.grandTotal.toString())}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Outstanding Customers" className="lg:col-span-2" action={<Link href="/customers" className="text-[13px] text-accent hover:underline">All customers</Link>}>
          {topMoney.length === 0 ? <EmptyState icon={<Users size={28} />} title="Nothing outstanding" hint="Customers who owe money will appear here." /> : (
            <ul>
              {topMoney.map((r) => (
                <li key={r.id}><Link href={`/customers/${r.id}`} className="flex items-center justify-between border-b border-border px-5 py-3 last:border-0 hover:bg-bg">
                  <span className="truncate text-[14px]">{r.name}</span>
                  <span className="num text-[14px] font-semibold">{formatMoney(r.money, { dp: 0 })}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Gold Position" className="lg:col-span-2">
          {topFine.length === 0 ? <EmptyState title="No gold balances" /> : (
            <ul>
              {topFine.map((r) => (
                <li key={r.id}><Link href={`/customers/${r.id}`} className="flex items-center justify-between border-b border-border px-5 py-3 last:border-0 hover:bg-bg">
                  <span className="truncate text-[14px]">{r.name}</span>
                  <span className="num text-[14px] font-semibold text-accent">{formatBalance(r.fine, "fine")}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Approval Pending" className="lg:col-span-2">
          {approvals.length === 0 ? <EmptyState icon={<Hourglass size={26} />} title="No approval items pending" /> : (
            <ul>
              {approvals.map((a) => (
                <li key={a.id} className="flex items-center justify-between border-b border-border px-5 py-3 last:border-0">
                  <div><div className="text-[14px]">{a.customer.businessName}</div><div className="text-xs text-muted">{a.number} · {formatDate(a.date)}</div></div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Aging Stock" className="lg:col-span-1">
          {aging.length === 0 ? <EmptyState icon={<PackageSearch size={26} />} title="No aging stock" hint="Items unsold for 90+ days." /> : (
            <ul>
              {aging.map((p) => (
                <li key={p.id} className="flex items-center justify-between border-b border-border px-5 py-3 text-[13.5px] last:border-0"><span>{p.designNo}</span><span className="num text-muted">{formatWeight(p.netWeight.toString())}</span></li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
