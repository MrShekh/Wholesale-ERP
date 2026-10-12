import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({ total, page, size, params }: { total: number; page: number; size: number; params: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (total <= size) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && sp.set(k, v));
    sp.set("page", String(p));
    return `?${sp.toString()}`;
  };
  return (
    <div className="mt-4 flex items-center justify-between text-[13px] text-muted">
      <span>Showing {(page - 1) * size + 1}–{Math.min(page * size, total)} of {total}</span>
      <div className="flex items-center gap-1">
        {page > 1 ? <Link href={href(page - 1)} className="btn btn-sm"><ChevronLeft size={15} /> Prev</Link> : <span className="btn btn-sm opacity-40"><ChevronLeft size={15} /> Prev</span>}
        <span className="px-2 num">{page} / {pages}</span>
        {page < pages ? <Link href={href(page + 1)} className="btn btn-sm">Next <ChevronRight size={15} /></Link> : <span className="btn btn-sm opacity-40">Next <ChevronRight size={15} /></span>}
      </div>
    </div>
  );
}
