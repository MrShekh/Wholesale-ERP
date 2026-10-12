import Link from "next/link";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-[14.5px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Big readable number with a muted label above. */
export function Stat({ label, value, sub, tone, href }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "accent" | "danger"; href?: string }) {
  const body = (
    <div className="card h-full p-5 transition-colors hover:border-border-strong">
      <div className="text-[13px] font-medium text-muted">{label}</div>
      <div className={cn("num mt-2 text-[28px] font-semibold leading-none tracking-tight", tone === "accent" && "text-accent", tone === "danger" && "text-danger")}>{value}</div>
      {sub && <div className="mt-2 text-[13px] text-muted">{sub}</div>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function Section({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("card overflow-hidden", className)}>
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <h2 className="text-[16px] font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ icon, title, hint, action }: { icon?: React.ReactNode; title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {icon && <div className="mb-3 text-faint">{icon}</div>}
      <p className="text-[14.5px] font-medium">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-[13.5px] text-muted">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: "badge-green", AVAILABLE: "badge-green", CLOSED: "badge-green", RECEIVED: "badge-green",
    CANCELLED: "badge-red", VOID: "badge-red", DAMAGED: "badge-red", BLOCKED: "badge-red",
    ON_APPROVAL: "badge-amber", RESERVED: "badge-amber", IN_TRANSIT: "badge-amber", OPEN: "badge-amber", PARTIAL: "badge-amber",
    SOLD: "badge-blue", DRAFT: "",
  };
  return <span className={cn("badge", map[status])}>{status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</span>;
}
