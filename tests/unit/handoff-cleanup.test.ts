import { describe, expect, it } from 'vitest';

import {
  cleanupHandoffDatabase,
  type HandoffSetupState,
} from '../support/handoff-cleanup';

const partialState: HandoffSetupState = {
  databaseConnected: true,
  originalStockCaptured: false,
  mutationAttempted: false,
  mutationSucceeded: false,
};

const mutatedState: HandoffSetupState = {
  databaseConnected: true,
  originalStockCaptured: true,
  mutationAttempted: true,
  mutationSucceeded: false,
};

describe('handoff database cleanup', () => {
  it('closes a partial connection without restoring an uncaptured value', async () => {
    const calls: string[] = [];

    await cleanupHandoffDatabase({
      state: partialState,
      restore: async () => calls.push('restore'),
      close: async () => calls.push('close'),
    });

    expect(calls).toEqual(['close']);
    expect(partialState.databaseConnected).toBe(false);
  });

  it('restores a captured null and closes even when restore fails', async () => {
    const calls: string[] = [];
    const restoreError = new Error('restore failed');

    await expect(
      cleanupHandoffDatabase({
        state: mutatedState,
        restore: async () => {
          calls.push('restore:null');
          throw restoreError;
        },
        close: async () => calls.push('close'),
      }),
    ).rejects.toBe(restoreError);

    expect(calls).toEqual(['restore:null', 'close']);
    expect(mutatedState.databaseConnected).toBe(false);
  });
});
