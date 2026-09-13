import { spawn, spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:https';
import { request as httpRequest } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function requiredPort(name) {
  const value = Number(process.env[name]);
  if (!Number.isSafeInteger(value) || value < 1024 || value > 65535) {
    throw new Error(`${name} must be an unprivileged TCP port.`);
  }
  return value;
}

const appPort = requiredPort('GUTELI_PRODUCTION_APP_PORT');
const tlsPort = requiredPort('GUTELI_PRODUCTION_TLS_PORT');
if (appPort === tlsPort) throw new Error('Production test ports must differ.');
const standaloneRoot = join(process.cwd(), '.next', 'standalone');
const testRoot = await mkdtemp(join(tmpdir(), 'guteli-production-tls-'));
const uploadsRoot = join(testRoot, 'uploads');
const keyPath = join(testRoot, 'key.pem');
const certificatePath = join(testRoot, 'certificate.pem');

await mkdir(join(standaloneRoot, '.next'), { recursive: true });
await mkdir(uploadsRoot, { recursive: true });
await cp(
  join(process.cwd(), '.next', 'static'),
  join(standaloneRoot, '.next', 'static'),
  {
    recursive: true,
    force: true,
  },
);
await cp(join(process.cwd(), 'public'), join(standaloneRoot, 'public'), {
  recursive: true,
  force: true,
});

const certificate = spawnSync(
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
    keyPath,
    '-out',
    certificatePath,
  ],
  { encoding: 'utf8' },
);
if (certificate.status !== 0) {
  throw new Error('Unable to create the temporary loopback certificate.');
}

const application = spawn(process.execPath, ['server.js'], {
  cwd: standaloneRoot,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    HOSTNAME: '127.0.0.1',
    PORT: String(appPort),
    UPLOADS_ROOT: uploadsRoot,
  },
  stdio: ['ignore', 'inherit', 'inherit'],
});

const proxy = createServer(
  {
    key: await readFile(keyPath),
    cert: await readFile(certificatePath),
  },
  (incoming, outgoing) => {
    const forwarded = httpRequest(
      {
        hostname: '127.0.0.1',
        port: appPort,
        path: incoming.url,
        method: incoming.method,
        headers: {
          ...incoming.headers,
          host: `127.0.0.1:${tlsPort}`,
          'x-forwarded-proto': 'https',
          'x-forwarded-host': `127.0.0.1:${tlsPort}`,
          'x-forwarded-for': incoming.socket.remoteAddress ?? '127.0.0.1',
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
  proxy.listen(tlsPort, '127.0.0.1', resolve);
});

let stopping = false;
async function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  proxy.close();
  application.kill('SIGTERM');
  await rm(testRoot, { recursive: true, force: true });
  process.exit(exitCode);
}

application.once('exit', (code) => {
  if (!stopping) void stop(code ?? 1);
});
process.once('SIGINT', () => void stop(0));
process.once('SIGTERM', () => void stop(0));
