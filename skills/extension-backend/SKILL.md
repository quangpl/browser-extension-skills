---
name: extension-backend
description: "Builds the server API behind a Chrome extension (NestJS + MongoDB default): auth via chrome.identity, license endpoints, payment webhooks, API-key proxy, CORS. Use when an extension needs a backend, API, database, user accounts, sync, webhooks, or to hide an API key. Not for choosing a payment provider or checkout (use extension-payment)."
license: MIT
metadata:
  author: quangpl
  version: "2.0.0"
---

# Extension Backend

Server-side code an extension talks to: verifies who the user is, holds secrets, records entitlements, and receives provider webhooks. Extension-side calls go through the service worker.

## Decide whether a backend is needed

Decide from the request and repo, state the decision with its reason in one line, and continue.

| Signal in the request | Why it needs a server |
|---|---|
| Calls a paid/third-party API with a key | Everything in the extension bundle is public; the key must live server-side behind a proxy |
| Accounts, data shared across devices or browsers, data beyond `chrome.storage.sync` quotas | Needs a user identity and a database |
| Paid features, licenses, trials | Entitlement must be decided where the user cannot patch the code |
| Payment provider events (subscription created/canceled) | Webhooks need a public HTTPS endpoint with signature verification |

No backend: local-only features, settings that fit `chrome.storage.sync`, or public keyless APIs the service worker can call directly. Say so and stop.

## Defaults

- **Existing backend in the repo** (Express/Fastify/Hono/NestJS server, Next.js route handlers, Supabase/Firebase functions): add the endpoints there using its conventions. Do not introduce NestJS next to it.
- **Otherwise**: NestJS 12 (ESM scaffold, Express 5 adapter) + MongoDB via `@nestjs/mongoose` 12 / Mongoose 9, in a sibling folder (`server/`, or `apps/api` in a monorepo).
- **Auth**: `chrome.identity.getAuthToken` (Chrome, Google accounts) → access token verified server-side. `launchWebAuthFlow` for other OAuth providers or browsers without `getAuthToken`.
- **Payments**: Stripe webhook shape unless the repo or user names another provider.
- **Hosting**: any Node 22+ host. Build and run locally freely; deploy, set live payment keys, or register production webhooks only after the user confirms.

## Workflow

```
- [ ] 1. State backend decision + reason; locate existing backend or pick default
- [ ] 2. Scaffold (or open existing) and add deps, env validation, .env.example
- [ ] 3. Implement endpoints: health, auth guard, license, webhook, proxy (only those needed)
- [ ] 4. Run locally; curl health and an authed route (expect 401 without token)
- [ ] 5. Wire the extension service worker client; add API origin to host_permissions
- [ ] 6. Reload extension, trigger the call, read server logs + service-worker console; fix; repeat 4-6
- [ ] 7. Report
```

- **Scaffold** (steps 1–2): commands, `main.ts`, module, env schema in [nestjs-setup.md](references/nestjs-setup.md). Read when creating a new NestJS project or touching bootstrap/config.
- **Endpoints** (step 3): token verification, guard, proxy, webhook, DTOs in [security-patterns.md](references/security-patterns.md); schemas and idempotent writes in [mongoose-patterns.md](references/mongoose-patterns.md). Adapt to the existing stack if there is one; the logic is the same.
- **Run** (step 4): start MongoDB (Docker or Atlas URI), `pnpm start:dev`, `curl localhost:3000/health`.
- **Extension side** (step 5): manifest `identity` + `oauth2` + `key` + `host_permissions`, service-worker `api()` client with 401 retry, content-script messaging, cached entitlement check in [extension-api-patterns.md](references/extension-api-patterns.md). Read when wiring the extension to the API.
- **Feedback loop** (step 6): reload the unpacked extension, trigger the action, then check both sides: the server log line for the request (status, user `sub`) and the service-worker DevTools console/network tab. Typical failures: 401 → wrong `aud`/client ID or unpinned extension ID; CORS error → call came from a content script or origin missing from `ALLOWED_ORIGINS`; webhook 400 → raw body not enabled or wrong `whsec_`. Fix and re-run until the call succeeds end to end. Replay webhooks with `stripe listen` + `stripe trigger`.

## Endpoints (add only what the request needs)

| Method | Path | Purpose | Protection |
|---|---|---|---|
| GET | `/health` | Liveness for host + smoke test | none, unthrottled |
| GET | `/api/v1/me` | Upsert user by Google `sub`, return profile | Bearer token |
| GET | `/api/v1/entitlement` | `{ plan: 'free' \| 'pro', status: 'active' \| 'trialing' \| 'past_due' \| 'canceled' \| 'none', features: string[], currentPeriodEnd: string \| null }` | Bearer token |
| POST | `/api/v1/checkout` | Create provider checkout session with `client_reference_id = sub`; return `{ url }` | Bearer token |
| POST | `/api/v1/webhooks/:provider` | Provider events → license upsert | Signature on raw body, idempotent by event ID |
| POST | `/api/v1/<feature>` | API-key proxy to a fixed upstream | Bearer token, tight throttle, per-user quota |

## Gotchas

- **Content scripts**: their `fetch` runs as the host page's origin and is always subject to the page's CORS, even with host permissions. Route API calls through the service worker by message.
- **CORS**: service worker, popup, and side panel send `Origin: chrome-extension://<id>`; with the API in `host_permissions` they bypass CORS. Still allowlist exact origins; a `chrome-extension://` regex admits every installed extension. Firefox origins are random per install, so rely on host permissions there. CORS is not auth; non-browser clients forge `Origin`.
- **Extension ID**: unpacked and CWS IDs differ unless the manifest pins `key`. The Google OAuth client and `ALLOWED_ORIGINS` must match the ID in use.
- **Tokens**: `getAuthToken` yields an opaque access token; verify via tokeninfo and check `aud`. Key users by `sub`, not email.
- **Throttling**: `ThrottlerModule` alone does nothing until `ThrottlerGuard` is bound (`APP_GUARD`). Behind a proxy set `trust proxy`, or all users share one IP bucket.
- **Webhooks**: need `rawBody: true`; providers retry and reorder, so dedupe on event ID and derive state from the object's current status.
- **NoSQL injection**: Mongoose does not sanitize filters by default; validate DTO fields as strings and enable `sanitizeFilter`.
- **Express 5**: named wildcards (`{*splat}`) and the `simple` query parser; nested `?a[b]=` no longer parses.
- **Client-side gating**: the extension caches the entitlement (refresh every 12 h, on startup, and after checkout; 3-day offline grace) for UX only; enforce every paid feature call on the server.

## Output contract

Produce: backend source (new folder or edits in the existing backend), `.env.example` with every required variable and no real secrets, the extension-side client/manifest changes, and a short run section in the backend README if one exists.

Final message: backend decision and reason; endpoints added; files changed; verification evidence (curl output, extension call result, log lines); remaining user actions (create Google OAuth client for the extension ID, set secrets, register webhook URL, deploy) and open risks.

## References

- [nestjs-setup.md](references/nestjs-setup.md): read when scaffolding NestJS or editing `main.ts`, `app.module.ts`, env validation, Express 5 routing.
- [security-patterns.md](references/security-patterns.md): read when implementing token verification, the auth guard, an API-key proxy, webhooks, or DTO validation.
- [mongoose-patterns.md](references/mongoose-patterns.md): read when defining schemas, license persistence, webhook idempotency, or hitting Mongoose 9 deprecations.
- [extension-api-patterns.md](references/extension-api-patterns.md): read when wiring `chrome.identity`, the service-worker API client, content-script messaging, or the cached entitlement check.

Related skills, if installed: extension-payment (provider choice, checkout UX, in-extension paywall), extension-dev (extension-side features), extension-analyze (security audit).
