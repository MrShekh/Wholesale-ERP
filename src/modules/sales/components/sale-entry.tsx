"use client";

import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertTriangle, ChevronRight, Loader2, Plus, ScanBarcode, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { calculateSaleTotals, type SaleItemInput } from "@/lib/calculations/sale";
import { D } from "@/lib/calculations/decimal";
import { cn, formatBalance, formatDate, formatFine, formatMoney, formatWeight } from "@/lib/utils";
import { createSale } from "../actions";

interface Cust {
  id: string; code: string; name: string; phone: string | null; city: string | null; stateCode: string | null; state: string | null;
  creditLimit: string; creditDays: number; billingMode: "MONEY" | "METAL"; makingType: string; makingRate: string; goldMargin: string; discountPct: string;
  fine: string; money: string; lastSale: { number: string; date: string; total: string } | null;
}
interface Prod {
  id: string; itemCode: string; designNo: string; name: string; purityId: string; purity: string; touch: string; pieces: number;
  gross: string; stone: string; other: string; net: string; stoneAmount: string; makingType: string; makingCharge: string;
}
interface Row {
  key: string; productId: string | null; description: string; designNo: string; pieces: string; gross: string; stone: string; other: string;
  netOverride: string; touch: string; rate: string; makingType: string; makingRate: string; stoneAmount: string; otherCharges: string; discount: string; open: boolean;
}

const MAKING_LABEL: Record<string, string> = { PER_GRAM: "₹/g", PER_PIECE: "₹/pc", PERCENT: "%", FIXED: "₹ fixed" };
const uid = () => Math.random().toString(36).slice(2);
const blank = (m: Partial<Row> = {}): Row => ({ key: uid(), productId: null, description: "", designNo: "", pieces: "1", gross: "", stone: "0", other: "0", netOverride: "", touch: "", rate: "", makingType: "PER_GRAM", makingRate: "0", stoneAmount: "0", otherCharges: "0", discount: "0", open: false, ...m });

/** Enter moves to the next field (keyboard / numpad friendly). */
function enterNav(e: React.KeyboardEvent) {
  if (e.key !== "Enter") return;
  const t = e.target as HTMLElement;
  if (t.tagName === "TEXTAREA" || t.dataset.nonav) return;
  e.preventDefault();
  const all = Array.from(document.querySelectorAll<HTMLElement>("[data-nav]:not([disabled])"));
  const i = all.indexOf(t);
  all[i + 1]?.focus();
  (all[i + 1] as HTMLInputElement | undefined)?.select?.();
}

function useDebounced<T>(v: T, ms = 200) {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}

export function SaleEntry(props: {
  companyStateCode: string; defaultGst: string; rates: Record<string, string>; gramsPerCarat: string; roundOff: boolean; taxMetal: boolean;
  canOverrideNet: boolean; initialCustomerId?: string; today: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [cust, setCust] = useState<Cust | null>(null);
  const [date, setDate] = useState(props.today);
  const [mode, setMode] = useState<"MONEY" | "METAL">("MONEY");
  const [gst, setGst] = useState(props.defaultGst);
  const [rows, setRows] = useState<Row[]>([]);
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");

  // ---------- customer picker ----------
  const [cq, setCq] = useState("");
  const [cres, setCres] = useState<Cust[]>([]);
  const [copen, setCopen] = useState(false);
  const dcq = useDebounced(cq);
  useEffect(() => {
    if (!copen) return;
    fetch(`/api/lookup/customers?q=${encodeURIComponent(dcq)}`).then((r) => r.json()).then((j) => setCres(j.items ?? [])).catch(() => {});
  }, [dcq, copen]);

  const pickCustomer = useCallback((c: Cust) => {
    setCust(c); setMode(c.billingMode); setCopen(false); setCq("");
    // auto-load customer pricing profile into existing rows
    setRows((rs) => rs.map((r) => ({ ...r, makingType: c.makingType, makingRate: c.makingRate })));
  }, []);

  useEffect(() => {
    if (props.initialCustomerId) fetch(`/api/lookup/customers?id=${props.initialCustomerId}`).then((r) => r.json()).then((j) => j.items?.[0] && pickCustomer(j.items[0]));
  }, [props.initialCustomerId, pickCustomer]);

  // ---------- item search / barcode ----------
  const [iq, setIq] = useState("");
  const [ires, setIres] = useState<Prod[]>([]);
  const [iopen, setIopen] = useState(false);
  const diq = useDebounced(iq, 150);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!diq.trim()) { setIres([]); return; }
    fetch(`/api/lookup/products?q=${encodeURIComponent(diq.trim())}`).then((r) => r.json()).then((j) => {
      setIres(j.items ?? []);
      if (j.exact && j.items[0]) addProduct(j.items[0]); // scanner: exact barcode hit adds instantly
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diq]);

  function addProduct(p: Prod) {
    if (rows.some((r) => r.productId === p.id)) { toast.info(`${p.designNo} is already on this bill`); return; }
    const base = props.rates[p.purityId] ?? "";
    const rate = base ? D(base).plus(D(cust?.goldMargin)).toString() : "";
    setRows((rs) => [...rs, blank({
      productId: p.id, description: p.name, designNo: p.designNo, pieces: String(p.pieces), gross: p.gross, stone: p.stone, other: p.other,
      touch: p.touch, rate, makingType: cust?.makingType ?? p.makingType, makingRate: cust ? cust.makingRate : p.makingCharge, stoneAmount: p.stoneAmount,
    })]);
    setIq(""); setIres([]); setIopen(false);
    searchRef.current?.focus();
  }

  const upd = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  // ---------- calculations (shared pure engine) ----------
  const posCode = cust?.stateCode || props.companyStateCode;
  const totals = useMemo(() => {
    const inputs: SaleItemInput[] = rows.map((r) => ({
      pieces: r.pieces || 0, grossWeight: r.gross || 0, stoneWeight: r.stone || 0, otherWeight: r.other || 0,
      netWeightOverride: r.netOverride === "" ? null : r.netOverride, touch: r.touch || 0, goldRate: r.rate || 0,
      makingType: r.makingType as SaleItemInput["makingType"], makingRate: r.makingRate || 0, stoneAmount: r.stoneAmount || 0,
      otherCharges: r.otherCharges || 0, discount: r.discount || 0,
    }));
    return calculateSaleTotals(inputs, { mode, gstRate: gst || 0, companyStateCode: props.companyStateCode, placeOfSupplyStateCode: posCode, roundOffToRupee: props.roundOff, taxMetalValueInMetalMode: props.taxMetal });
  }, [rows, mode, gst, posCode, props.companyStateCode, props.roundOff, props.taxMetal]);

  const overLimit = cust && D(cust.creditLimit).greaterThan(0) && D(cust.money).plus(totals.moneyLedgerDebit).greaterThan(D(cust.creditLimit));

  function save() {
    setErr("");
    if (!cust) return setErr("Select a customer first.");
    if (!rows.length) return setErr("Add at least one item.");
    const bad = rows.findIndex((r) => !r.description.trim() || D(r.gross).lte(0) || D(r.touch).lte(0));
    if (bad >= 0) { setRows((rs) => rs.map((r, i) => (i === bad ? { ...r, open: true } : r))); return setErr(`Row ${bad + 1}: enter item name, gross weight and touch.`); }
    start(async () => {
      const r = await createSale({
        customerId: cust.id, date, billingMode: mode, gstRate: gst, placeOfSupplyCode: cust.stateCode, placeOfSupplyState: cust.state, notes,
        items: rows.map((x) => ({
          productId: x.productId, description: x.description, designNo: x.designNo, hsn: "7113", pieces: Number(x.pieces || 1), grossWeight: x.gross, stoneWeight: x.stone, otherWeight: x.other,
          netWeightOverride: x.netOverride === "" ? null : x.netOverride, touch: x.touch, goldRate: x.rate || "0",
          makingType: x.makingType as "PER_GRAM", makingRate: x.makingRate || "0", stoneAmount: x.stoneAmount, otherCharges: x.otherCharges, discount: x.discount,
        })),
      });
      if (!r.ok) { setErr(r.error); toast.error(r.error); return; }
      toast.success(`Sale ${r.data.number} created successfully`);
      router.push(`/sales/${r.data.id}`);
    });
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const Num = ({ r, f, w = "w-20", ...rest }: { r: Row; f: keyof Row; w?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <input data-nav inputMode="decimal" className={cn("field compact num text-right", w)} value={r[f] as string} onChange={(e) => upd(r.key, { [f]: e.target.value } as Partial<Row>)} onFocus={(e) => e.target.select()} {...rest} />
  );

  return (
    <div onKeyDown={enterNav}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-semibold tracking-tight">New Sale</h1>
        <div className="flex items-center gap-2 text-[13px] text-muted"><span>Invoice no.</span><span className="num rounded-md border border-border bg-surface px-2.5 py-1.5 font-medium text-ink">Auto-generated on save</span></div>
      </div>

      {/* Customer + invoice info */}
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <section className="card relative p-5 lg:col-span-2">
          <label className="label">Customer</label>
          {cust ? (
            <div>
              <div className="flex items-start justify-between gap-3">
                <div><div className="text-[18px] font-semibold">{cust.name}</div><div className="text-[13px] text-muted">{[cust.code, cust.phone, cust.city].filter(Boolean).join(" · ")}</div></div>
                <button className="btn btn-sm" onClick={() => setCust(null)}>Change</button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-4">
                <div><div className="text-[12px] text-muted">Fine gold balance</div><div className="num text-[17px] font-semibold text-accent">{formatBalance(cust.fine, "fine")}</div></div>
                <div><div className="text-[12px] text-muted">Money balance</div><div className="num text-[17px] font-semibold">{formatBalance(cust.money, "money")}</div></div>
                <div><div className="text-[12px] text-muted">Credit limit</div><div className="num text-[17px] font-semibold">{D(cust.creditLimit).isZero() ? "No limit" : formatMoney(cust.creditLimit, { dp: 0 })}</div></div>
                <div><div className="text-[12px] text-muted">Last sale</div><div className="text-[13px] font-medium">{cust.lastSale ? `${formatDate(cust.lastSale.date)} · ${formatMoney(cust.lastSale.total, { dp: 0 })}` : "—"}</div></div>
              </div>
              {overLimit && <div className="mt-3 flex items-center gap-2 rounded-md bg-warn-soft px-3 py-2 text-[13px] text-warn"><AlertTriangle size={15} /> This bill takes the customer over their credit limit.</div>}
            </div>
          ) : (
            <>
              <input className="field" placeholder="Search customer by name, phone, code or GSTIN…" value={cq} autoFocus data-nonav
                onChange={(e) => { setCq(e.target.value); setCopen(true); }} onFocus={() => setCopen(true)} />
              {copen && (
                <div className="card absolute inset-x-5 top-[88px] z-30 max-h-72 overflow-auto bg-surface p-1">
                  {cres.length === 0 && <p className="p-4 text-center text-sm text-muted">No customers found.</p>}
                  {cres.map((c) => (
                    <button key={c.id} className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left hover:bg-accent-soft" onClick={() => pickCustomer(c)}>
                      <span><span className="block text-sm font-medium">{c.name}</span><span className="text-xs text-muted">{[c.code, c.phone, c.city].filter(Boolean).join(" · ")}</span></span>
                      <span className="num text-xs text-muted">{formatBalance(c.money, "money")}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        <section className="card p-5">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Date</label><input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} data-nav /></div>
            <div><label className="label">GST %</label><input className="field num" inputMode="decimal" value={gst} onChange={(e) => setGst(e.target.value)} data-nav /></div>
          </div>
          <label className="label mt-3">Billing mode</label>
          <div className="grid grid-cols-2 gap-1 rounded-md bg-subtle p-1">
            {([["MONEY", "Money"], ["METAL", "Metal + charges"]] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setMode(k)} className={cn("h-9 rounded text-[13px] font-medium", mode === k ? "bg-surface text-accent shadow-[0_0_0_1px_var(--border)]" : "text-muted")}>{l}</button>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-muted">{mode === "MONEY" ? "Gold value is billed in rupees." : "Fine gold goes to the gold ledger. Only charges & GST go to money."}</p>
        </section>
      </div>

      {/* Items */}
      <section className="card mb-4">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative min-w-64 flex-1 sm:max-w-md">
            <ScanBarcode size={17} className="absolute left-3 top-3.5 text-faint" />
            <input ref={searchRef} className="field !pl-10" placeholder="Scan barcode or search design / item / HUID / lot…" value={iq} data-nonav
              onChange={(e) => { setIq(e.target.value); setIopen(true); }} onFocus={() => setIopen(true)}
              onKeyDown={(e) => { if (e.key === "Enter" && ires[0]) { e.preventDefault(); addProduct(ires[0]); } }} />
            {iopen && iq.trim() && (
              <div className="card absolute inset-x-0 top-12 z-30 max-h-72 overflow-auto bg-surface p-1">
                {ires.length === 0 && <p className="p-4 text-center text-sm text-muted">No available item matches “{iq}”.</p>}
                {ires.map((p) => (
                  <button key={p.id} className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left hover:bg-accent-soft" onClick={() => addProduct(p)}>
                    <span><span className="block text-sm font-medium">{p.designNo} <span className="font-normal text-muted">· {p.name}</span></span><span className="text-xs text-muted">{p.itemCode} · {p.purity}</span></span>
                    <span className="num text-xs">{formatWeight(p.gross)} gross</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="btn" onClick={() => setRows((r) => [...r, blank({ makingType: cust?.makingType ?? "PER_GRAM", makingRate: cust?.makingRate ?? "0", open: true })])}><Plus size={16} /> Manual item</button>
        </div>

        {rows.length === 0 ? (
          <div className="px-6 py-14 text-center"><p className="text-[14.5px] font-medium">No items yet</p><p className="mt-1 text-[13.5px] text-muted">Scan a barcode or search a design above to add jewellery.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="dt min-w-[1000px]">
              <thead><tr><th className="w-8" /><th>Item</th><th className="r">Pcs</th><th className="r">Gross</th><th className="r">Stone</th><th className="r">Net</th><th className="r">Touch</th><th className="r">Fine</th><th className="r">Rate/g</th><th className="r">Making</th><th className="r">Taxable</th><th className="w-10" /></tr></thead>
              <tbody>
                {rows.map((r, i) => {
                  const c = totals.items[i];
                  return (
                    <Fragment key={r.key}>
                      <tr>
                        <td><button className="btn btn-ghost btn-sm !px-1" onClick={() => upd(r.key, { open: !r.open })} aria-label="Details"><ChevronRight size={16} className={cn("transition-transform", r.open && "rotate-90")} /></button></td>
                        <td className="min-w-48">{r.productId ? <><div className="font-medium">{r.designNo}</div><div className="text-xs text-muted">{r.description}</div></> :
                          <div className="flex gap-1.5"><input data-nav className="field compact" placeholder="Item name" value={r.description} onChange={(e) => upd(r.key, { description: e.target.value })} /><input data-nav className="field compact !w-24" placeholder="Design" value={r.designNo} onChange={(e) => upd(r.key, { designNo: e.target.value })} /></div>}</td>
                        <td className="r"><Num r={r} f="pieces" w="w-14" /></td>
                        <td className="r">{r.productId ? <span className="num">{formatWeight(r.gross, 3, false)}</span> : <Num r={r} f="gross" w="w-24" />}</td>
                        <td className="r">{r.productId ? <span className="num">{formatWeight(r.stone, 3, false)}</span> : <Num r={r} f="stone" w="w-20" />}</td>
                        <td className="r num font-medium">{formatWeight(c.netWeight, 3, false)}</td>
                        <td className="r">{r.productId ? <span className="num">{r.touch}</span> : <Num r={r} f="touch" w="w-16" />}</td>
                        <td className="r num font-semibold text-accent">{formatFine(c.fineWeight, false)}</td>
                        <td className="r"><Num r={r} f="rate" w="w-24" /></td>
                        <td className="r"><div className="flex items-center justify-end gap-1.5"><Num r={r} f="makingRate" w="w-20" /><span className="w-9 text-left text-[11px] text-muted">{MAKING_LABEL[r.makingType] ?? ""}</span></div></td>
                        <td className="r num font-medium">{formatMoney(c.taxableAmount)}</td>
                        <td><button className="btn btn-ghost btn-sm !px-1.5 text-muted hover:text-danger" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} aria-label="Remove row"><Trash2 size={15} /></button></td>
                      </tr>
                      {r.open && (
                        <tr key={r.key + "d"}><td colSpan={12} className="!bg-bg">
                          <div className="grid grid-cols-2 gap-3 py-2 sm:grid-cols-4 lg:grid-cols-7">
                            <div><label className="label">Making type</label><select className="field compact" value={r.makingType} onChange={(e) => upd(r.key, { makingType: e.target.value })}><option value="PER_GRAM">Per gram</option><option value="PER_PIECE">Per piece</option><option value="PERCENT">Percentage</option><option value="FIXED">Fixed amount</option></select></div>
                            <div><label className="label">Making amount</label><div className="num flex h-9 items-center text-[14px] font-medium">{formatMoney(c.makingAmount)}</div></div>
                            <div><label className="label">Stone amount (₹)</label><Num r={r} f="stoneAmount" w="w-full" /></div>
                            <div><label className="label">Other weight (g)</label><Num r={r} f="other" w="w-full" /></div>
                            <div><label className="label">Other charges (₹)</label><Num r={r} f="otherCharges" w="w-full" /></div>
                            <div><label className="label">Discount (₹)</label><Num r={r} f="discount" w="w-full" /></div>
                            <div><label className="label">Net override (g)</label>{props.canOverrideNet ? <Num r={r} f="netOverride" w="w-full" placeholder="auto" /> : <div className="text-[12px] text-faint pt-2.5">Needs permission</div>}</div>
                            {r.productId && <><div><label className="label">Item ID</label><div className="num pt-2 text-[13px]">{r.productId.slice(-6)}</div></div><div><label className="label">Gold value</label><div className="num pt-2 text-[13px]">{formatMoney(c.goldValue)}</div></div></>}
                          </div>
                        </td></tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Bottom: notes | totals */}
      <div className="grid gap-4 lg:grid-cols-5">
        <section className="card p-5 lg:col-span-2">
          <label className="label">Notes</label>
          <textarea className="field" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} data-nonav placeholder="Optional — shown on invoice" />
          <p className="mt-3 text-[12.5px] text-muted">Stock, customer gold ledger and money ledger are all updated together when you save. If anything fails, nothing is changed.</p>
        </section>

        <section className="card p-5 lg:col-span-3">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
            {[["Gross weight", formatWeight(totals.grossWeight)], ["Stone weight", formatWeight(totals.stoneWeight)], ["Net weight", formatWeight(totals.netWeight)]].map(([k, v]) => <div key={k}><dt className="text-[12px] text-muted">{k}</dt><dd className="num text-[17px] font-semibold">{v}</dd></div>)}
            <div><dt className="text-[12px] text-muted">Fine gold</dt><dd className="num text-[17px] font-semibold text-accent">{formatFine(totals.fineWeight)}</dd></div>
          </dl>
          <div className="mt-4 space-y-2 border-t border-border pt-4 text-[14px]">
            {mode === "MONEY" && <Line k="Gold value" v={formatMoney(totals.items.reduce((a, r) => a.plus(r.billedGoldValue), D(0)))} />}
            <Line k="Making" v={formatMoney(totals.makingAmount)} />
            <Line k="Stone" v={formatMoney(totals.stoneAmount)} />
            {!D(totals.otherCharges).isZero() && <Line k="Other charges" v={formatMoney(totals.otherCharges)} />}
            {!D(totals.discount).isZero() && <Line k="Discount" v={`− ${formatMoney(totals.discount)}`} />}
            <Line k="Taxable amount" v={formatMoney(totals.taxableAmount)} strong />
            {totals.igst.isZero() && !totals.cgst.isZero() ? <><Line k={`CGST ${D(gst).dividedBy(2)}%`} v={formatMoney(totals.cgst)} /><Line k={`SGST ${D(gst).dividedBy(2)}%`} v={formatMoney(totals.sgst)} /></> : <Line k={`IGST ${gst}%`} v={formatMoney(totals.igst)} />}
            {!totals.roundOff.isZero() && <Line k="Round off" v={formatMoney(totals.roundOff)} />}
          </div>
          <div className="mt-4 flex items-end justify-between border-t border-border pt-4">
            <div className="text-[13px] text-muted">{mode === "METAL" ? <>Gold ledger <b className="num text-accent">+{formatFine(totals.metalLedgerDebit)}</b><br />Money ledger</> : "Grand total"}</div>
            <div className="num text-[34px] font-semibold leading-none tracking-tight">{formatMoney(totals.grandTotal)}</div>
          </div>
        </section>
      </div>

      {err && <div className="mt-4 flex items-center justify-between rounded-md bg-danger-soft px-4 py-3 text-[14px] text-danger" role="alert"><span>{err}</span><button onClick={() => setErr("")}><X size={16} /></button></div>}

      <div className="sticky bottom-0 -mx-4 mt-6 flex items-center justify-between border-t border-border bg-bg/95 px-4 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        <span className="hidden text-[13px] text-muted sm:block"><kbd>Enter</kbd> next field · <kbd>Ctrl S</kbd> save</span>
        <div className="flex gap-2"><button className="btn" onClick={() => router.back()}>Cancel</button><button className="btn btn-primary min-w-36 !h-11" disabled={pending} onClick={save}>{pending && <Loader2 size={16} className="animate-spin" />}Save sale</button></div>
      </div>
    </div>
  );
}

function Line({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return <div className="flex justify-between"><span className={strong ? "font-medium" : "text-muted"}>{k}</span><span className={cn("num", strong ? "font-semibold" : "font-medium")}>{v}</span></div>;
}
