"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, Users, Package, FileText, Truck } from "lucide-react";

interface Hit { type: "customer" | "product" | "sale" | "supplier"; id: string; title: string; subtitle: string; href: string }
const ICON = { customer: Users, product: Package, sale: FileText, supplier: Truck };

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setQ(""); setHits([]); setSel(0); setTimeout(() => input.current?.focus(), 20); }
  }, [open]);

  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (r.ok) { setHits((await r.json()).hits); setSel(0); }
      } catch { /* aborted */ } finally { setLoading(false); }
    }, 180); // debounce
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  if (!open) return null;
  const go = (h: Hit) => { onClose(); router.push(h.href); };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/25 px-4 pt-[12vh]" onMouseDown={onClose}>
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-surface" onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, hits.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
          if (e.key === "Enter" && hits[sel]) go(hits[sel]);
        }}>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search size={18} className="text-faint" />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customer, phone, GSTIN, invoice, design, barcode, HUID, lot…"
            className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint" />
          <kbd>Esc</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {q.trim().length < 2 && <p className="px-3 py-8 text-center text-sm text-muted">Type at least 2 characters.</p>}
          {q.trim().length >= 2 && !loading && hits.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted">No results for “{q}”.</p>}
          {hits.map((h, i) => {
            const Icon = ICON[h.type];
            return (
              <button key={h.type + h.id} onClick={() => go(h)} onMouseEnter={() => setSel(i)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left ${i === sel ? "bg-accent-soft" : ""}`}>
                <Icon size={17} className="text-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{h.title}</span>
                  <span className="block truncate text-xs text-muted">{h.subtitle}</span>
                </span>
                <span className="text-[11px] uppercase tracking-wide text-faint">{h.type}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
