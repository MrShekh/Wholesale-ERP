"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Printer, XCircle, Settings2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cancelSaleAction } from "../actions";
import { cn, formatDate, formatFine, formatMoney, formatWeight } from "@/lib/utils";
import { D } from "@/lib/calculations/decimal";
import { StatusBadge } from "@/components/page";

export interface InvoiceData {
  id: string;
  number: string;
  date: string;
  dueDate: string | null;
  status: string;
  billingMode: "MONEY" | "METAL";
  placeOfSupplyState: string | null;
  placeOfSupplyCode: string | null;
  isInterState: boolean;
  gstRate: string;
  totalPieces: number;
  grossWeight: string;
  stoneWeight: string;
  otherWeight: string;
  netWeight: string;
  fineWeight: string;
  goldValue: string;
  makingAmount: string;
  stoneAmount: string;
  otherCharges: string;
  discount: string;
  taxableAmount: string;
  cgst: string;
  sgst: string;
  igst: string;
  gstAmount: string;
  roundOff: string;
  grandTotal: string;
  metalLedgerImpact: string;
  moneyLedgerImpact: string;
  notes: string | null;
  terms: string | null;
  customer: {
    id: string;
    code: string;
    businessName: string;
    contactPerson: string | null;
    phone: string | null;
    gstin: string | null;
    pan: string | null;
    billingAddress: string | null;
    shippingAddress: string | null;
    state: string | null;
    stateCode: string | null;
  };
  business: {
    name: string;
    legalName: string | null;
    gstin: string | null;
    pan: string | null;
    address: string | null;
    city: string | null;
    state: string;
    stateCode: string;
    phone: string | null;
    email: string | null;
    bankName: string | null;
    accountNumber: string | null;
    ifsc: string | null;
    upi: string | null;
    terms: string | null;
  };
  items: Array<{
    id: string;
    lineNo: number;
    description: string;
    designNo: string | null;
    hsn: string | null;
    pieces: number;
    grossWeight: string;
    stoneWeight: string;
    otherWeight: string;
    netWeight: string;
    touch: string;
    fineWeight: string;
    goldRate: string;
    makingType: string;
    makingRate: string;
    makingAmount: string;
    stoneAmount: string;
    otherCharges: string;
    discount: string;
    taxableAmount: string;
    gstAmount: string;
    lineTotal: string;
  }>;
  cancelledAt?: string | null;
  cancelReason?: string | null;
}

export function InvoiceView({
  sale,
  canCancel,
}: {
  sale: InvoiceData;
  canCancel: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [cancelModal, setCancelModal] = useState(false);
  const [reason, setReason] = useState("");

  // Configurable invoice columns (Spec §30)
  const [cols, setCols] = useState({
    design: true,
    hsn: true,
    pieces: true,
    grossWeight: true,
    stoneWeight: true,
    otherWeight: false,
    netWeight: true,
    touch: true,
    fineWeight: true,
    goldRate: sale.billingMode === "MONEY",
    makingRate: false,
    makingAmount: true,
    stoneAmount: true,
    taxable: true,
    gst: false,
    total: true,
  });
  const [showConfig, setShowConfig] = useState(false);

  const toggleCol = (k: keyof typeof cols) => {
    setCols((c) => ({ ...c, [k]: !c[k] }));
  };

  const handleCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Please enter a cancellation reason.");
      return;
    }
    start(async () => {
      const res = await cancelSaleAction(sale.id, reason);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Invoice ${res.data.number} has been cancelled`);
      setCancelModal(false);
      router.refresh();
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Top action bar (hidden on print) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold">{sale.number}</span>
          <StatusBadge status={sale.status} />
          <span className="text-xs font-medium text-muted">
            {sale.billingMode === "METAL" ? "Metal + Charges Billing" : "Money Billing"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setShowConfig((s) => !s)}
          >
            <Settings2 size={15} /> Customize Columns
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => window.print()}
          >
            <Printer size={15} /> Print / PDF
          </button>
          {canCancel && sale.status === "ACTIVE" && (
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => setCancelModal(true)}
            >
              <XCircle size={15} /> Cancel Bill
            </button>
          )}
        </div>
      </div>

      {/* Column Configurator Drawer (Spec §30) */}
      {showConfig && (
        <div className="no-print card p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold">Customize Invoice Table Columns</span>
            <button
              type="button"
              className="text-xs text-muted hover:text-ink"
              onClick={() => setShowConfig(false)}
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 md:grid-cols-6">
            {[
              ["design", "Design No"],
              ["hsn", "HSN Code"],
              ["pieces", "Pieces"],
              ["grossWeight", "Gross Weight"],
              ["stoneWeight", "Stone Weight"],
              ["otherWeight", "Other Weight"],
              ["netWeight", "Net Weight"],
              ["touch", "Touch / Purity"],
              ["fineWeight", "Fine Weight"],
              ["goldRate", "Gold Rate"],
              ["makingRate", "Making Rate"],
              ["makingAmount", "Making Amount"],
              ["stoneAmount", "Stone Amount"],
              ["taxable", "Taxable Value"],
              ["gst", "GST Amount"],
              ["total", "Line Amount"],
            ].map(([k, label]) => (
              <label
                key={k}
                className="flex cursor-pointer items-center gap-2 rounded p-1 hover:bg-subtle"
              >
                <input
                  type="checkbox"
                  checked={cols[k as keyof typeof cols]}
                  onChange={() => toggleCol(k as keyof typeof cols)}
                  className="accent-[#14532d]"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Cancel notice if cancelled */}
      {sale.status === "CANCELLED" && (
        <div className="rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
          <div className="font-semibold">This invoice was cancelled.</div>
          <div className="text-xs mt-1">
            Reason: {sale.cancelReason ?? "No reason specified."}
          </div>
        </div>
      )}

      {/* Printable Invoice Page (A4 Paper layout) */}
      <div className="card min-h-[1050px] bg-white p-8 text-ink shadow-sm print:m-0 print:border-none print:p-0 print:shadow-none">
        {/* Company Header */}
        <div className="flex flex-wrap items-start justify-between border-b border-border pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              {sale.business.name}
            </h1>
            {sale.business.legalName && (
              <div className="text-xs text-muted">{sale.business.legalName}</div>
            )}
            <div className="mt-1 max-w-sm text-xs text-muted">
              {sale.business.address}, {sale.business.city}, {sale.business.state} -{" "}
              {sale.business.stateCode}
            </div>
            <div className="mt-2 text-xs">
              {sale.business.gstin && <span><b>GSTIN:</b> {sale.business.gstin} · </span>}
              {sale.business.phone && <span><b>Tel:</b> {sale.business.phone}</span>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold uppercase tracking-wider text-accent">
              Tax Invoice / Wholesale Memo
            </div>
            <div className="num mt-1 text-xl font-bold">{sale.number}</div>
            <div className="mt-1 text-xs text-muted">Date: {formatDate(sale.date)}</div>
            {sale.dueDate && (
              <div className="text-xs text-muted">Due Date: {formatDate(sale.dueDate)}</div>
            )}
            <div className="mt-2 inline-block rounded bg-subtle px-2.5 py-1 text-xs font-semibold">
              Mode: {sale.billingMode === "METAL" ? "Metal + Charges" : "Regular Money Billing"}
            </div>
          </div>
        </div>

        {/* Customer & Bill-to details */}
        <div className="grid grid-cols-2 gap-6 border-b border-border py-4 text-xs">
          <div>
            <div className="font-semibold uppercase text-muted">Billed To</div>
            <div className="mt-1 text-sm font-bold">{sale.customer.businessName}</div>
            {sale.customer.contactPerson && (
              <div className="text-muted">Attn: {sale.customer.contactPerson}</div>
            )}
            <div className="mt-1 text-muted">
              {sale.customer.billingAddress ?? "—"}
            </div>
            <div className="mt-1">
              <b>State:</b> {sale.customer.state ?? "—"} ({sale.customer.stateCode ?? "—"})
            </div>
            {sale.customer.gstin && (
              <div className="mt-0.5">
                <b>GSTIN:</b> {sale.customer.gstin}
              </div>
            )}
            {sale.customer.phone && (
              <div className="mt-0.5">
                <b>Phone:</b> {sale.customer.phone}
              </div>
            )}
          </div>
          <div>
            <div className="font-semibold uppercase text-muted">Place of Supply & Delivery</div>
            <div className="mt-1 text-muted">
              <b>Place of Supply:</b> {sale.placeOfSupplyState ?? "—"} (Code:{" "}
              {sale.placeOfSupplyCode ?? "—"})
            </div>
            <div className="mt-1 text-muted">
              <b>Tax Type:</b> {sale.isInterState ? "Inter-State (IGST)" : "Intra-State (CGST + SGST)"}
            </div>
            {sale.customer.shippingAddress && (
              <div className="mt-2 text-muted">
                <b>Shipping Address:</b> {sale.customer.shippingAddress}
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="dt !text-xs">
            <thead>
              <tr className="border-b border-border-strong">
                <th className="w-8">#</th>
                <th>Description</th>
                {cols.design && <th>Design</th>}
                {cols.hsn && <th>HSN</th>}
                {cols.pieces && <th className="r">Pcs</th>}
                {cols.grossWeight && <th className="r">Gross (g)</th>}
                {cols.stoneWeight && <th className="r">Stone (g)</th>}
                {cols.otherWeight && <th className="r">Other (g)</th>}
                {cols.netWeight && <th className="r">Net (g)</th>}
                {cols.touch && <th className="r">Touch</th>}
                {cols.fineWeight && <th className="r">Fine (g)</th>}
                {cols.goldRate && <th className="r">Rate/g</th>}
                {cols.makingRate && <th className="r">Making Rate</th>}
                {cols.makingAmount && <th className="r">Making (₹)</th>}
                {cols.stoneAmount && <th className="r">Stone (₹)</th>}
                {cols.taxable && <th className="r">Taxable (₹)</th>}
                {cols.gst && <th className="r">GST (₹)</th>}
                {cols.total && <th className="r">Total (₹)</th>}
              </tr>
            </thead>
            <tbody>
              {sale.items.map((it, idx) => (
                <tr key={it.id}>
                  <td className="text-muted">{idx + 1}</td>
                  <td className="font-medium">{it.description}</td>
                  {cols.design && <td className="num">{it.designNo ?? "—"}</td>}
                  {cols.hsn && <td className="num">{it.hsn ?? "7113"}</td>}
                  {cols.pieces && <td className="r num">{it.pieces}</td>}
                  {cols.grossWeight && <td className="r num">{formatWeight(it.grossWeight, 3, false)}</td>}
                  {cols.stoneWeight && <td className="r num">{formatWeight(it.stoneWeight, 3, false)}</td>}
                  {cols.otherWeight && <td className="r num">{formatWeight(it.otherWeight, 3, false)}</td>}
                  {cols.netWeight && <td className="r num font-semibold">{formatWeight(it.netWeight, 3, false)}</td>}
                  {cols.touch && <td className="r num">{it.touch}</td>}
                  {cols.fineWeight && <td className="r num font-semibold text-accent">{formatFine(it.fineWeight, false)}</td>}
                  {cols.goldRate && <td className="r num">{D(it.goldRate).isZero() ? "—" : formatMoney(it.goldRate)}</td>}
                  {cols.makingRate && <td className="r num">{formatMoney(it.makingRate)}</td>}
                  {cols.makingAmount && <td className="r num">{formatMoney(it.makingAmount)}</td>}
                  {cols.stoneAmount && <td className="r num">{formatMoney(it.stoneAmount)}</td>}
                  {cols.taxable && <td className="r num font-medium">{formatMoney(it.taxableAmount)}</td>}
                  {cols.gst && <td className="r num">{formatMoney(it.gstAmount)}</td>}
                  {cols.total && <td className="r num font-semibold">{formatMoney(it.lineTotal)}</td>}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border-strong font-semibold">
                <td colSpan={2}>Total</td>
                {cols.design && <td />}
                {cols.hsn && <td />}
                {cols.pieces && <td className="r num">{sale.totalPieces}</td>}
                {cols.grossWeight && <td className="r num">{formatWeight(sale.grossWeight, 3, false)}</td>}
                {cols.stoneWeight && <td className="r num">{formatWeight(sale.stoneWeight, 3, false)}</td>}
                {cols.otherWeight && <td className="r num">{formatWeight(sale.otherWeight, 3, false)}</td>}
                {cols.netWeight && <td className="r num">{formatWeight(sale.netWeight, 3, false)}</td>}
                {cols.touch && <td />}
                {cols.fineWeight && <td className="r num text-accent">{formatFine(sale.fineWeight, false)}</td>}
                {cols.goldRate && <td />}
                {cols.makingRate && <td />}
                {cols.makingAmount && <td className="r num">{formatMoney(sale.makingAmount)}</td>}
                {cols.stoneAmount && <td className="r num">{formatMoney(sale.stoneAmount)}</td>}
                {cols.taxable && <td className="r num">{formatMoney(sale.taxableAmount)}</td>}
                {cols.gst && <td className="r num">{formatMoney(sale.gstAmount)}</td>}
                {cols.total && <td className="r num">{formatMoney(sale.grandTotal)}</td>}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Bottom Section: Bank / Terms | Calculations & Accounting Split */}
        <div className="mt-8 grid grid-cols-2 gap-8 border-t border-border pt-6 text-xs">
          <div className="space-y-4">
            <div>
              <div className="font-semibold uppercase text-muted">Bank Details</div>
              <div className="mt-1"><b>Bank:</b> {sale.business.bankName ?? "—"}</div>
              <div><b>A/C No:</b> {sale.business.accountNumber ?? "—"}</div>
              <div><b>IFSC:</b> {sale.business.ifsc ?? "—"}</div>
              {sale.business.upi && <div><b>UPI ID:</b> {sale.business.upi}</div>}
            </div>

            <div>
              <div className="font-semibold uppercase text-muted">Terms & Conditions</div>
              <div className="mt-1 whitespace-pre-line text-muted">
                {sale.terms || sale.business.terms || "Subject to local jurisdiction."}
              </div>
            </div>

            {sale.notes && (
              <div>
                <div className="font-semibold uppercase text-muted">Notes</div>
                <div className="mt-1 text-muted">{sale.notes}</div>
              </div>
            )}
          </div>

          <div className="space-y-2 text-sm">
            <div className="rounded-lg bg-subtle p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">
                Accounting Impact
              </div>
              <div className="mt-2 flex justify-between border-b border-border pb-2">
                <span>Customer Gold Ledger:</span>
                <span className="num font-bold text-accent">
                  {D(sale.metalLedgerImpact).isZero()
                    ? "0.0000 g"
                    : `+${formatFine(sale.metalLedgerImpact)}`}
                </span>
              </div>
              <div className="mt-2 flex justify-between">
                <span>Customer Money Ledger:</span>
                <span className="num font-bold">
                  +{formatMoney(sale.moneyLedgerImpact)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 text-xs">
              {sale.billingMode === "MONEY" && (
                <div className="flex justify-between">
                  <span className="text-muted">Total Gold Value:</span>
                  <span className="num font-medium">{formatMoney(sale.goldValue)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted">Making Charges:</span>
                <span className="num font-medium">{formatMoney(sale.makingAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Stone Charges:</span>
                <span className="num font-medium">{formatMoney(sale.stoneAmount)}</span>
              </div>
              {!D(sale.otherCharges).isZero() && (
                <div className="flex justify-between">
                  <span className="text-muted">Other Charges:</span>
                  <span className="num font-medium">{formatMoney(sale.otherCharges)}</span>
                </div>
              )}
              {!D(sale.discount).isZero() && (
                <div className="flex justify-between text-danger">
                  <span>Discount:</span>
                  <span className="num font-medium">− {formatMoney(sale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
                <span>Taxable Amount:</span>
                <span className="num">{formatMoney(sale.taxableAmount)}</span>
              </div>
              {sale.isInterState ? (
                <div className="flex justify-between">
                  <span className="text-muted">IGST ({sale.gstRate}%):</span>
                  <span className="num font-medium">{formatMoney(sale.igst)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted">CGST ({(Number(sale.gstRate) / 2).toFixed(1)}%):</span>
                    <span className="num font-medium">{formatMoney(sale.cgst)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">SGST ({(Number(sale.gstRate) / 2).toFixed(1)}%):</span>
                    <span className="num font-medium">{formatMoney(sale.sgst)}</span>
                  </div>
                </>
              )}
              {!D(sale.roundOff).isZero() && (
                <div className="flex justify-between">
                  <span className="text-muted">Round Off:</span>
                  <span className="num">{formatMoney(sale.roundOff)}</span>
                </div>
              )}
              <div className="flex justify-between border-t-2 border-border-strong pt-2 text-base font-bold text-ink">
                <span>Invoice Total:</span>
                <span className="num">{formatMoney(sale.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Signatures */}
        <div className="mt-16 flex items-end justify-between border-t border-border pt-8 text-xs text-muted">
          <div>
            <div className="h-12" />
            <div>Customer&apos;s Signature</div>
          </div>
          <div className="text-right">
            <div className="h-12" />
            <div className="font-semibold text-ink">For {sale.business.name}</div>
            <div>Authorised Signatory</div>
          </div>
        </div>
      </div>

      {/* Cancellation Modal with Audit tracking (Spec §35 & §36) */}
      {cancelModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4"
          onMouseDown={() => setCancelModal(false)}
        >
          <div
            className="card w-full max-w-md bg-surface p-6"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-danger">Cancel Invoice {sale.number}</h2>
              <button
                type="button"
                className="btn btn-ghost btn-sm !px-2"
                onClick={() => setCancelModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCancel} className="space-y-4">
              <div className="rounded-md border border-danger/30 bg-danger-soft p-3 text-xs text-danger">
                <b>Warning:</b> Cancelling this invoice will automatically:
                <ul className="mt-1 list-disc pl-4 space-y-0.5">
                  <li>Restore all {sale.items.length} jewellery items back to available stock.</li>
                  <li>Post reversing entries on the customer metal & money ledgers.</li>
                  <li>Reverse tax liability entries.</li>
                  <li>Record an un-erasable audit log.</li>
                </ul>
              </div>

              <div>
                <label className="label" htmlFor="cancelReason">
                  Reason for cancellation *
                </label>
                <input
                  id="cancelReason"
                  className="field"
                  placeholder="e.g. Customer cancelled order / Wrong customer selected"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setCancelModal(false)}
                >
                  Keep Invoice
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={pending}
                >
                  {pending && <Loader2 size={16} className="animate-spin" />}
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
