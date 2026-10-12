import type { Prisma } from "@/generated/prisma/client";
import type { DocType } from "@/generated/prisma/enums";

export type Tx = Prisma.TransactionClient;

/** Indian financial year label for a date, e.g. 2026-10-04 → "26-27" */
export function financialYearLabel(d: Date): string {
  const y = d.getFullYear();
  const startYear = d.getMonth() >= 3 ? y : y - 1;
  return `${String(startYear).slice(2)}-${String(startYear + 1).slice(2)}`;
}

const DEFAULT_PREFIX: Record<DocType, string> = {
  SALE: "SALE",
  PURCHASE: "PUR",
  GOLD_RECEIPT: "GR",
  CASH_RECEIPT: "RCPT",
  APPROVAL: "APPR",
  SALE_RETURN: "RETURN",
  PURCHASE_RETURN: "PRET",
  RATE_FIXING: "RF",
  SUPPLIER_PAYMENT: "SPAY",
  ADJUSTMENT: "ADJ",
  TRANSFER: "TRF",
  EXCHANGE: "EXCH",
};

/**
 * Concurrency-safe numbering. Must be called inside the posting transaction:
 * the UPDATE takes a row lock, so two concurrent requests can never receive the same number,
 * and a rolled-back transaction releases the number (no gaps from failed saves).
 */
export async function nextNumber(tx: Tx, docType: DocType, date: Date): Promise<string> {
  const fy = financialYearLabel(date);
  await tx.numberSequence.upsert({
    where: { docType_fyLabel: { docType, fyLabel: fy } },
    create: { docType, fyLabel: fy, prefix: DEFAULT_PREFIX[docType], nextNo: 1 },
    update: {},
  });
  const seq = await tx.numberSequence.update({
    where: { docType_fyLabel: { docType, fyLabel: fy } },
    data: { nextNo: { increment: 1 } },
  });
  const no = seq.nextNo - 1;
  return `${seq.prefix}/${fy}/${String(no).padStart(seq.padding, "0")}`;
}
