import type { OwnerEmailRequest } from './email-message';

type Result =
  | { kind: 'accepted'; providerMessageId: string }
  | {
      kind: 'retryable';
      code:
        | 'EMAIL_RATE_LIMITED'
        | 'EMAIL_PROVIDER_UNAVAILABLE'
        | 'EMAIL_SEND_OUTCOME_UNKNOWN';
    }
  | { kind: 'permanent_failure'; code: 'EMAIL_PROVIDER_REJECTED' };

/** Fixed HTTPS endpoint, bounded request, no raw response/error logging. */
export async function sendOwnerEmail({
  apiKey,
  payload,
  idempotencyKey,
  fetchImpl = fetch,
}: {
  apiKey: string;
  payload: OwnerEmailRequest;
  idempotencyKey: string;
  fetchImpl?: typeof fetch;
}): Promise<Result> {
  try {
    const response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(8_000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      // JSONB may reorder object keys on reload; keep identical bytes on every retry.
      body: JSON.stringify({
        from: payload.from,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
      }),
    });
    if (response.status === 429)
      return { kind: 'retryable', code: 'EMAIL_RATE_LIMITED' };
    if (response.status === 408 || response.status === 409)
      return { kind: 'retryable', code: 'EMAIL_SEND_OUTCOME_UNKNOWN' };
    if (response.status >= 500)
      return { kind: 'retryable', code: 'EMAIL_PROVIDER_UNAVAILABLE' };
    if (!response.ok)
      return { kind: 'permanent_failure', code: 'EMAIL_PROVIDER_REJECTED' };
    const data = (await response.json()) as { id?: unknown };
    if (typeof data.id !== 'string' || !/^[a-zA-Z0-9_-]{1,200}$/.test(data.id))
      return { kind: 'retryable', code: 'EMAIL_SEND_OUTCOME_UNKNOWN' };
    // API acceptance alone does not establish inbox delivery.
    return { kind: 'accepted', providerMessageId: data.id };
  } catch {
    return { kind: 'retryable', code: 'EMAIL_SEND_OUTCOME_UNKNOWN' };
  }
}
