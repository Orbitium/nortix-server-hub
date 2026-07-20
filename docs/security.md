# Security model

## Trust boundaries

The backend never trusts:

- roles or balances submitted by the frontend;
- Firebase client state or custom claims as local authorization;
- server ownership assertions;
- milestone reward amounts or completion claims;
- payout state submitted by a player;
- plugin/client events without a valid signature, timestamp, key scope, and idempotency key.

## Controls implemented

- Firebase Admin token verification with revoked-token checks
- Local non-exclusive roles mapped to permissions
- Server ownership checks inside services
- Zod validation for shared write contracts
- Prisma parameterized queries
- secure HTTP headers, constrained CORS, and per-IP rate limits
- safe error envelopes with request IDs
- structured logs with authorization, signature, and payout destinations redacted
- HMAC payment-webhook validation and provider-event idempotency
- signed Minecraft event ingestion, five-minute replay window, and event-ID idempotency
- explicit withdrawal states and reservation/cancellation ledger entries
- admin action audit records

The browser uses bearer tokens and does not rely on cookie ambient authority, so cross-site form
requests cannot silently authenticate. If cookie sessions are added later, CSRF tokens and strict
same-site policy become required.

## Sensitive data

Payout destinations are represented by provider references and masked in normal moderator views.
Server connection secrets are not part of the public `Server` model. Provider credentials and
signing keys come from validated environment variables. Production deployments should store
secrets in the hosting platform's encrypted secret manager and rotate them periodically.

## Fraud and privacy

Fraud signals are stored as limited risk flags with privacy-safe metadata. Uncertain signals create
a review state rather than an automatic permanent ban. Collection should remain necessary,
proportionate, time-limited, and access-controlled. Device or network summaries should be derived
and minimized rather than exposing raw identifiers broadly.

## Production checklist

- Replace all placeholder secrets.
- Set `AUTH_MODE=firebase`; disable mock headers. `FIREBASE_PROJECT_ID` is required
  for public-key ID-token verification. Configure both optional Firebase Admin
  service-account fields when immediate Firebase revocation and disabled-user
  checks are required.
- Configure exact production CORS origins.
- Require TLS at the proxy and database.
- Use a provider-managed encrypted secret store.
- Apply database backups, retention policy, and restore drills.
- Add webhook IP/provider controls when supported.
- Add per-key integration scopes and hashed rotating API keys to the request verifier.
- Complete legal, privacy, payout-country, and compliance review before real money movement.
- Run dependency, container, and migration security checks in CI.
