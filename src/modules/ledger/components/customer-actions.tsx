"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Coins, Loader2, Receipt, Repeat2, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { recordCashReceipt, recordGoldReceipt, recordRateFixing } from "../actions";
import { D } from "@/lib/calculations/decimal";
import { calculateFineWeight } from "@/lib/calculations/weight";
import { formatFine, formatMoney } from "@/lib/utils";

type Kind = "cash" | "gold" | "rate" | null;
const today = () => new Date().toLocaleDateString("en-CA");

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4" onMouseDown={onClose} onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className="card w-full max-w-md bg-surface p-6" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold">{title}</h2><button className="btn btn-ghost btn-sm !px-2" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
        {children}
      </div>
    </div>
  );
}

export function CustomerActions({ customerId, fineDue, canCash, canGold, canRate }: { customerId: string; fineDue: string; canCash: boolean; canGold: boolean; canRate: boolean }) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>(null);
  const [pending, start] = useTransition();
  const [f, setF] = useState({ date: today(), amount: "", mode: "CASH", ref: "", weight: "", touch: "92", fine: "", rate: "", remarks: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  const close = () => { setKind(null); setF((s) => ({ ...s, amount: "", ref: "", weight: "", fine: "", rate: "", remarks: "" })); };
  const [confirm, setConfirm] = useState(false);

  const goldFine = calculateFineWeight(f.weight || 0, f.touch || 0);
  const rateAmount = D(f.fine).times(D(f.rate));

  function done(r: { ok: boolean; error?: string }, msg: string) {
    if (!r.ok) { toast.error(r.error); setConfirm(false); return; }
    toast.success(msg); close(); setConfirm(false); router.refresh();
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (kind === "rate" && !confirm) return setConfirm(true); // explicit confirmation for rate fixing
    start(async () => {
      if (kind === "cash") done(await recordCashReceipt({ customerId, date: f.date, amount: f.amount, paymentMode: f.mode as "CASH", referenceNo: f.ref, remarks: f.remarks }), "Payment recorded");
      if (kind === "gold") done(await recordGoldReceipt({ customerId, date: f.date, physicalWeight: f.weight, touch: f.touch, reference: f.ref, remarks: f.remarks }), "Gold receipt saved");
      if (kind === "rate") done(await recordRateFixing({ customerId, date: f.date, fineWeight: f.fine, rate: f.rate, reference: f.ref, notes: f.remarks }), "Rate fixing saved");
    });
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Link href={`/sales/new?customer=${customerId}`} className="btn btn-primary"><Plus size={16} /> New Sale</Link>
        {canGold && <button className="btn" onClick={() => setKind("gold")}><Coins size={16} /> Gold Receipt</button>}
        {canCash && <button className="btn" onClick={() => setKind("cash")}><Receipt size={16} /> Payment</button>}
        {canRate && <button className="btn" onClick={() => setKind("rate")}><Repeat2 size={16} /> Rate Fix</button>}
      </div>

      {kind && (
        <Modal title={kind === "cash" ? "Record payment" : kind === "gold" ? "Gold receipt" : "Rate fixing"} onClose={close}>
          <form onSubmit={submit} className="space-y-4">
            <div><label className="label">Date</label><input type="date" className="field" value={f.date} onChange={set("date")} required /></div>

            {kind === "cash" && <>
              <div><label className="label">Amount (₹)</label><input className="field num" inputMode="decimal" value={f.amount} onChange={set("amount")} autoFocus required /></div>
              <div><label className="label">Payment mode</label>
                <select className="field" value={f.mode} onChange={set("mode")}>{["CASH", "UPI", "BANK_TRANSFER", "NEFT", "RTGS", "CHEQUE", "CARD", "OTHER"].map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}</select></div>
            </>}

            {kind === "gold" && <>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Physical weight (g)</label><input className="field num" inputMode="decimal" value={f.weight} onChange={set("weight")} autoFocus required /></div>
                <div><label className="label">Touch</label><input className="field num" inputMode="decimal" value={f.touch} onChange={set("touch")} required /></div>
              </div>
              <div className="rounded-md bg-accent-soft px-4 py-3"><div className="text-xs text-muted">Fine gold received</div><div className="num text-2xl font-semibold text-accent">{formatFine(goldFine)}</div></div>
            </>}

            {kind === "rate" && <>
              <p className="text-[13px] text-muted">Customer currently owes <b className="num text-ink">{formatFine(fineDue)}</b> fine gold.</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Fine weight to fix (g)</label><input className="field num" inputMode="decimal" value={f.fine} onChange={set("fine")} autoFocus required /></div>
                <div><label className="label">Rate (₹/g)</label><input className="field num" inputMode="decimal" value={f.rate} onChange={set("rate")} required /></div>
              </div>
              <div className="rounded-md bg-subtle px-4 py-3"><div className="text-xs text-muted">Cash value</div><div className="num text-2xl font-semibold">{formatMoney(rateAmount)}</div></div>
              {confirm && <div className="rounded-md border border-[#f1d9a6] bg-warn-soft px-4 py-3 text-[13.5px] text-warn">
                Rate fixing <b className="num">{formatFine(f.fine)}</b> will reduce the customer&apos;s gold balance by {formatFine(f.fine)} and add <b className="num">{formatMoney(rateAmount)}</b> to the money ledger.
              </div>}
            </>}

            <div><label className="label">Reference</label><input className="field" value={f.ref} onChange={set("ref")} /></div>
            <div><label className="label">Remarks</label><input className="field" value={f.remarks} onChange={set("remarks")} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn" onClick={close}>Cancel</button>
              <button className="btn btn-primary" disabled={pending}>{pending && <Loader2 size={16} className="animate-spin" />}{kind === "rate" && !confirm ? "Review" : kind === "rate" ? "Confirm rate fixing" : "Save"}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
