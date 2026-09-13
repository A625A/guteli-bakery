import { describe, expect, it, vi } from 'vitest';

import {
  DASHBOARD_REFRESH_INTERVAL_MS,
  installDashboardRefresh,
} from '@/components/admin/DashboardRefresh';

class VisibilityTarget extends EventTarget {
  visibilityState: 'visible' | 'hidden' = 'visible';
}

describe('admin dashboard refresh', () => {
  it('refreshes every 30 seconds only while the page is visible', () => {
    vi.useFakeTimers();
    const target = new VisibilityTarget();
    const refresh = vi.fn();
    const cleanup = installDashboardRefresh(refresh, target);

    expect(DASHBOARD_REFRESH_INTERVAL_MS).toBe(30_000);
    vi.advanceTimersByTime(30_000);
    expect(refresh).toHaveBeenCalledTimes(1);

    target.visibilityState = 'hidden';
    target.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(90_000);
    expect(refresh).toHaveBeenCalledTimes(1);

    target.visibilityState = 'visible';
    target.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(30_000);
    expect(refresh).toHaveBeenCalledTimes(2);

    cleanup();
    vi.advanceTimersByTime(30_000);
    expect(refresh).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
