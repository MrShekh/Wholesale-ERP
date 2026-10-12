"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { BusinessError } from "@/lib/accounting/rules";
import { postCashReceipt, postGoldReceipt, postRateFixing } from "@/lib/accounting/post-receipts";
import { customerFineBalance } from "@/lib/accounting/balances";
import type { ActionResult } from "@/modules/customers/actions";

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    return { ok: false, error: e instanceof Error && (e instanceof BusinessError || e.message.startsWith("You don't")) ? e.message : "Unable to save. No changes were made." };
  }
}

export async function recordCashReceipt(i: { customerId: string; amount: string; paymentMode: "CASH" | "UPI" | "BANK_TRANSFER" | "NEFT" | "RTGS" | "CHEQUE" | "CARD" | "OTHER"; referenceNo?: string; bank?: string; remarks?: string; date: string }) {
  const s = await requirePermission("customer.payment");
  const r = await run(() => postCashReceipt(i, { id: s.user.id, name: s.user.name }));
  revalidatePath(`/customers/${i.customerId}`);
  return r;
}

export async function recordGoldReceipt(i: { customerId: string; physicalWeight: string; touch: string; reference?: string; remarks?: string; date: string }) {
  const s = await requirePermission("gold.receipt");
  const r = await run(() => postGoldReceipt(i, { id: s.user.id, name: s.user.name }));
  revalidatePath(`/customers/${i.customerId}`);
  return r;
}

export async function recordRateFixing(i: { customerId: string; fineWeight: string; rate: string; reference?: string; notes?: string; date: string }) {
  const s = await requirePermission("rate.fix");
  const r = await run(() => postRateFixing(i, { id: s.user.id, name: s.user.name }));
  revalidatePath(`/customers/${i.customerId}`);
  return r;
}

export async function getFineDue(customerId: string) {
  await requirePermission("customer.view");
  return (await customerFineBalance(customerId)).toString();
}
