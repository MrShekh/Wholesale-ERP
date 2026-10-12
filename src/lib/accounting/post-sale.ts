import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { nextNumber, type Tx } from "@/lib/accounting/numbering";
import { BusinessError } from "@/lib/accounting/rules";
import { D, Decimal, DEFAULT_ROUNDING } from "@/lib/calculations/decimal";
import { calculateSaleTotals, type SaleItemInput } from "@/lib/calculations/sale";
import type { ConversionConfig } from "@/lib/calculations/weight";
import { createSaleSchema, type CreateSaleInput } from "@/modules/sales/schema";

export interface Actor {
  id: string;
  name: string;
}

/**
 * Posts a sale in ONE database transaction:
 *   sale + items + tax entry + stock movements + metal ledger + money ledger + audit.
 * Any failure rolls everything back — no invoice without stock/ledger and vice-versa.
 * Totals are recomputed server-side; client numbers are never trusted.
 */
export async function postSale(raw: CreateSaleInput, actor: Actor, opts: { canViewCost?: boolean } = {}) {
  const parsed = createSaleSchema.safeParse(raw);
  if (!parsed.success) throw new BusinessError(parsed.error.issues[0]?.message ?? "Invalid sale data.");
  const input = parsed.data;
  const date = new Date(input.date);

  try {
    return await db.$transaction(
      async (tx: Tx) => {
        const [business, customer] = await Promise.all([
          tx.business.findUnique({ where: { id: "main" } }),
          tx.customer.findUnique({ where: { id: input.customerId } }),
        ]);
        if (!business) throw new BusinessError("Business profile is not set up yet. Go to Settings → Business Profile.");
        if (!customer || customer.isDeleted) throw new BusinessError("Customer not found.");
        if (customer.status === "BLOCKED") throw new BusinessError("This customer is blocked. Unblock before billing.");

        const conversion: ConversionConfig = {
          gramsPerCarat: business.gramsPerCarat.toString(),
          caratsPerCent: business.caratsPerCent.toString(),
          gramsPerPiece: 0,
          gramsPerCustomUnit: 0,
        };
        const posCode = input.placeOfSupplyCode || customer.stateCode || business.stateCode;
        const posState = input.placeOfSupplyState || customer.state || business.state;

        // Load products & verify availability (race-safe claim below)
        const productIds = input.items.map((i) => i.productId).filter((x): x is string => !!x);
        if (new Set(productIds).size !== productIds.length) throw new BusinessError("The same item is added twice.");
        const products = await tx.product.findMany({ where: { id: { in: productIds } } });
        const pmap = new Map(products.map((p) => [p.id, p]));

        const calcInputs: SaleItemInput[] = input.items.map((i) => ({
          pieces: i.pieces,
          grossWeight: i.grossWeight,
          stoneWeight: i.stoneWeight,
          otherWeight: i.otherWeight,
          netWeightOverride: i.netWeightOverride ?? null,
          touch: i.touch,
          goldRate: i.goldRate,
          makingType: i.makingType,
          makingRate: i.makingRate,
          makingAmount: i.makingAmount,
          stoneAmount: i.stoneAmount,
          otherCharges: i.otherCharges,
          discount: i.discount,
          stones: i.stones?.map((s) => ({ ...s, deductFromGross: business.stoneDeductsFromGross })),
        }));

        const totals = calculateSaleTotals(calcInputs, {
          mode: input.billingMode,
          gstRate: input.gstRate,
          companyStateCode: business.stateCode,
          placeOfSupplyStateCode: posCode,
          taxMetalValueInMetalMode: business.taxMetalValueInMetalMode,
          roundOffToRupee: business.roundOffInvoice,
          conversion,
          rounding: { ...DEFAULT_ROUNDING, weightDp: business.weightDecimals },
        });

        // cost / profit snapshot
        let costTotal = new Decimal(0);
        input.items.forEach((i) => {
          if (i.productId) costTotal = costTotal.plus(D(pmap.get(i.productId)?.purchaseCost.toString()));
        });
        const profitTotal = totals.taxableAmount.minus(costTotal);

        const number = await nextNumber(tx, "SALE", date);

        const sale = await tx.sale.create({
          data: {
            number,
            date,
            dueDate: input.dueDate ? new Date(input.dueDate) : customer.creditDays ? new Date(date.getTime() + customer.creditDays * 86400000) : null,
            customerId: customer.id,
            billingMode: input.billingMode,
            placeOfSupplyState: posState,
            placeOfSupplyCode: posCode,
            isInterState: posCode !== business.stateCode,
            gstRate: input.gstRate,
            totalPieces: totals.pieces.toNumber(),
            grossWeight: totals.grossWeight.toString(),
            stoneWeight: totals.stoneWeight.toString(),
            otherWeight: totals.otherWeight.toString(),
            netWeight: totals.netWeight.toString(),
            fineWeight: totals.fineWeight.toString(),
            goldValue: totals.goldValue.toString(),
            billedGoldValue: totals.items.reduce((a, r) => a.plus(r.billedGoldValue), new Decimal(0)).toString(),
            makingAmount: totals.makingAmount.toString(),
            stoneAmount: totals.stoneAmount.toString(),
            otherCharges: totals.otherCharges.toString(),
            discount: totals.discount.toString(),
            taxableAmount: totals.taxableAmount.toString(),
            cgst: totals.cgst.toString(),
            sgst: totals.sgst.toString(),
            igst: totals.igst.toString(),
            gstAmount: totals.gstAmount.toString(),
            roundOff: totals.roundOff.toString(),
            grandTotal: totals.grandTotal.toString(),
            metalLedgerImpact: totals.metalLedgerDebit.toString(),
            moneyLedgerImpact: totals.moneyLedgerDebit.toString(),
            costTotal: costTotal.toString(),
            profitMaking: totals.makingAmount.toString(),
            profitStone: totals.stoneAmount.toString(),
            profitGold: profitTotal.minus(totals.makingAmount).minus(totals.stoneAmount).toString(),
            notes: input.notes ?? null,
            terms: input.terms ?? null,
            approvalId: input.approvalId ?? null,
            createdById: actor.id,
            items: {
              create: input.items.map((i, idx) => {
                const r = totals.items[idx];
                const gst = (r.taxableAmount.times(D(input.gstRate)).dividedBy(100)).toDecimalPlaces(2);
                return {
                  lineNo: idx + 1,
                  productId: i.productId ?? null,
                  description: i.description,
                  designNo: i.designNo ?? null,
                  hsn: i.hsn ?? null,
                  pieces: i.pieces,
                  grossWeight: r.grossWeight.toString(),
                  stoneWeight: r.stoneWeight.toString(),
                  otherWeight: r.otherWeight.toString(),
                  netWeight: r.netWeight.toString(),
                  netOverridden: i.netWeightOverride != null,
                  touch: r.touch.toString(),
                  fineWeight: r.fineWeight.toString(),
                  goldRate: r.goldRate.toString(),
                  goldValue: r.goldValue.toString(),
                  makingType: i.makingType,
                  makingRate: i.makingRate,
                  makingAmount: r.makingAmount.toString(),
                  stoneAmount: r.stoneAmount.toString(),
                  otherCharges: r.otherCharges.toString(),
                  discount: r.discount.toString(),
                  taxableAmount: r.taxableAmount.toString(),
                  gstAmount: gst.toString(),
                  lineTotal: r.taxableAmount.plus(gst).toString(),
                  costAmount: i.productId ? D(pmap.get(i.productId)?.purchaseCost.toString()).toString() : "0",
                };
              }),
            },
          },
          include: { items: true },
        });

        // Stock: claim each tagged item atomically (prevents double-selling under concurrency)
        for (const item of input.items) {
          if (!item.productId) continue;
          const p = pmap.get(item.productId);
          if (!p) throw new BusinessError("An item in this sale no longer exists.");
          const allowed = input.approvalId ? ["AVAILABLE", "ON_APPROVAL"] : ["AVAILABLE"];
          const claimed = await tx.product.updateMany({
            where: { id: p.id, status: { in: allowed as never[] }, isDeleted: false },
            data: { status: "SOLD" },
          });
          if (claimed.count !== 1) throw new BusinessError(`${p.designNo} (${p.itemCode}) is not available for sale.`);
          await tx.stockMovement.create({
            data: {
              productId: p.id,
              txnType: "SALE_OUT",
              docType: "SALE",
              docId: sale.id,
              reference: number,
              piecesOut: p.pieces,
              grossOut: p.grossWeight,
              netOut: p.netWeight,
              fineOut: p.fineWeight,
              locationId: p.locationId,
              date,
              userId: actor.id,
            },
          });
        }

        // Tax entry
        await tx.taxEntry.create({
          data: {
            docType: "SALE",
            docId: sale.id,
            saleId: sale.id,
            date,
            hsn: input.items[0]?.hsn ?? null,
            partyGstin: customer.gstin,
            taxable: totals.taxableAmount.toString(),
            cgstRate: totals.cgst.isZero() ? 0 : D(input.gstRate).dividedBy(2).toString(),
            sgstRate: totals.sgst.isZero() ? 0 : D(input.gstRate).dividedBy(2).toString(),
            igstRate: totals.igst.isZero() ? 0 : D(input.gstRate).toString(),
            cgst: totals.cgst.toString(),
            sgst: totals.sgst.toString(),
            igst: totals.igst.toString(),
            total: totals.gstAmount.toString(),
          },
        });

        // Ledgers — metal and money stay independent
        if (totals.metalLedgerDebit.greaterThan(0)) {
          await tx.customerMetalLedger.create({
            data: {
              customerId: customer.id,
              date,
              txnType: "SALE",
              docType: "SALE",
              docId: sale.id,
              reference: number,
              debitFine: totals.metalLedgerDebit.toString(),
              remarks: `Fine gold on ${number}`,
              userId: actor.id,
            },
          });
        }
        if (totals.moneyLedgerDebit.greaterThan(0)) {
          await tx.customerMoneyLedger.create({
            data: {
              customerId: customer.id,
              date,
              txnType: "SALE",
              docType: "SALE",
              docId: sale.id,
              reference: number,
              debit: totals.moneyLedgerDebit.toString(),
              remarks: input.billingMode === "METAL" ? "Making, stone & GST (metal billed separately)" : "Invoice total",
              userId: actor.id,
            },
          });
        }

        // Approval linkage
        if (input.approvalId) {
          for (const item of sale.items) {
            if (!item.productId) continue;
            await tx.approvalItem.updateMany({
              where: { memoId: input.approvalId, productId: item.productId },
              data: { soldPieces: item.pieces },
            });
          }
          const open = await tx.approvalItem.findMany({ where: { memoId: input.approvalId } });
          const pending = open.reduce((a, x) => a + x.pieces - x.soldPieces - x.returnedPieces, 0);
          await tx.approvalMemo.update({ where: { id: input.approvalId }, data: { status: pending === 0 ? "CLOSED" : "PARTIAL" } });
        }

        await writeAudit(tx, {
          userId: actor.id,
          userName: actor.name,
          module: "Sales",
          action: "SALE_CREATED",
          recordType: "Sale",
          recordId: sale.id,
          recordRef: number,
          newValue: { customer: customer.businessName, mode: input.billingMode, grandTotal: totals.grandTotal.toString(), fine: totals.fineWeight.toString() },
        });

        return { id: sale.id, number, grandTotal: totals.grandTotal.toString() };
      },
      { timeout: 20000, isolationLevel: "Serializable" },
    );
  } catch (e) {
    if (e instanceof BusinessError) throw e;
    const code = (e as { code?: string }).code;
    if (code === "P2002") throw new BusinessError("Invoice number already exists. Please try saving again.");
    if (code === "P2034") throw new BusinessError("Another bill was saved at the same moment. Please press Save again.");
    console.error("postSale failed", e);
    throw new BusinessError("Unable to save this sale. No stock or ledger changes were made.");
  }
}

/** Cancel: original rows are kept; reversal rows are appended; stock restored; audit written. */
export async function cancelSale(saleId: string, reason: string, actor: Actor) {
  if (!reason.trim()) throw new BusinessError("Please enter a reason for cancelling this invoice.");
  try {
    return await db.$transaction(async (tx: Tx) => {
      const sale = await tx.sale.findUnique({ where: { id: saleId } });
      if (!sale) throw new BusinessError("Invoice not found.");
      if (sale.status !== "ACTIVE") throw new BusinessError("This invoice is already cancelled.");
      const ret = await tx.salesReturn.count({ where: { saleId, status: "ACTIVE" } });
      if (ret > 0) throw new BusinessError("This invoice has returns against it. Cancel the returns first.");
      const now = new Date();

      const metal = await tx.customerMetalLedger.findMany({ where: { docType: "SALE", docId: saleId, status: "ACTIVE", reversesId: null } });
      for (const m of metal) {
        await tx.customerMetalLedger.create({
          data: { customerId: m.customerId, date: now, txnType: "REVERSAL", docType: "SALE", docId: saleId, reference: sale.number, debitFine: m.creditFine, creditFine: m.debitFine, reversesId: m.id, remarks: `Cancelled: ${reason}`, userId: actor.id },
        });
      }
      const money = await tx.customerMoneyLedger.findMany({ where: { docType: "SALE", docId: saleId, status: "ACTIVE", reversesId: null } });
      for (const m of money) {
        await tx.customerMoneyLedger.create({
          data: { customerId: m.customerId, date: now, txnType: "REVERSAL", docType: "SALE", docId: saleId, reference: sale.number, debit: m.credit, credit: m.debit, reversesId: m.id, remarks: `Cancelled: ${reason}`, userId: actor.id },
        });
      }
      const moves = await tx.stockMovement.findMany({ where: { docType: "SALE", docId: saleId, reversesId: null } });
      for (const mv of moves) {
        await tx.stockMovement.create({
          data: { productId: mv.productId, txnType: "REVERSAL", docType: "SALE", docId: saleId, reference: sale.number, piecesIn: mv.piecesOut, grossIn: mv.grossOut, netIn: mv.netOut, fineIn: mv.fineOut, locationId: mv.locationId, reversesId: mv.id, userId: actor.id, notes: `Cancelled: ${reason}` },
        });
        await tx.product.update({ where: { id: mv.productId }, data: { status: "AVAILABLE" } });
      }
      const taxes = await tx.taxEntry.findMany({ where: { docType: "SALE", docId: saleId, reversesId: null } });
      for (const t of taxes) {
        await tx.taxEntry.create({
          data: { docType: "SALE", docId: saleId, saleId, date: now, hsn: t.hsn, partyGstin: t.partyGstin, taxable: t.taxable.negated(), cgstRate: t.cgstRate, sgstRate: t.sgstRate, igstRate: t.igstRate, cgst: t.cgst.negated(), sgst: t.sgst.negated(), igst: t.igst.negated(), total: t.total.negated(), reversesId: t.id },
        });
      }
      await tx.sale.update({ where: { id: saleId }, data: { status: "CANCELLED", cancelledAt: now, cancelledById: actor.id, cancelReason: reason } });
      await writeAudit(tx, { userId: actor.id, userName: actor.name, module: "Sales", action: "BILL_CANCELLED", recordType: "Sale", recordId: saleId, recordRef: sale.number, oldValue: { status: "ACTIVE" }, newValue: { status: "CANCELLED" }, reason });
      return { number: sale.number };
    }, { timeout: 20000 });
  } catch (e) {
    if (e instanceof BusinessError) throw e;
    console.error("cancelSale failed", e);
    throw new BusinessError("Unable to cancel this invoice. Nothing was changed.");
  }
}
