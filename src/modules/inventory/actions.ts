"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { calculateFineWeight, calculateNetWeight } from "@/lib/calculations/weight";
import { D } from "@/lib/calculations/decimal";
import { writeAudit } from "@/lib/audit";
import type { ActionResult } from "@/modules/customers/actions";
import { productSchema, type ProductFormInput } from "./schema";

export async function createProduct(input: ProductFormInput): Promise<ActionResult<{ id: string; code: string }>> {
  const s = await requirePermission("inventory.manage");
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach((i) => {
      fieldErrors[String(i.path[0])] = i.message;
    });
    return { ok: false, error: "Please fix highlighted fields", fieldErrors };
  }

  const d = parsed.data;

  try {
    const result = await db.$transaction(async (tx) => {
      // Check existing code/barcode
      const existing = await tx.product.findFirst({
        where: {
          OR: [
            { itemCode: d.itemCode },
            ...(d.barcode ? [{ barcode: d.barcode }] : []),
            ...(d.huid ? [{ huid: d.huid }] : []),
          ],
        },
      });
      if (existing) {
        if (existing.itemCode === d.itemCode) throw new Error(`Item code ${d.itemCode} is already in use.`);
        if (d.barcode && existing.barcode === d.barcode) throw new Error(`Barcode ${d.barcode} already exists on item ${existing.itemCode}.`);
        if (d.huid && existing.huid === d.huid) throw new Error(`HUID ${d.huid} already exists.`);
      }

      const purity = await tx.purity.findUniqueOrThrow({ where: { id: d.purityId } });
      const computedNet = calculateNetWeight(d.grossWeight, d.stoneWeight, d.otherWeight);
      const hasOverride = Boolean(d.netWeightOverride && d.netWeightOverride.trim() !== "");
      const net = hasOverride ? D(d.netWeightOverride!) : computedNet;
      const fine = calculateFineWeight(net, purity.touch);

      const location = d.locationId ? await tx.location.findUnique({ where: { id: d.locationId } }) : await tx.location.findFirst({ where: { isDefault: true } });

      const prod = await tx.product.create({
        data: {
          itemCode: d.itemCode,
          designNo: d.designNo,
          name: d.name || `${purity.name} ${d.designNo}`,
          categoryId: d.categoryId,
          metalId: purity.metalId,
          purityId: purity.id,
          touch: purity.touch,
          pieces: d.pieces,
          grossWeight: d.grossWeight,
          stoneWeight: d.stoneWeight,
          otherWeight: d.otherWeight,
          netWeight: net.toString(),
          fineWeight: fine.toString(),
          netWeightOverridden: hasOverride,
          barcode: d.barcode || d.itemCode,
          huid: d.huid || null,
          supplierId: d.supplierId || null,
          purchaseCost: d.purchaseCost,
          makingType: d.makingType,
          makingCharge: d.makingCharge,
          locationId: location?.id || null,
          status: "AVAILABLE",
          notes: d.notes || null,
        },
      });

      // Stock Movement entry (Inventory Movement Ledger)
      await tx.stockMovement.create({
        data: {
          productId: prod.id,
          txnType: "OPENING_STOCK",
          reference: "Direct Entry",
          piecesIn: prod.pieces,
          grossIn: prod.grossWeight,
          netIn: prod.netWeight,
          fineIn: prod.fineWeight,
          locationId: prod.locationId,
          userId: s.user.id,
          notes: "Stock item created",
        },
      });

      await writeAudit(tx, {
        userId: s.user.id,
        userName: s.user.name,
        module: "Inventory",
        action: "PRODUCT_CREATED",
        recordType: "Product",
        recordId: prod.id,
        recordRef: prod.itemCode,
        newValue: {
          designNo: prod.designNo,
          gross: prod.grossWeight.toString(),
          net: prod.netWeight.toString(),
          fine: prod.fineWeight.toString(),
        },
      });

      return prod;
    });

    revalidatePath("/inventory");
    revalidatePath("/");
    return { ok: true, data: { id: result.id, code: result.itemCode } };
  } catch (err: unknown) {
    console.error("createProduct error:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Unable to save stock item." };
  }
}
