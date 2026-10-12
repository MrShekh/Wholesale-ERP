"use client";

import { useEffect, useRef, useState } from "react";
import { Columns3 } from "lucide-react";
import { StatusBadge } from "@/components/page";

export interface StockRow {
  id: string; design: string; code: string; name: string; category: string; pieces: number;
  gross: string; stone: string; other: string; net: string; purity: string; touch: string; fine: string;
  status: string; barcode: string; huid: string; supplier: string; location: string; lot: string; cost: string | null;
}

interface Col { key: string; label: string; right?: boolean; num?: boolean; default: boolean; render: (r: StockRow) => React.ReactNode }

const COLS: Col[] = [
  { key: "design", label: "Design", default: true, render: (r) => <><div className="font-medium">{r.design}</div><div className="text-xs text-muted">{r.name}</div></> },
  { key: "category", label: "Category", default: true, render: (r) => r.category },
  { key: "pieces", label: "Pcs", right: true, num: true, default: true, render: (r) => r.pieces },
  { key: "gross", label: "Gross", right: true, num: true, default: true, render: (r) => r.gross },
  { key: "stone", label: "Stone", right: true, num: true, default: true, render: (r) => r.stone },
  { key: "net", label: "Net", right: true, num: true, default: true, render: (r) => <span className="font-medium">{r.net}</span> },
  { key: "purity", label: "Purity", default: true, render: (r) => r.purity },
  { key: "fine", label: "Fine", right: true, num: true, default: true, render: (r) => <span className="font-semibold text-accent">{r.fine}</span> },
  { key: "status", label: "Status", default: true, render: (r) => <StatusBadge status={r.status} /> },
  { key: "code", label: "Item ID", num: true, default: false, render: (r) => r.code },
  { key: "other", label: "Other wt", right: true, num: true, default: false, render: (r) => r.other },
  { key: "touch", label: "Touch", right: true, num: true, default: false, render: (r) => r.touch },
  { key: "barcode", label: "Barcode", num: true, default: false, render: (r) => r.barcode },
  { key: "huid", label: "HUID", num: true, default: false, render: (r) => r.huid },
  { key: "supplier", label: "Supplier", default: false, render: (r) => r.supplier },
  { key: "location", label: "Location", default: false, render: (r) => r.location },
  { key: "lot", label: "Lot", default: false, render: (r) => r.lot },
  { key: "cost", label: "Cost", right: true, num: true, default: false, render: (r) => r.cost },
];

const KEY = "cols:jewellery-stock";

export function StockTable({ rows, canCost }: { rows: StockRow[]; canCost: boolean }) {
  const all = COLS.filter((c) => canCost || c.key !== "cost");
  const [visible, setVisible] = useState<string[]>(all.filter((c) => c.default).map((c) => c.key));
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { const s = localStorage.getItem(KEY); if (s) setVisible(JSON.parse(s)); } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const toggle = (k: string) => setVisible((v) => { const n = v.includes(k) ? v.filter((x) => x !== k) : [...v, k]; localStorage.setItem(KEY, JSON.stringify(n)); return n; });

  const cols = all.filter((c) => visible.includes(c.key));
  return (
    <>
      <div className="mb-3 flex justify-end">
        <div className="relative" ref={ref}>
          <button className="btn btn-sm" onClick={() => setOpen((o) => !o)}><Columns3 size={15} /> Columns</button>
          {open && (
            <div className="card absolute right-0 z-20 mt-1 w-52 bg-surface p-2">
              {all.map((c) => (
                <label key={c.key} className="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 text-[13.5px] hover:bg-subtle">
                  <input type="checkbox" className="accent-[#14532d]" checked={visible.includes(c.key)} onChange={() => toggle(c.key)} />{c.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card hidden max-h-[calc(100vh-290px)] overflow-auto md:block">
        <table className="dt">
          <thead><tr>{cols.map((c) => <th key={c.key} className={c.right ? "r" : ""}>{c.label}</th>)}</tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id}>{cols.map((c) => <td key={c.key} className={`${c.right ? "r" : ""} ${c.num ? "num" : ""}`}>{c.render(r) ?? "—"}</td>)}</tr>)}</tbody>
        </table>
      </div>

      <div className="space-y-2 md:hidden">
        {rows.map((r) => (
          <div key={r.id} className="card p-4">
            <div className="flex items-start justify-between"><div><div className="font-medium">{r.design}</div><div className="text-xs text-muted">{r.name} · {r.purity}</div></div><StatusBadge status={r.status} /></div>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
              <div><div className="text-[11px] text-muted">Gross</div><div className="num text-[13px] font-medium">{r.gross}</div></div>
              <div><div className="text-[11px] text-muted">Net</div><div className="num text-[13px] font-medium">{r.net}</div></div>
              <div><div className="text-[11px] text-muted">Fine</div><div className="num text-[13px] font-semibold text-accent">{r.fine}</div></div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
