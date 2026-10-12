import type { Tx } from "@/lib/accounting/numbering";

export interface AuditInput {
  userId?: string | null;
  userName?: string | null;
  module: string;
  action: string;
  recordType: string;
  recordId: string;
  recordRef?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
}

/** Audit rows are written inside the same transaction as the change they describe. */
export async function writeAudit(tx: Tx, a: AuditInput) {
  await tx.auditLog.create({
    data: {
      userId: a.userId ?? null,
      userName: a.userName ?? null,
      module: a.module,
      action: a.action,
      recordType: a.recordType,
      recordId: a.recordId,
      recordRef: a.recordRef ?? null,
      oldValue: a.oldValue === undefined ? undefined : JSON.parse(JSON.stringify(a.oldValue)),
      newValue: a.newValue === undefined ? undefined : JSON.parse(JSON.stringify(a.newValue)),
      reason: a.reason ?? null,
    },
  });
}
