import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { resolvePermissions, type Permission } from "./permissions";

export const getSession = cache(async () => {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s) return null;
  const user = await db.user.findUnique({ where: { id: s.user.id }, include: { role: true } });
  if (!user || !user.isActive) return null;
  const perms = resolvePermissions(user.role?.permissions, user.extraPermissions, user.deniedPermissions);
  return { user, perms, can: (p: Permission) => perms.has(p) };
});

export async function requireSession() {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

export class PermissionError extends Error {
  constructor(p: string) {
    super(`You don't have permission to do this (${p}).`);
  }
}

export async function requirePermission(p: Permission) {
  const s = await requireSession();
  if (!s.can(p)) throw new PermissionError(p);
  return s;
}
