// Local TLS + official Blobs emulator. No Netlify API, deployment or live data.
import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:https';
import { request as httpRequest } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getStore, setEnvironmentContext } from '@netlify/blobs';
import { BlobsServer } from '@netlify/blobs/server';
import pg from 'pg';

const database = new URL(process.env.DATABASE_URL ?? '');
if (database.hostname !== '127.0.0.1' || database.pathname !== '/guteli_test')
  throw new Error('Loopback test database required.');
const root = await mkdtemp(join(tmpdir(), 'guteli-netlify-browser-'));
const token = randomUUID();
const server = new BlobsServer({
  directory: join(root, 'blobs'),
  token,
  logger: () => undefined,
});
const address = await server.start();
const url = `http://127.0.0.1:${address.port}`;
const blobContext = {
  siteID: randomUUID(),
  deployID: 'a'.repeat(24),
  primaryRegion: 'us-east-2',
  token,
  edgeURL: url,
  uncachedEdgeURL: url,
  apiURL: url,
};
setEnvironmentContext(blobContext);
const store = getStore({
  name: 'guteli-product-images',
  consistency: 'strong',
  region: 'us-east-2',
});
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  const { rows } = await pool.query(
    'select storage_key, mime_type from product_images',
  );
  for (const row of rows) {
    const file = join(
      process.env.UPLOADS_ROOT,
      createHash('sha256').update(row.storage_key).digest('hex'),
    );
    const body = await readFile(file);
    await store.set(row.storage_key, Uint8Array.from(body).buffer, {
      onlyIfNew: true,
      metadata: { contentType: row.mime_type },
    });
  }
} finally {
  await pool.end();
}

const key = join(root, 'key.pem'),
  cert = join(root, 'cert.pem');
const result = spawnSync(
  'openssl',
  [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-days',
    '1',
    '-subj',
    '/CN=127.0.0.1',
    '-addext',
    'subjectAltName=IP:127.0.0.1',
    '-keyout',
    key,
    '-out',
    cert,
  ],
  { stdio: 'ignore' },
);
if (result.status !== 0)
  throw new Error('Unable to create test TLS certificate.');
const app = spawn(
  process.execPath,
  [
    'node_modules/next/dist/bin/next',
    'start',
    '--hostname',
    '127.0.0.1',
    '--port',
    '3148',
  ],
  {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      NETLIFY: 'true',
      CONTEXT: 'production',
      DEPLOYMENT_PLATFORM: 'netlify',
      STORAGE_PROVIDER: 'netlify-blobs',
      NETLIFY_BLOBS_CONTEXT: Buffer.from(JSON.stringify(blobContext)).toString(
        'base64',
      ),
    },
    stdio: ['ignore', 'inherit', 'inherit'],
  },
);
const proxy = createServer(
  { key: await readFile(key), cert: await readFile(cert) },
  (incoming, outgoing) => {
    const forwarded = httpRequest(
      {
        hostname: '127.0.0.1',
        port: 3148,
        path: incoming.url,
        method: incoming.method,
        headers: {
          ...incoming.headers,
          host: '127.0.0.1:3149',
          'x-forwarded-host': '127.0.0.1:3149',
          'x-forwarded-proto': 'https',
          'x-nf-client-connection-ip':
            incoming.socket.remoteAddress ?? '127.0.0.1',
          // Deliberately untrusted; application must use the provider address above.
          'x-forwarded-for': '198.51.100.99',
        },
      },
      (response) => {
        outgoing.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(outgoing);
      },
    );
    forwarded.on('error', () => {
      if (!outgoing.headersSent) outgoing.writeHead(502);
      outgoing.end();
    });
    incoming.pipe(forwarded);
  },
);
await new Promise((resolve, reject) => {
  proxy.once('error', reject);
  proxy.listen(3149, '127.0.0.1', resolve);
});
let stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  proxy.close();
  app.kill('SIGTERM');
  await server.stop();
  await rm(root, { recursive: true, force: true });
  process.exit(code);
}
app.once('exit', (code) => {
  if (!stopping) void stop(code ?? 1);
});
process.once('SIGINT', () => void stop());
process.once('SIGTERM', () => void stop());
