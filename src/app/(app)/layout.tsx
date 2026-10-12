import { requireSession } from "@/lib/auth/session";
import { AppShell } from "@/components/shell/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await requireSession();
  return (
    <AppShell userName={s.user.name} roleName={s.user.role?.name ?? "User"}>
      {children}
    </AppShell>
  );
}
