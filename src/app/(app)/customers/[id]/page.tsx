import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { customerFineBalance, customerMoneyBalance } from "@/lib/accounting/balances";
import { D } from "@/lib/calculations/decimal";
import { cn, formatBalance, formatDate, formatFine, formatMoney, formatWeight } from "@/lib/utils";
import { EmptyState, StatusBadge } from "@/components/page";
import { CustomerActions } from "@/modules/ledger/components/customer-actions";

export const dynamic = "force-dynamic";
const TABS = [["overview", "Overview"], ["sales", "Sales"], ["gold", "Gold Ledger"], ["money", "Money Ledger"], ["payments", "Payments"]] as const;

export default async function CustomerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const s = await requirePermission("customer.view");
  const { id } = await params;
  const tab = (await searchParams).tab ?? "overview";
  const c = await db.customer.findUnique({ where: { id }, include: { priceGroup: true } });
  if (!c || c.isDeleted) notFound();

  const [fine, money] = await Promise.all([customerFineBalance(id), customerMoneyBalance(id)]);
  const lastSale = await db.sale.findFirst({ where: { customerId: id, status: "ACTIVE" }, orderBy: { date: "desc" } });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3"><h1 className="text-[28px] font-semibold tracking-tight">{c.businessName}</h1><StatusBadge status={c.status} /></div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-muted">
            <span className="inline-flex items-center gap-1"><MapPin size={14} />{[c.city, c.state].filter(Boolean).join(", ") || "—"}</span>
            {c.gstin && <span className="num">GSTIN {c.gstin}</span>}
            {c.phone && <span className="num">{c.phone}</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {s.can("customer.manage") && (
            <Link href={`/customers/${id}/edit`} className="btn">
              Edit
            </Link>
          )}
          <CustomerActions customerId={id} fineDue={fine.toString()} canCash={s.can("customer.payment")} canGold={s.can("gold.receipt")} canRate={s.can("rate.fix")} />
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="card p-5"><div className="text-[13px] font-medium text-muted">Fine Gold</div><div className="num mt-2 text-[28px] font-semibold leading-none text-accent">{formatBalance(fine, "fine")}</div></div>
        <div className="card p-5"><div className="text-[13px] font-medium text-muted">Money</div><div className="num mt-2 text-[28px] font-semibold leading-none">{formatBalance(money, "money")}</div></div>
        <div className="card p-5"><div className="text-[13px] font-medium text-muted">Credit limit</div><div className="num mt-2 text-[28px] font-semibold leading-none">{formatMoney(c.creditLimit.toString(), { dp: 0 })}</div>
          {money.greaterThan(D(c.creditLimit.toString())) && D(c.creditLimit.toString()).greaterThan(0) && <div className="mt-2 text-[13px] text-danger">Over limit</div>}</div>
      </div>

      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`?tab=${k}`} className={cn("-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-[14px] font-medium", tab === k ? "border-accent text-accent" : "border-transparent text-muted hover:text-ink")}>{label}</Link>
        ))}
      </div>

      {tab === "overview" && <Overview c={c} lastSale={lastSale} />}
      {tab === "sales" && <SalesTab id={id} />}
      {tab === "gold" && <GoldLedger id={id} opening={c.openingFine.toString()} />}
      {tab === "money" && <MoneyLedger id={id} opening={c.openingCash.toString()} />}
      {tab === "payments" && <PaymentsTab id={id} />}
    </div>
  );
}

function Overview({ c, lastSale }: { c: NonNullable<Awaited<ReturnType<typeof db.customer.findUnique>>>; lastSale: { number: string; date: Date; grandTotal: { toString(): string } } | null }) {
  const row = (k: string, v: React.ReactNode) => <div className="flex justify-between gap-4 border-b border-border py-2.5 text-[14px] last:border-0"><span className="text-muted">{k}</span><span className="text-right font-medium">{v || "—"}</span></div>;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card px-5 py-2">
        <h3 className="py-3 text-[15px] font-semibold">Details</h3>
        {row("Code", c.code)}{row("Contact", c.contactPerson)}{row("WhatsApp", c.whatsapp)}{row("Email", c.email)}{row("PAN", c.pan)}{row("State", c.state && `${c.state} (${c.stateCode ?? "—"})`)}{row("Billing address", c.billingAddress)}
      </div>
      <div className="card px-5 py-2">
        <h3 className="py-3 text-[15px] font-semibold">Billing & pricing</h3>
        {row("Default mode", c.defaultBillingMode === "METAL" ? "Metal + charges" : "Money billing")}
        {row("Making", `${formatMoney(c.defaultMakingRate.toString())} ${c.defaultMakingType.replace("_", " ").toLowerCase()}`)}
        {row("Credit days", String(c.creditDays))}
        {row("Last sale", lastSale ? `${lastSale.number} · ${formatDate(lastSale.date)} · ${formatMoney(lastSale.grandTotal.toString(), { dp: 0 })}` : "No sales yet")}
        {row("Notes", c.notes)}
      </div>
    </div>
  );
}

async function SalesTab({ id }: { id: string }) {
  const sales = await db.sale.findMany({ where: { customerId: id }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 50 });
  if (!sales.length) return <div className="card"><EmptyState title="No sales for this customer" action={<Link href={`/sales/new?customer=${id}`} className="btn btn-primary btn-sm">+ New Sale</Link>} /></div>;
  return (
    <div className="card overflow-x-auto"><table className="dt"><thead><tr><th>Invoice</th><th>Date</th><th className="r">Net</th><th className="r">Fine</th><th className="r">Amount</th><th>Status</th></tr></thead><tbody>
      {sales.map((x) => <tr key={x.id}><td><Link href={`/sales/${x.id}`} className="font-medium hover:text-accent">{x.number}</Link></td><td>{formatDate(x.date)}</td><td className="r num">{formatWeight(x.netWeight.toString())}</td><td className="r num">{formatFine(x.fineWeight.toString())}</td><td className="r num font-medium">{formatMoney(x.grandTotal.toString())}</td><td><StatusBadge status={x.status} /></td></tr>)}
    </tbody></table></div>
  );
}

async function GoldLedger({ id, opening }: { id: string; opening: string }) {
  const rows = await db.customerMetalLedger.findMany({ where: { customerId: id, status: "ACTIVE" }, orderBy: [{ date: "asc" }, { createdAt: "asc" }], take: 1000 });
  let bal = D(opening);
  return (
    <div className="card overflow-x-auto"><table className="dt"><thead><tr><th>Date</th><th>Type</th><th>Reference</th><th className="r">Debit (gold due)</th><th className="r">Credit (received)</th><th className="r">Balance</th><th>Remarks</th></tr></thead><tbody>
      <tr><td colSpan={5} className="text-muted">Opening balance</td><td className="r num font-medium">{formatBalance(opening, "fine")}</td><td /></tr>
      {rows.map((r) => { bal = bal.plus(r.debitFine.toString()).minus(r.creditFine.toString()); return (
        <tr key={r.id}><td>{formatDate(r.date)}</td><td>{r.txnType.replace(/_/g, " ").toLowerCase().replace(/^\w/, (x) => x.toUpperCase())}</td><td className="num">{r.reference}</td>
          <td className="r num">{D(r.debitFine.toString()).isZero() ? "" : formatFine(r.debitFine.toString())}</td><td className="r num text-accent">{D(r.creditFine.toString()).isZero() ? "" : formatFine(r.creditFine.toString())}</td>
          <td className="r num font-semibold">{formatBalance(bal, "fine")}</td><td className="text-muted">{r.remarks}</td></tr>); })}
    </tbody></table></div>
  );
}

async function MoneyLedger({ id, opening }: { id: string; opening: string }) {
  const rows = await db.customerMoneyLedger.findMany({ where: { customerId: id, status: "ACTIVE" }, orderBy: [{ date: "asc" }, { createdAt: "asc" }], take: 1000 });
  let bal = D(opening);
  return (
    <div className="card overflow-x-auto"><table className="dt"><thead><tr><th>Date</th><th>Type</th><th>Reference</th><th className="r">Debit</th><th className="r">Credit</th><th className="r">Balance</th><th>Mode</th></tr></thead><tbody>
      <tr><td colSpan={5} className="text-muted">Opening balance</td><td className="r num font-medium">{formatBalance(opening, "money")}</td><td /></tr>
      {rows.map((r) => { bal = bal.plus(r.debit.toString()).minus(r.credit.toString()); return (
        <tr key={r.id}><td>{formatDate(r.date)}</td><td>{r.txnType.replace(/_/g, " ").toLowerCase().replace(/^\w/, (x) => x.toUpperCase())}</td><td className="num">{r.reference}</td>
          <td className="r num">{D(r.debit.toString()).isZero() ? "" : formatMoney(r.debit.toString())}</td><td className="r num text-accent">{D(r.credit.toString()).isZero() ? "" : formatMoney(r.credit.toString())}</td>
          <td className="r num font-semibold">{formatBalance(bal, "money")}</td><td className="text-muted">{r.paymentMode?.replace("_", " ") ?? ""}</td></tr>); })}
    </tbody></table></div>
  );
}

async function PaymentsTab({ id }: { id: string }) {
  const [cash, gold, rate] = await Promise.all([
    db.cashReceipt.findMany({ where: { customerId: id }, orderBy: { date: "desc" }, take: 30 }),
    db.goldReceipt.findMany({ where: { customerId: id }, orderBy: { date: "desc" }, take: 30 }),
    db.rateFixing.findMany({ where: { customerId: id }, orderBy: { date: "desc" }, take: 30 }),
  ]);
  const items = [
    ...cash.map((r) => ({ d: r.date, n: r.number, t: `Cash receipt · ${r.paymentMode.replace("_", " ")}`, v: formatMoney(r.amount.toString()) })),
    ...gold.map((r) => ({ d: r.date, n: r.number, t: `Gold receipt · ${formatWeight(r.physicalWeight.toString())} @ ${r.touch.toString()}`, v: formatFine(r.fineWeight.toString()) + " fine" })),
    ...rate.map((r) => ({ d: r.date, n: r.number, t: `Rate fixing @ ₹${r.rate.toString()}/g`, v: `${formatFine(r.fineWeight.toString())} → ${formatMoney(r.amount.toString())}` })),
  ].sort((a, b) => b.d.getTime() - a.d.getTime());
  if (!items.length) return <div className="card"><EmptyState title="No payments, gold receipts or rate fixings yet" /></div>;
  return <div className="card overflow-x-auto"><table className="dt"><thead><tr><th>Date</th><th>Number</th><th>Type</th><th className="r">Value</th></tr></thead><tbody>
    {items.map((i) => <tr key={i.n}><td>{formatDate(i.d)}</td><td className="num">{i.n}</td><td>{i.t}</td><td className="r num font-medium">{i.v}</td></tr>)}
  </tbody></table></div>;
}
