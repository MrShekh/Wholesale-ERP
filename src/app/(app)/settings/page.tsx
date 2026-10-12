import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader } from "@/components/page";
import { formatMoney } from "@/lib/utils";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requirePermission("settings.manage");

  const [business, gstRates, purities, metals, rates] = await Promise.all([
    db.business.findUnique({ where: { id: "main" } }),
    db.gstRate.findMany({ orderBy: { rate: "asc" } }),
    db.purity.findMany({ include: { metal: true }, orderBy: { touch: "desc" } }),
    db.metal.findMany(),
    db.metalRate.findMany({
      orderBy: { date: "desc" },
      distinct: ["purityId"],
      include: { purity: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="ERP Settings"
        subtitle="Manage company profile, GST rates, purity definitions, and gold rates"
      />

      {/* Business Profile */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold">Business Profile (Pune Headquarters)</h2>
        <p className="text-xs text-muted mt-0.5">
          Appears on all wholesale invoices, memos, and accounting vouchers.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3 text-sm">
          <div>
            <span className="block text-xs font-medium text-muted">Business Name</span>
            <span className="font-semibold text-ink">{business?.name}</span>
          </div>
          <div>
            <span className="block text-xs font-medium text-muted">Legal Name</span>
            <span>{business?.legalName ?? "—"}</span>
          </div>
          <div>
            <span className="block text-xs font-medium text-muted">GSTIN</span>
            <span className="font-semibold">{business?.gstin ?? "—"}</span>
          </div>
          <div>
            <span className="block text-xs font-medium text-muted">PAN</span>
            <span>{business?.pan ?? "—"}</span>
          </div>
          <div>
            <span className="block text-xs font-medium text-muted">State & Code</span>
            <span>
              {business?.state} (Code: {business?.stateCode})
            </span>
          </div>
          <div>
            <span className="block text-xs font-medium text-muted">Contact Tel</span>
            <span>{business?.phone ?? "—"}</span>
          </div>
          <div className="sm:col-span-2">
            <span className="block text-xs font-medium text-muted">Address</span>
            <span>
              {business?.address}, {business?.city}, {business?.state} - {business?.pincode}
            </span>
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-4">
          <h3 className="text-sm font-semibold">Bank & Settlement Details</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <span className="block text-xs font-medium text-muted">Bank Name</span>
              <span className="font-medium">{business?.bankName ?? "—"}</span>
            </div>
            <div>
              <span className="block text-xs font-medium text-muted">Account Number</span>
              <span className="num font-medium">{business?.accountNumber ?? "—"}</span>
            </div>
            <div>
              <span className="block text-xs font-medium text-muted">IFSC Code</span>
              <span className="font-medium">{business?.ifsc ?? "—"}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Gold Rates Today */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold">Active Daily Metal Rates</h2>
        <p className="text-xs text-muted mt-0.5">
          Rates automatically loaded into the sale entry screen. Invoice-specific rates can also be entered directly.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="dt">
            <thead>
              <tr>
                <th>Purity / Metal</th>
                <th className="r">Touch %</th>
                <th className="r">Today&apos;s Rate per Gram</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((r) => (
                <tr key={r.id}>
                  <td className="font-medium">{r.purity?.name ?? "Base"}</td>
                  <td className="r num">{r.purity ? Number(r.purity.touch).toFixed(1) : "—"}</td>
                  <td className="r num font-semibold text-accent">
                    {formatMoney(r.ratePerGram.toString())}
                  </td>
                  <td className="text-xs text-muted">{r.source ?? "Manual"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Purity Master & GST Rates */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-base font-semibold">Purity Master</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="dt !text-xs">
              <thead>
                <tr>
                  <th>Metal</th>
                  <th>Name</th>
                  <th className="r">Karat</th>
                  <th className="r">Touch %</th>
                </tr>
              </thead>
              <tbody>
                {purities.map((p) => (
                  <tr key={p.id}>
                    <td>{p.metal.name}</td>
                    <td className="font-medium">{p.name}</td>
                    <td className="r num">{p.karat ? `${Number(p.karat)}K` : "—"}</td>
                    <td className="r num font-semibold">{Number(p.touch).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-base font-semibold">GST Rates & Taxation</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="dt !text-xs">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>HSN Code</th>
                  <th className="r">Total GST %</th>
                  <th>Default</th>
                </tr>
              </thead>
              <tbody>
                {gstRates.map((g) => (
                  <tr key={g.id}>
                    <td className="font-medium">{g.name}</td>
                    <td className="num">{g.hsn}</td>
                    <td className="r num font-semibold">{Number(g.rate).toFixed(1)}%</td>
                    <td>
                      {g.isDefault ? (
                        <span className="badge badge-green">Default</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-md bg-subtle p-3 text-xs text-muted">
            <b>Tax Logic:</b> Intra-state transactions within Maharashtra ({business?.stateCode ?? "27"}) automatically apply CGST (50%) + SGST (50%). Out-of-state transactions automatically apply full IGST.
          </div>
        </section>
      </div>
    </div>
  );
}
