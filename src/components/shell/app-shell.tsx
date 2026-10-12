"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Plus, Search, LogOut } from "lucide-react";
import Link from "next/link";
import { Sidebar } from "./sidebar";
import { CommandPalette } from "./command-palette";
import { authClient } from "@/lib/auth/client";

export function AppShell({ children, userName, roleName }: { children: React.ReactNode; userName: string; roleName: string }) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("sidebar") === "1");
  }, []);
  const toggle = () => setCollapsed((c) => { localStorage.setItem("sidebar", c ? "0" : "1"); return !c; });

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearch(true); }
      else if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === "/") { e.preventDefault(); setSearch(true); }
        if (e.key.toLowerCase() === "n") { e.preventDefault(); router.push("/sales/new"); }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [router]);

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden lg:block"><Sidebar collapsed={collapsed} onToggle={toggle} /></div>
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setDrawer(false)}>
          <div className="absolute inset-0 bg-black/25" />
          <div className="relative h-full w-[260px]" onClick={(e) => e.stopPropagation()}><Sidebar collapsed={false} onNavigate={() => setDrawer(false)} /></div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 lg:px-8">
          <button className="btn btn-ghost -ml-2 !px-2 lg:hidden" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu size={20} /></button>
          <button onClick={() => setSearch(true)} className="flex h-10 max-w-md flex-1 items-center gap-2.5 rounded-md border border-border bg-bg px-3 text-sm text-faint hover:border-border-strong">
            <Search size={16} /><span className="flex-1 text-left">Search anything…</span><kbd className="hidden sm:inline">Ctrl K</kbd>
          </button>
          <div className="flex-1" />
          <Link href="/sales/new" className="btn btn-primary btn-sm hidden sm:inline-flex"><Plus size={15} /> New Sale</Link>
          <div className="flex items-center gap-3 pl-1">
            <div className="hidden text-right leading-tight sm:block">
              <div className="text-[13px] font-medium">{userName}</div>
              <div className="text-[11px] text-muted">{roleName}</div>
            </div>
            <button className="btn btn-ghost btn-sm !px-2" title="Sign out" onClick={async () => { await authClient.signOut(); router.push("/login"); router.refresh(); }}><LogOut size={16} /></button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>
      <CommandPalette open={search} onClose={() => setSearch(false)} />
    </div>
  );
}
