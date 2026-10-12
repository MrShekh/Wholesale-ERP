import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader } from "@/components/page";
import { formatMoney, formatFine } from "@/lib/utils";

export const metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await requirePermission("reports.view");

  const [salesByCustomer, stockByPurity, outstandingCustomers] = await Promise.all([
    db.sale.groupBy({
      by: ["customerId"],
      where: { status: "ACTIVE" },
      _sum: { grandTotal: true, fineWeight: true, netWeight: true },
      _count: true,
      orderBy: { _sum: { grandTotal: "desc" } },
      take: 10,
    }),
    db.product.groupBy({
      by: ["purityId"],
      where: { status: "AVAILABLE", isDeleted: false },
      _sum: { netWeight: true, fineWeight: true, pieces: true },
      _count: true,
    }),
    db.customer.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        businessName: true,
        code: true,
        creditLimit: true,
        moneyLedger: {
          where: { status: "ACTIVE" },
          select: { debit: true, credit: true, date: true },
        },
        metalLedger: {
          where: { status: "ACTIVE" },
          select: { debitFine: true, creditFine: true },
        },
        openingCash: true,
        openingFine: true,
      },
      take: 15,
    }),
  ]);

  const customerMap = new Map(
    (await db.customer.findMany({ select: { id: true, businessName: true, code: true } })).map((c) => [
      c.id,
      c,
    ]),
  );

  const purityMap = new Map(
    (await db.purity.findMany({ select: { id: true, name: true, touch: true } })).map((p) => [
      p.id,
      p,
    ]),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wholesale Reports"
        subtitle="Business financial ledgers, gold position & customer balances"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Customer Sales Report */}
        <section className="card p-5">
          <h2 className="text-base font-semibold">Top Customers by Sales Volume</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="dt">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th className="r">Invoices</th>
                  <th className="r">Net (g)</th>
                  <th className="r">Fine (g)</th>
                  <th className="r">Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {salesByCustomer.map((s) => {
                  const cust = customerMap.get(s.customerId);
                  return (
                    <tr key={s.customerId}>
                      <td>
                        <span className="font-medium">{cust?.businessName ?? "Unknown"}</span>
                        <span className="ml-1 text-xs text-muted">({cust?.code})</span>
                      </td>
                      <td className="r num">{s._count}</td>
                      <td className="r num">{Number(s._sum.netWeight ?? 0).toFixed(3)}</td>
                      <td className="r num text-accent font-medium">
                        {formatFine(s._sum.fineWeight?.toString())}
                      </td>
                      <td className="r num font-semibold">
                        {formatMoney(s._sum.grandTotal?.toString())}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Stock by Purity */}
        <section className="card p-5">
          <h2 className="text-base font-semibold">Available Stock by Purity</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="dt">
              <thead>
                <tr>
                  <th>Purity</th>
                  <th className="r">Touch</th>
                  <th className="r">Pieces</th>
                  <th className="r">Net Weight</th>
                  <th className="r">Fine Gold</th>
                </tr>
              </thead>
              <tbody>
                {stockByPurity.map((p) => {
                  const item = purityMap.get(p.purityId);
                  return (
                    <tr key={p.purityId}>
                      <td className="font-medium">{item?.name ?? "—"}</td>
                      <td className="r num">{item?.touch ? Number(item.touch).toFixed(1) : "—"}</td>
                      <td className="r num">{p._sum.pieces ?? p._count}</td>
                      <td className="r num">{Number(p._sum.netWeight ?? 0).toFixed(3)} g</td>
                      <td className="r num font-semibold text-accent">
                        {formatFine(p._sum.fineWeight?.toString())}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Customer Balances & Ageing */}
      <section className="card p-5">
        <h2 className="text-base font-semibold">Customer Ledgers & Outstanding Position</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="dt">
            <thead>
              <tr>
                <th>Customer</th>
                <th className="r">Fine Gold Balance</th>
                <th className="r">Money Balance</th>
                <th className="r">Credit Limit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {outstandingCustomers.map((c) => {
                let goldBal = Number(c.openingFine);
                c.metalLedger.forEach((m) => {
                  goldBal += Number(m.debitFine) - Number(m.creditFine);
                });

                let moneyBal = Number(c.openingCash);
                c.moneyLedger.forEach((m) => {
                  moneyBal += Number(m.debit) - Number(m.credit);
                });

                return (
                  <tr key={c.id}>
                    <td>
                      <span className="font-medium">{c.businessName}</span>
                      <span className="ml-1 text-xs text-muted">({c.code})</span>
                    </td>
                    <td className="r num font-semibold text-accent">
                      {goldBal === 0 ? "—" : `${goldBal.toFixed(4)} g ${goldBal > 0 ? "Dr" : "Cr"}`}
                    </td>
                    <td className="r num font-semibold">
                      {moneyBal === 0 ? "—" : `${formatMoney(Math.abs(moneyBal))} ${moneyBal > 0 ? "Dr" : "Cr"}`}
                    </td>
                    <td className="r num text-muted">
                      {Number(c.creditLimit) > 0 ? formatMoney(c.creditLimit.toString(), { dp: 0 }) : "None"}
                    </td>
                    <td>
                      {moneyBal > Number(c.creditLimit) && Number(c.creditLimit) > 0 ? (
                        <span className="badge badge-red">Over Limit</span>
                      ) : goldBal > 0 || moneyBal > 0 ? (
                        <span className="badge badge-amber">Receivable</span>
                      ) : (
                        <span className="badge badge-green">Clear</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
