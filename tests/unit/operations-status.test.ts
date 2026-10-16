import { describe, expect, it } from 'vitest';
import {
  describeOperations,
  type OperationalFacts,
} from '@/server/operations/status';
const now = new Date('2026-10-15T12:00:00Z');
const facts: OperationalFacts = {
  database: true,
  storage: true,
  notifications: { failed: 0, unknown: 0, overdue: 0 },
  automationEnabled: false,
  worker: null,
  localOrderFailures: 0,
  now,
};
const status = (input: OperationalFacts, key: string) =>
  describeOperations(input).find((row) => row.key === key)!;
describe('owner operational states', () => {
  it('does not present absent payment/backup evidence as success', () => {
    expect(status(facts, 'payments').state).toBe('disabled');
    expect(status(facts, 'backups').state).toBe('unknown');
    expect(status(facts, 'worker').state).toBe('disabled');
  });
  it('detects dead/failed/future workers only when automation is configured', () => {
    for (const worker of [
      null,
      { status: 'ok', checkedAt: new Date(now.getTime() - 600001) },
      { status: 'failed', checkedAt: now },
      { status: 'ok', checkedAt: new Date(now.getTime() + 1) },
    ])
      expect(
        status({ ...facts, worker, automationEnabled: true }, 'worker').state,
      ).toBe('attention');
    expect(
      status(
        {
          ...facts,
          worker: { status: 'ok', checkedAt: now },
          automationEnabled: true,
        },
        'worker',
      ).state,
    ).toBe('ok');
  });
  it('flags unknown sends without encouraging retries, including with automation disabled', () => {
    const item = status(
      { ...facts, notifications: { failed: 0, unknown: 1, overdue: 0 } },
      'notifications',
    );
    expect(item.state).toBe('attention');
    expect(item.message).toContain('No los reenvíes');
  });
  it('detects persistence, storage, overdue queues and missing evidence', () => {
    expect(status({ ...facts, database: false }, 'database').state).toBe(
      'attention',
    );
    expect(status({ ...facts, storage: false }, 'storage').state).toBe(
      'attention',
    );
    expect(status({ ...facts, localOrderFailures: 1 }, 'orders').state).toBe(
      'attention',
    );
    expect(
      status({ ...facts, notifications: null }, 'notifications').state,
    ).toBe('unknown');
    expect(
      status(
        {
          ...facts,
          automationEnabled: true,
          notifications: { failed: 0, unknown: 0, overdue: 1 },
        },
        'notifications',
      ).state,
    ).toBe('attention');
  });
});
