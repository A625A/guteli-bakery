/** Proposal only. No scheduler, SQL mutation or production apply path exists. */
export const retentionExecutionEnabled = false;
export const proposedRetentionDays = 1827; // Conservative five-year floor, not legal clearance.
export type RetentionCandidate = {
  id: string;
  orderStatus: string;
  paymentStatus: string;
  terminalAt: Date | null;
  anonymizedAt: Date | null;
  legalHold?: boolean;
  financialEvidenceRequired?: boolean;
  notificationPending?: boolean;
};
export type RetentionDecision =
  | 'already_anonymized'
  | 'active'
  | 'financial'
  | 'hold_or_unreviewed'
  | 'notification'
  | 'recent'
  | 'candidate';
export function retentionDecision(
  row: RetentionCandidate,
  now: Date,
  days = proposedRetentionDays,
): RetentionDecision {
  if (
    !Number.isFinite(now.getTime()) ||
    !Number.isSafeInteger(days) ||
    days < proposedRetentionDays
  )
    throw new Error('Invalid retention proposal.');
  if (row.anonymizedAt) return 'already_anonymized';
  if (!['COMPLETED', 'CANCELLED'].includes(row.orderStatus) || !row.terminalAt)
    return 'active';
  // Every financial state other than explicitly unpaid remains protected until reconciliation exists.
  if (row.paymentStatus !== 'UNPAID' || row.financialEvidenceRequired !== false)
    return 'financial';
  if (row.legalHold !== false) return 'hold_or_unreviewed';
  if (row.notificationPending !== false) return 'notification';
  if (
    !Number.isFinite(row.terminalAt.getTime()) ||
    row.terminalAt.getTime() >= now.getTime() - days * 86400000
  )
    return 'recent';
  return 'candidate';
}
export function planRetentionBatch(
  rows: readonly RetentionCandidate[],
  now: Date,
  limit = 100,
) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
    throw new Error('Invalid retention batch size.');
  return [...rows]
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, limit)
    .map((row) => ({ id: row.id, decision: retentionDecision(row, now) }));
}
