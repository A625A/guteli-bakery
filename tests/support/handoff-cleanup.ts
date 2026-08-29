export type HandoffSetupState = {
  databaseConnected: boolean;
  originalStockCaptured: boolean;
  mutationAttempted: boolean;
  mutationSucceeded: boolean;
};

export async function cleanupHandoffDatabase({
  state,
  restore,
  close,
}: Readonly<{
  state: HandoffSetupState;
  restore: () => Promise<unknown>;
  close: () => Promise<unknown>;
}>): Promise<void> {
  let restoreError: unknown;
  let closeError: unknown;

  try {
    if (
      state.databaseConnected &&
      state.originalStockCaptured &&
      state.mutationAttempted
    ) {
      await restore();
    }
  } catch (error) {
    restoreError = error;
  } finally {
    if (state.databaseConnected) {
      try {
        await close();
      } catch (error) {
        closeError = error;
      } finally {
        state.databaseConnected = false;
      }
    }
  }

  if (restoreError) {
    throw restoreError;
  }
  if (closeError) {
    throw closeError;
  }
}
