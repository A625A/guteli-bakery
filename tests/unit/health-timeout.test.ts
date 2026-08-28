import { createServer, type Socket } from 'node:net';

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const originalDatabaseUrl = process.env.DATABASE_URL;

afterEach(() => {
  vi.resetModules();

  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
});

describe('GET /health database deadlines', () => {
  it('returns a safe 503 before a stalled PostgreSQL connection can hang the route', async () => {
    const sockets = new Set<Socket>();
    const stalledServer = createServer((socket) => {
      sockets.add(socket);
      socket.on('close', () => sockets.delete(socket));
    });

    await new Promise<void>((resolve) =>
      stalledServer.listen(0, '127.0.0.1', resolve),
    );

    const address = stalledServer.address();
    if (!address || typeof address === 'string') {
      throw new Error('Expected a TCP test server address.');
    }

    process.env.DATABASE_URL = `postgresql://guteli:private@127.0.0.1:${address.port}/guteli_test`;
    vi.resetModules();

    const [{ GET }] = await Promise.all([
      import('@/app/health/route'),
      import('@/server/db/health'),
    ]);
    const routePromise = GET(new Request('http://localhost/health'));
    const deadline = Symbol('deadline');
    let deadlineTimer: ReturnType<typeof setTimeout> | undefined;

    try {
      const result = await Promise.race([
        routePromise,
        new Promise<typeof deadline>((resolve) => {
          deadlineTimer = setTimeout(() => resolve(deadline), 1_500);
        }),
      ]);

      expect(result).not.toBe(deadline);
      if (result === deadline) return;

      expect(result.status).toBe(503);
      expect(await result.json()).toEqual({
        status: 'unavailable',
        database: 'down',
        requestId: expect.any(String),
      });
    } finally {
      if (deadlineTimer) clearTimeout(deadlineTimer);
      const serverClosed = new Promise<void>((resolve, reject) =>
        stalledServer.close((error) => (error ? reject(error) : resolve())),
      );
      for (const socket of sockets) socket.destroy();
      await routePromise;
      const { pool } = await import('@/server/db/client');
      await pool.end();
      await serverClosed;
    }
  });

  it('returns a safe 503 when PostgreSQL accepts a client but stalls the health query', async () => {
    const sockets = new Set<Socket>();
    const stalledServer = createServer((socket) => {
      sockets.add(socket);
      socket.on('close', () => sockets.delete(socket));

      let startupHandled = false;
      socket.on('data', () => {
        if (startupHandled) return;
        startupHandled = true;

        const authenticationOk = Buffer.alloc(9);
        authenticationOk.writeUInt8('R'.charCodeAt(0), 0);
        authenticationOk.writeInt32BE(8, 1);
        authenticationOk.writeInt32BE(0, 5);

        const readyForQuery = Buffer.alloc(6);
        readyForQuery.writeUInt8('Z'.charCodeAt(0), 0);
        readyForQuery.writeInt32BE(5, 1);
        readyForQuery.writeUInt8('I'.charCodeAt(0), 5);

        socket.write(Buffer.concat([authenticationOk, readyForQuery]));
      });
    });

    await new Promise<void>((resolve) =>
      stalledServer.listen(0, '127.0.0.1', resolve),
    );

    const address = stalledServer.address();
    if (!address || typeof address === 'string') {
      throw new Error('Expected a TCP test server address.');
    }

    process.env.DATABASE_URL = `postgresql://guteli:private@127.0.0.1:${address.port}/guteli_test`;
    vi.resetModules();

    const [{ GET }] = await Promise.all([
      import('@/app/health/route'),
      import('@/server/db/health'),
    ]);
    const routePromise = GET(new Request('http://localhost/health'));
    const deadline = Symbol('deadline');
    let deadlineTimer: ReturnType<typeof setTimeout> | undefined;

    try {
      const result = await Promise.race([
        routePromise,
        new Promise<typeof deadline>((resolve) => {
          deadlineTimer = setTimeout(() => resolve(deadline), 1_500);
        }),
      ]);

      expect(result).not.toBe(deadline);
      if (result === deadline) return;

      expect(result.status).toBe(503);
      expect(await result.json()).toEqual({
        status: 'unavailable',
        database: 'down',
        requestId: expect.any(String),
      });
    } finally {
      if (deadlineTimer) clearTimeout(deadlineTimer);
      const serverClosed = new Promise<void>((resolve, reject) =>
        stalledServer.close((error) => (error ? reject(error) : resolve())),
      );
      for (const socket of sockets) socket.destroy();
      await routePromise;
      const { pool } = await import('@/server/db/client');
      await pool.end();
      await serverClosed;
    }
  });
});

describe('PostgreSQL pool idle errors', () => {
  it('handles the event and logs only an allowlisted classification', async () => {
    process.env.DATABASE_URL =
      'postgresql://guteli:private@127.0.0.1:5432/guteli_test';
    vi.resetModules();

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { pool } = await import('@/server/db/client');
    const rawError = Object.assign(
      new Error(
        'postgresql://guteli:private@database:5432/guteli_test customer data',
      ),
      { code: 'ECONNRESET' },
    );

    try {
      expect(() => pool.emit('error', rawError)).not.toThrow();
      expect(errorSpy).toHaveBeenCalledOnce();
      expect(errorSpy).toHaveBeenCalledWith({
        event: 'database_pool_idle_error',
        classification: 'connection_reset',
      });

      const loggedOutput = JSON.stringify(errorSpy.mock.calls);
      expect(loggedOutput).not.toContain('private');
      expect(loggedOutput).not.toContain('customer data');
      expect(loggedOutput).not.toContain('postgresql://');
    } finally {
      await pool.end();
    }
  });
});
