"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Gem, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NAV } from "./nav";
import { cn } from "@/lib/utils";

export function Sidebar({ collapsed, onToggle, onNavigate }: { collapsed: boolean; onToggle?: () => void; onNavigate?: () => void }) {
  const path = usePathname();
  const isActive = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const g = NAV.find((n) => n.items?.some((i) => !i.soon && isActive(i.href)));
    if (g) setOpen((o) => ({ ...o, [g.label]: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  return (
    <aside className={cn("flex h-full flex-col border-r border-border bg-surface transition-[width] duration-150", collapsed ? "w-[68px]" : "w-[248px]")}>
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-4">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-accent text-white"><Gem size={17} /></div>
        {!collapsed && <span className="text-[15px] font-semibold tracking-tight">Jewel ERP</span>}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {NAV.map((g) => {
          const Icon = g.icon;
          if (g.href) {
            const active = isActive(g.href);
            return (
              <Link key={g.label} href={g.href} onClick={onNavigate} title={g.label}
                className={cn("mb-0.5 flex h-10 items-center gap-3 rounded-md px-3 text-[14px] font-medium", active ? "bg-accent-soft text-accent" : "text-ink hover:bg-subtle")}>
                <Icon size={18} className="shrink-0" />
                {!collapsed && g.label}
              </Link>
            );
          }
          const groupActive = g.items?.some((i) => !i.soon && isActive(i.href));
          const expanded = open[g.label] && !collapsed;
          return (
            <div key={g.label} className="mb-0.5">
              <button
                onClick={() => (collapsed ? onToggle?.() : setOpen((o) => ({ ...o, [g.label]: !o[g.label] })))}
                title={g.label}
                className={cn("flex h-10 w-full items-center gap-3 rounded-md px-3 text-[14px] font-medium", groupActive && !expanded ? "text-accent" : "text-ink", "hover:bg-subtle")}>
                <Icon size={18} className="shrink-0" />
                {!collapsed && <>
                  <span className="flex-1 text-left">{g.label}</span>
                  <ChevronDown size={15} className={cn("text-faint transition-transform", expanded && "rotate-180")} />
                </>}
              </button>
              {expanded && (
                <div className="ml-[21px] mt-0.5 mb-1.5 border-l border-border pl-3">
                  {g.items!.map((i) =>
                    i.soon ? (
                      <div key={i.href} className="flex h-8 items-center justify-between rounded-md px-2.5 text-[13.5px] text-faint">
                        {i.label}<span className="text-[10px] uppercase tracking-wide">Soon</span>
                      </div>
                    ) : (
                      <Link key={i.href} href={i.href} onClick={onNavigate}
                        className={cn("flex h-8 items-center rounded-md px-2.5 text-[13.5px]", isActive(i.href) ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-subtle hover:text-ink")}>
                        {i.label}
                      </Link>
                    ),
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {onToggle && (
        <button onClick={onToggle} className="m-3 hidden h-9 items-center gap-2 rounded-md px-3 text-[13px] text-muted hover:bg-subtle lg:flex" aria-label="Toggle sidebar">
          {collapsed ? <PanelLeftOpen size={17} /> : <><PanelLeftClose size={17} /> Collapse</>}
        </button>
      )}
    </aside>
  );
}
