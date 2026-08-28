import { randomUUID } from 'node:crypto';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getRequestId(headers: Headers) {
  const requestId = headers.get('x-request-id');

  if (requestId && uuidPattern.test(requestId)) {
    return requestId;
  }

  return randomUUID();
}
