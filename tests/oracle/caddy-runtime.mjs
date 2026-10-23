// Explicit Docker integration regression; no network, volumes or persistent container.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
const host = process.env.GUTELI_TEST_DOCKER_HOST;
const image = process.env.GUTELI_TEST_CADDY_IMAGE;
assert.match(host ?? '', /^unix:\/\/\/[A-Za-z0-9_./-]+\.sock$/);
assert.match(image ?? '', /^caddy:2@sha256:[a-f0-9]{64}$/);
const { proxy } = parse(
  readFileSync('infra/oracle/compose.yaml', 'utf8'),
).services;
const args = [
  '--host',
  host,
  'run',
  '--rm',
  '--network',
  'none',
  '--user',
  proxy.user,
];
for (const cap of proxy.cap_drop ?? []) args.push('--cap-drop', cap);
for (const cap of proxy.cap_add ?? []) args.push('--cap-add', cap);
for (const opt of proxy.security_opt ?? []) args.push('--security-opt', opt);
args.push(image, 'caddy', 'version');
const output = execFileSync('docker', args, { encoding: 'utf8' });
assert.match(output, /^v2\./);
console.log(
  'PASS: pinned Caddy executes with production user/capabilities/no-new-privileges',
);
const adapted = JSON.parse(
  execFileSync(
    'docker',
    [
      ...args.slice(0, -3),
      '--env',
      'GUTELI_HOSTNAME=guteli.invalid',
      '--env',
      'ACME_EMAIL=operator@example.invalid',
      '--mount',
      `type=bind,src=${process.cwd()}/infra/oracle/Caddyfile,dst=/etc/caddy/Caddyfile,readonly`,
      image,
      'caddy',
      'adapt',
      '--config',
      '/etc/caddy/Caddyfile',
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ),
);
for (const server of Object.values(adapted.apps.http.servers)) {
  assert.deepEqual(
    server.protocols,
    ['h1', 'h2'],
    'Do not advertise internal HTTP/3 port 8443 when only TCP 443 is published',
  );
}
const handlers = [];
function walk(value) {
  if (!value || typeof value !== 'object') return;
  if (value.handler) handlers.push(value);
  for (const item of Object.values(value)) walk(item);
}
walk(adapted);
const upstream = handlers.find((h) => h.handler === 'reverse_proxy');
assert.equal(upstream.upstreams[0].dial, 'app:3000');
assert.deepEqual(upstream.headers.request.set['X-Forwarded-Proto'], ['https']);
assert.deepEqual(upstream.headers.request.set['X-Forwarded-Host'], [
  'guteli.invalid',
]);
assert.deepEqual(upstream.headers.request.set.Host, ['guteli.invalid']);
assert.deepEqual(upstream.headers.request.set['X-Forwarded-For'], [
  '{http.request.remote.host}',
]);
assert.ok(upstream.headers.request.delete.includes('Forwarded'));
assert.ok(
  upstream.headers.request.delete
    .map((name) => name.toLowerCase())
    .includes('x-real-ip'),
);
assert.ok(
  handlers.some(
    (h) =>
      h.status_code === 308 &&
      h.headers.Location[0] === 'https://guteli.invalid{http.request.uri}',
  ),
);
console.log(
  'PASS: Caddy adapter preserves external redirect, proxy header boundary and TCP-only protocols',
);
