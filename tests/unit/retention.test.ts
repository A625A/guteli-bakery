import { describe, expect, it } from 'vitest';
import {
  planRetentionBatch,
  retentionDecision,
  retentionExecutionEnabled,
  type RetentionCandidate,
} from '@/server/privacy/retention';
const now = new Date('2026-10-15T12:00:00Z');
const row: RetentionCandidate = {
  id: 'fixture',
  orderStatus: 'COMPLETED',
  paymentStatus: 'UNPAID',
  terminalAt: new Date('2020-01-01Z'),
  anonymizedAt: null,
  legalHold: false,
  financialEvidenceRequired: false,
  notificationPending: false,
};
describe('retention proposal', () => {
  it('is disabled and repeatable without mutating inputs', () => {
    expect(retentionExecutionEnabled).toBe(false);
    const input = Object.freeze({ ...row });
    expect(planRetentionBatch([input], now)).toEqual(
      planRetentionBatch([input], now),
    );
    expect(retentionDecision(input, now)).toBe('candidate');
  });
  it.each(['PENDING', 'PAID', 'FAILED', 'REFUNDED'])(
    'preserves financial state %s',
    (paymentStatus) => {
      expect(retentionDecision({ ...row, paymentStatus }, now)).toBe(
        'financial',
      );
    },
  );
  it('holds unknown legal/financial/notification status and active orders', () => {
    expect(
      retentionDecision({ ...row, financialEvidenceRequired: undefined }, now),
    ).toBe('financial');
    expect(retentionDecision({ ...row, legalHold: undefined }, now)).toBe(
      'hold_or_unreviewed',
    );
    expect(retentionDecision({ ...row, notificationPending: true }, now)).toBe(
      'notification',
    );
    expect(retentionDecision({ ...row, orderStatus: 'RECEIVED' }, now)).toBe(
      'active',
    );
    expect(retentionDecision({ ...row, terminalAt: now }, now)).toBe('recent');
    expect(retentionDecision({ ...row, anonymizedAt: now }, now)).toBe(
      'already_anonymized',
    );
  });
  it('rejects unsafe batch sizes and shortened retention', () => {
    expect(() => planRetentionBatch([row], now, 101)).toThrow();
    expect(() => retentionDecision(row, now, 180)).toThrow();
    expect(
      planRetentionBatch(
        [
          { ...row, id: 'b' },
          { ...row, id: 'a' },
        ],
        now,
        1,
      ),
    ).toEqual([{ id: 'a', decision: 'candidate' }]);
  });
});
