import { execFileSync, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

import { expect, request as playwrightRequest, test } from '@playwright/test';
import { Pool } from 'pg';

const repoRoot = process.cwd();
const databaseUrl = process.env.DATABASE_URL_TEST;
const imageName = 'guteli-task6-order-persistence:local';
const productId = '00000000-0000-4000-8000-000000000001';
const customerName = 'Cliente Persistencia Task 6';
const phone = '+502 5899-1234';
const deliveryLocation = 'Zona 15, punto privado Task 6';

function docker(args: string[]) {
  return execFileSync('docker', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function dockerLogs(containerName: string) {
  const result = spawnSync('docker', ['logs', containerName], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`docker logs exited with status ${result.status}`);
  }

  return `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
}

function getPublishedBaseUrl(containerName: string) {
  const publishedPort = docker(['port', containerName, '3000/tcp']).match(
    /127\.0\.0\.1:(\d+)/,
  )?.[1];

  if (!publishedPort) {
    throw new Error('Docker did not publish the app container port.');
  }

  return `http://127.0.0.1:${publishedPort}`;
}

async function waitForApp(baseUrl: string) {
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      // The production server needs a brief window during container startup.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(
    'The isolated production app container did not become ready.',
  );
}

test('keeps an accepted unpaid order and pending notification after an app-container restart', async () => {
  test.setTimeout(10 * 60_000);
  expect(databaseUrl).toBeTruthy();

  const containerName = `guteli-test-order-persistence-${process.pid}`;
  const pool = new Pool({ connectionString: databaseUrl });
  let api: Awaited<ReturnType<typeof playwrightRequest.newContext>> | undefined;

  docker(['build', '--target', 'runner', '--tag', imageName, '.']);

  try {
    docker([
      'run',
      '--detach',
      '--name',
      containerName,
      '--network',
      'guteli-test_default',
      '--publish',
      '127.0.0.1::3000',
      '--env',
      'DATABASE_URL=postgresql://guteli:guteli@database:5432/guteli_test',
      '--env',
      'RATE_LIMIT_SECRET=task6-rate-limit-secret-at-least-32-bytes',
      '--env',
      'RECEIPT_TOKEN_SECRET=task6-receipt-secret-at-least-32-bytes',
      '--env',
      'TRUSTED_PROXY_HOPS=1',
      imageName,
    ]);

    const baseUrl = getPublishedBaseUrl(containerName);
    await waitForApp(baseUrl);
    api = await playwrightRequest.newContext({ baseURL: baseUrl });

    const createResponse = await api.post('/api/orders', {
      headers: {
        'content-type': 'application/json',
        'idempotency-key': randomUUID(),
        'x-forwarded-for': '198.51.100.61',
        'x-request-id': randomUUID(),
      },
      data: {
        customerName,
        phone,
        fulfillment: 'delivery',
        requestedDate: '2099-12-31',
        deliveryLocation,
        items: [{ productId, quantity: 1 }],
      },
    });
    expect(createResponse.status()).toBe(201);
    const created = (await createResponse.json()) as {
      order: {
        publicId: string;
        receiptToken: string;
        orderStatus: string;
        paymentStatus: string;
      };
    };
    expect(created.order).toMatchObject({
      orderStatus: 'RECEIVED',
      paymentStatus: 'UNPAID',
    });
    expect(created.order).not.toHaveProperty('notificationStatus');
    expect(created.order).not.toHaveProperty('notificationSent');

    const aggregateBeforeRestart = await pool.query<{
      order_count: string;
      payment_status: string;
      pending_count: string;
      sent_count: string;
      sent_at_count: string;
    }>(
      `
        SELECT
          count(DISTINCT orders.id)::text AS order_count,
          min(orders.payment_status::text) AS payment_status,
          count(*) FILTER (WHERE outbox_events.state = 'PENDING')::text AS pending_count,
          count(*) FILTER (WHERE outbox_events.state = 'SENT')::text AS sent_count,
          count(outbox_events.sent_at)::text AS sent_at_count
        FROM orders
        JOIN outbox_events
          ON outbox_events.payload ->> 'orderId' = orders.id::text
        WHERE orders.public_id = $1
          AND outbox_events.event_type = 'OWNER_ORDER_CREATED'
      `,
      [created.order.publicId],
    );
    expect(aggregateBeforeRestart.rows).toEqual([
      {
        order_count: '1',
        payment_status: 'UNPAID',
        pending_count: '1',
        sent_count: '0',
        sent_at_count: '0',
      },
    ]);

    docker(['restart', '--timeout', '10', containerName]);
    const restartedBaseUrl = getPublishedBaseUrl(containerName);
    await waitForApp(restartedBaseUrl);
    await api.dispose();
    api = await playwrightRequest.newContext({ baseURL: restartedBaseUrl });

    const receiptResponse = await api.get(
      `/api/order-status/${created.order.receiptToken}`,
      { headers: { 'x-request-id': randomUUID() } },
    );
    expect(receiptResponse.status()).toBe(200);
    expect(await receiptResponse.json()).toMatchObject({
      receipt: {
        publicId: created.order.publicId,
        orderStatus: 'RECEIVED',
        paymentStatus: 'UNPAID',
      },
    });

    const aggregateAfterRestart = await pool.query<{
      order_count: string;
      pending_count: string;
      sent_count: string;
    }>(
      `
        SELECT
          count(DISTINCT orders.id)::text AS order_count,
          count(*) FILTER (WHERE outbox_events.state = 'PENDING')::text AS pending_count,
          count(*) FILTER (WHERE outbox_events.state = 'SENT')::text AS sent_count
        FROM orders
        JOIN outbox_events
          ON outbox_events.payload ->> 'orderId' = orders.id::text
        WHERE orders.public_id = $1
          AND outbox_events.event_type = 'OWNER_ORDER_CREATED'
      `,
      [created.order.publicId],
    );
    expect(aggregateAfterRestart.rows).toEqual([
      { order_count: '1', pending_count: '1', sent_count: '0' },
    ]);

    const logs = dockerLogs(containerName);
    expect(logs).not.toContain(phone);
    expect(logs).not.toContain(deliveryLocation);
  } finally {
    await api?.dispose();
    await pool.end();
    spawnSync('docker', ['rm', '--force', containerName], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
  }
});
