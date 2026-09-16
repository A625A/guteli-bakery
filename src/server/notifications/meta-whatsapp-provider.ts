import 'server-only';

import type {
  NotificationProvider,
  NotificationResult,
  OwnerOrderMessage,
} from './types';

const DEFAULT_CONNECT_TIMEOUT_MS = 5_000;
const DEFAULT_RESPONSE_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_RESPONSE_BYTES = 64 * 1024;

export type MetaWhatsAppSettings = Readonly<{
  apiBaseUrl: string;
  apiVersion: string;
  phoneNumberId: string;
  accessToken: string;
  ownerDestination: string;
  templateName: string;
  templateLanguage: string;
  publicAdminBaseUrl: string;
}>;

export type NotificationLogEntry = Readonly<{
  event: 'owner_whatsapp_send_failed';
  code: NotificationResult['code'];
  status?: number;
}>;

export type MetaWhatsAppProviderOptions = Readonly<{
  fetchImpl?: typeof fetch;
  connectTimeoutMs?: number;
  responseTimeoutMs?: number;
  maxResponseBytes?: number;
  log?: (entry: NotificationLogEntry) => void;
}>;

class ResponseBodyTimeoutError extends Error {}
class ResponseBodyTooLargeError extends Error {}
class ConnectTimeoutError extends Error {}

function expectedAdminOrderUrl(baseValue: string, publicOrderId: string) {
  const base = new URL(baseValue);
  if (!base.pathname.endsWith('/')) base.pathname += '/';
  return new URL(`admin/orders/${encodeURIComponent(publicOrderId)}`, base)
    .href;
}

function isRepresentableMessage(
  message: OwnerOrderMessage,
  settings: MetaWhatsAppSettings,
) {
  const expectedAdminUrl = expectedAdminOrderUrl(
    settings.publicAdminBaseUrl,
    message.publicOrderId,
  );
  return (
    message.templateContractVersion === 'guteli-owner-order-created-v1' &&
    message.publicOrderId.trim().length > 0 &&
    message.adminOrderUrl === expectedAdminUrl &&
    message.bodyText.endsWith(`Administrar: ${expectedAdminUrl}`)
  );
}

function failure(
  result: NotificationResult,
  log: MetaWhatsAppProviderOptions['log'],
  status?: number,
) {
  if (result.kind !== 'accepted' && result.kind !== 'disabled') {
    log?.({
      event: 'owner_whatsapp_send_failed',
      code: result.code,
      ...(status === undefined ? {} : { status }),
    });
  }
  return result;
}

async function readBoundedBody(
  response: Response,
  maxBytes: number,
  timeoutMs: number,
) {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const bodyPromise = (async () => {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      total += result.value.byteLength;
      if (total > maxBytes) throw new ResponseBodyTooLargeError();
      chunks.push(result.value);
    }
    const combined = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(combined);
  })();
  const deadline = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(
      () => reject(new ResponseBodyTimeoutError()),
      timeoutMs,
    );
  });

  try {
    return await Promise.race([bodyPromise, deadline]);
  } finally {
    if (timeout) clearTimeout(timeout);
    void reader.cancel().catch(() => undefined);
  }
}

function acceptedMessageId(body: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const messages = (parsed as { messages?: unknown }).messages;
  if (!Array.isArray(messages) || messages.length === 0) return null;
  const id = (messages[0] as { id?: unknown } | null)?.id;
  return typeof id === 'string' && id.startsWith('wamid.') && id.length > 6
    ? id
    : null;
}

export class MetaWhatsAppProvider implements NotificationProvider {
  readonly #settings: MetaWhatsAppSettings;
  readonly #options: Required<
    Pick<
      MetaWhatsAppProviderOptions,
      | 'connectTimeoutMs'
      | 'fetchImpl'
      | 'maxResponseBytes'
      | 'responseTimeoutMs'
    >
  > &
    Pick<MetaWhatsAppProviderOptions, 'log'>;

  constructor(
    settings: MetaWhatsAppSettings,
    options: MetaWhatsAppProviderOptions = {},
  ) {
    this.#settings = settings;
    this.#options = {
      fetchImpl: options.fetchImpl ?? fetch,
      connectTimeoutMs: options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS,
      responseTimeoutMs:
        options.responseTimeoutMs ?? DEFAULT_RESPONSE_TIMEOUT_MS,
      maxResponseBytes: options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES,
      log: options.log,
    };
  }

  async sendOwnerOrderCreated(
    message: OwnerOrderMessage,
  ): Promise<NotificationResult> {
    if (!isRepresentableMessage(message, this.#settings)) {
      return failure(
        { kind: 'permanent_failure', code: 'PAYLOAD_UNREPRESENTABLE' },
        this.#options.log,
      );
    }

    let body: string;
    try {
      body = JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.#settings.ownerDestination,
        type: 'template',
        template: {
          name: this.#settings.templateName,
          language: { code: this.#settings.templateLanguage },
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: message.bodyText }],
            },
          ],
        },
      });
    } catch {
      return failure(
        { kind: 'permanent_failure', code: 'PAYLOAD_UNREPRESENTABLE' },
        this.#options.log,
      );
    }

    const controller = new AbortController();
    let timedOut = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
        reject(new ConnectTimeoutError());
      }, this.#options.connectTimeoutMs);
    });
    let response: Response;
    try {
      response = await Promise.race([
        this.#options.fetchImpl(
          `${this.#settings.apiBaseUrl}/${this.#settings.apiVersion}/${this.#settings.phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              authorization: `Bearer ${this.#settings.accessToken}`,
              'content-type': 'application/json',
            },
            body,
            redirect: 'manual',
            signal: controller.signal,
          },
        ),
        deadline,
      ]);
    } catch {
      return failure(
        timedOut
          ? { kind: 'retryable_failure', code: 'PROVIDER_TIMEOUT' }
          : { kind: 'retryable_failure', code: 'PROVIDER_NETWORK_ERROR' },
        this.#options.log,
      );
    } finally {
      if (timeout) clearTimeout(timeout);
    }

    if (response.status >= 300 && response.status < 400) {
      return failure(
        { kind: 'permanent_failure', code: 'PROVIDER_REDIRECT_BLOCKED' },
        this.#options.log,
        response.status,
      );
    }
    if (response.status === 429) {
      return failure(
        { kind: 'retryable_failure', code: 'PROVIDER_RATE_LIMITED' },
        this.#options.log,
        response.status,
      );
    }
    if (response.status >= 500) {
      return failure(
        { kind: 'retryable_failure', code: 'PROVIDER_UNAVAILABLE' },
        this.#options.log,
        response.status,
      );
    }
    if (response.status < 200 || response.status >= 300) {
      return failure(
        { kind: 'permanent_failure', code: 'PROVIDER_REQUEST_REJECTED' },
        this.#options.log,
        response.status,
      );
    }

    let responseBody: string;
    try {
      responseBody = await readBoundedBody(
        response,
        this.#options.maxResponseBytes,
        this.#options.responseTimeoutMs,
      );
    } catch (error) {
      return failure(
        error instanceof ResponseBodyTimeoutError
          ? { kind: 'retryable_failure', code: 'PROVIDER_TIMEOUT' }
          : { kind: 'retryable_failure', code: 'PROVIDER_INVALID_RESPONSE' },
        this.#options.log,
        response.status,
      );
    }

    const providerMessageId = acceptedMessageId(responseBody);
    if (!providerMessageId) {
      return failure(
        { kind: 'retryable_failure', code: 'PROVIDER_INVALID_RESPONSE' },
        this.#options.log,
        response.status,
      );
    }
    return {
      kind: 'accepted',
      code: 'PROVIDER_ACCEPTED',
      providerMessageId,
    };
  }
}
