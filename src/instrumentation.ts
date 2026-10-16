import type { Instrumentation } from 'next';
import { logOperationalEvent } from './server/observability/safe-log';

// Intentionally discard error, URL, headers, route parameters and framework context.
export const onRequestError: Instrumentation.onRequestError = () => {
  logOperationalEvent('REQUEST_FAILED');
};
