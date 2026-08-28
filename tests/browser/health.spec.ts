import { expect, test } from '@playwright/test';

const validRequestId = '63f2debf-7d45-4d6b-a78f-43ff8d64fe98';

test('GET /health returns database availability and a matching request ID', async ({
  request,
}) => {
  const response = await request.get('/health', {
    headers: { 'x-request-id': validRequestId },
    maxRedirects: 0,
  });

  const body = await response.json();

  expect(response.status()).toBe(200);
  expect(response.url()).toBe('http://127.0.0.1:3000/health');
  expect(body).toEqual({
    status: 'ok',
    database: 'up',
    requestId: validRequestId,
  });
  expect(response.headers()['x-request-id']).toBe(validRequestId);
  expect(response.headers().location).toBeUndefined();
});
