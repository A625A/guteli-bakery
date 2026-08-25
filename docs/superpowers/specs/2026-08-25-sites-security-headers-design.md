# Sites Security Headers Design

## Scope

Harden every response returned by `hosting/sites-worker.ts` without changing the static export, its visual design, navigation, cart, order request, or WhatsApp handoff.

## Response policy

The Worker will copy the asset response before modifying headers so its body, status, status text, content type, cache directives, and other asset metadata remain intact.

Every response will receive:

- `Content-Security-Policy` limiting resources to the same origin, blocking plugins and framing, restricting form submissions, and upgrading insecure subresources.
- `Strict-Transport-Security` with a one-year lifetime. It intentionally omits `preload` and `includeSubDomains` because this checkout does not control the parent Sites domain or its TLS policy.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `Permissions-Policy` disabling camera, geolocation, microphone, payment, and USB APIs.
- `X-Frame-Options: DENY` as defense in depth for clients that do not enforce CSP `frame-ancestors`.
- `X-XSS-Protection: 0` to disable obsolete browser XSS filters that can create unsafe behavior.

The exported Next.js pages contain framework-generated inline scripts and image style attributes. Therefore `script-src` and `style-src` retain `'unsafe-inline'`; removing those allowances requires a separate nonce/hash architecture and cannot be done safely in this static Worker-only block.

## Verification

The unit contract must prove that the Worker adds all headers while preserving the upstream response status, status text, body, content type, and cache control. The full formatter, linter, type checker, unit suite, production builds, browser flows, handoff tests, and dependency audit must pass before publication.
