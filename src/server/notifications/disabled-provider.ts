import 'server-only';

import type { NotificationProvider, NotificationResult } from './types';

export class DisabledNotificationProvider implements NotificationProvider {
  async sendOwnerOrderCreated(): Promise<NotificationResult> {
    return { kind: 'disabled', code: 'NOT_CONFIGURED' };
  }
}
