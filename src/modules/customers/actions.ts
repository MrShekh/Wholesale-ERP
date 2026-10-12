"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { customerSchema, type CustomerFormInput } from "./schema";

export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function saveCustomer(id: string | null, input: CustomerFormInput): Promise<ActionResult<{ id: string }>> {
  const s = await requirePermission("customer.manage");
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach((i) => { fieldErrors[String(i.path[0])] = i.message; });
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }
  const d = parsed.data;
  try {
    const saved = await db.$transaction(async (tx) => {
      if (id) {
        const old = await tx.customer.findUniqueOrThrow({ where: { id } });
        const c = await tx.customer.update({ where: { id }, data: d });
        const balanceChanged = old.openingCash.toString() !== c.openingCash.toString() || old.openingFine.toString() !== c.openingFine.toString();
        await writeAudit(tx, {
          userId: s.user.id, userName: s.user.name, module: "Customers",
          action: balanceChanged ? "OPENING_BALANCE_CHANGED" : "CUSTOMER_EDITED", recordType: "Customer", recordId: id, recordRef: c.code,
          oldValue: { businessName: old.businessName, openingCash: old.openingCash.toString(), openingFine: old.openingFine.toString(), creditLimit: old.creditLimit.toString() },
          newValue: { businessName: c.businessName, openingCash: c.openingCash.toString(), openingFine: c.openingFine.toString(), creditLimit: c.creditLimit.toString() },
        });
        return c;
      }
      const last = await tx.customer.findFirst({ orderBy: { code: "desc" }, select: { code: true } });
      const next = (last ? parseInt(last.code.replace(/\D/g, ""), 10) : 0) + 1;
      const c = await tx.customer.create({ data: { ...d, code: `C${String(next).padStart(4, "0")}` } });
      await writeAudit(tx, { userId: s.user.id, userName: s.user.name, module: "Customers", action: "CUSTOMER_CREATED", recordType: "Customer", recordId: c.id, recordRef: c.code, newValue: { businessName: c.businessName } });
      return c;
    });
    revalidatePath("/customers");
    return { ok: true, data: { id: saved.id } };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Unable to save this customer. Nothing was changed." };
  }
}
