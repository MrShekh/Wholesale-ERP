"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { BusinessError } from "@/lib/accounting/rules";
import { cancelSale, postSale } from "@/lib/accounting/post-sale";
import type { CreateSaleInput } from "./schema";
import type { ActionResult } from "@/modules/customers/actions";

export async function createSale(input: CreateSaleInput): Promise<ActionResult<{ id: string; number: string }>> {
  const s = await requirePermission("sale.create");
  try {
    // Pricing / net-weight overrides need explicit permission
    if (input.items.some((i) => i.netWeightOverride != null && i.netWeightOverride !== "") && !s.can("weight.override_net"))
      return { ok: false, error: "You don't have permission to override net weight." };
    const r = await postSale(input, { id: s.user.id, name: s.user.name });
    revalidatePath("/sales"); revalidatePath("/"); revalidatePath("/inventory");
    return { ok: true, data: { id: r.id, number: r.number } };
  } catch (e) {
    return { ok: false, error: e instanceof BusinessError ? e.message : "Unable to save this sale. No stock or ledger changes were made." };
  }
}

export async function cancelSaleAction(id: string, reason: string): Promise<ActionResult<{ number: string }>> {
  const s = await requirePermission("sale.cancel");
  try {
    const r = await cancelSale(id, reason, { id: s.user.id, name: s.user.name });
    revalidatePath("/sales"); revalidatePath(`/sales/${id}`); revalidatePath("/");
    return { ok: true, data: r };
  } catch (e) {
    return { ok: false, error: e instanceof BusinessError ? e.message : "Unable to cancel this invoice. Nothing was changed." };
  }
}
