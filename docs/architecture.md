# Architecture

## Decision summary

Nortix Playtests is a TypeScript modular monolith. The deployment shape is one Vite static
frontend, one Fastify backend, and one PostgreSQL database. Redis is intentionally absent from the
first version.

```text
Browser / Firebase client
          |
          | Firebase ID token
          v
Fastify REST API
  |-- identity + permissions
  |-- servers + verification
  |-- campaigns + milestones
  |-- participations + feedback
  |-- earnings / Sparks / campaign credits
  |-- withdrawals + mock providers
  |-- moderation + audit
  `-- signed integration ingestion
          |
          v
    Prisma / PostgreSQL
```

The web app is organized around routes and feature-specific components. The API route handlers
authenticate, validate with Zod, call a domain service, and map an HTTP response. Campaign and
withdrawal rules live outside route handlers. Prisma is used directly within those services;
generic repositories and base services would add indirection without a repeated need.

## Packages

- `@nortix/shared`: Zod input schemas, permissions, response types, and formatting utilities.
- `@nortix/ui`: small token-compatible components used by the web application.
- `@nortix/database`: Prisma schema, client, migration, and deterministic seed.
- `@nortix/integrations`: provider contracts and local mocks for payments, payouts, server
  ownership, fraud review, and future rewarded ads.
- `@nortix/plugin-sdk`: signed event and campaign-configuration contracts for future Minecraft
  plugins and client mods.

## Authentication and authorization

Firebase establishes session identity only. Fastify verifies the ID token using Firebase Admin,
then resolves the local user by Firebase UID. New authenticated identities receive a local player
profile on first request. Roles are non-exclusive arrays, so the same user can be both a player and
server owner.

Permission guards map local roles to operations. Services still enforce ownership and state
preconditions. No authorization decision trusts frontend state, Firebase client state, or Firebase
custom claims alone.

## Financial boundaries

Two active append-only ledgers exist:

1. Sparks ledger: non-withdrawable, non-transferable cosmetic progression points.
2. Campaign-credit ledger: server-owner purchased and promotional campaign capacity.

Milestone verification creates Sparks entries in the same database transaction and uses unique
idempotency keys. Purchased and promotional credit components remain
separately attributable; promotional expiry cannot debit purchased credits.

Cached balances are never authoritative. They are updated for responsive summaries after ledger
transactions and can be rebuilt from ledger entries.

## Player cosmetics

Profile presentation uses a typed cosmetic catalog (`AVATAR`, `BANNER`, `BADGE`, `TITLE`, and
`THEME`) with explicit `DEFAULT`, `LEVEL`, or `SPARKS` unlock methods. Level eligibility derives
from the backend-owned tester level. Purchased ownership remains linked to its Sparks ledger debit,
and equipped selections have a database-enforced item/slot type match.

Verified milestone completions add a fixed, idempotent amount of tester experience in the same
transaction as verification. Levels are derived from stable cumulative thresholds and never from
browser state; reputation remains a separate, non-purchasable signal.

Preview metadata is reduced to allowlisted colors, icons, and patterns before it reaches CSS;
arbitrary catalog JSON is never rendered as markup or passed through as a CSS expression. The
private profile activity endpoint scopes all aggregates and events to the authenticated player.
Public profiles expose only equipped presentation metadata and still honor profile visibility and
reputation preferences.

## Campaign state and moderation

Campaigns move through explicit states. Owners can draft and submit verified-server campaigns.
Moderators approve, request changes, reject, pause, or archive them. Every important action writes
an audit record containing actor, entity, before/after state, reason, request context, and time.

Nortix administrators have separate permissions for sponsored campaign creation and campaign
termination. Sponsorship is stored as a campaign funding source rather than simulated owner
credits. Campaign joins consume a persisted per-participant portion of the allocation so an
unused-credit refund is deterministic. Termination is a terminal state with a one-to-one immutable
snapshot of the prior state, funding source, refund policy, allocated/consumed/refunded credits,
actor, optional reason, and time. Refund ledger entries use campaign-scoped idempotency keys.

First-version milestone evidence is manual or a trusted web event. The same campaign service can
later accept verified plugin/client events because verification sources and integration events are
generic.

## Analytics

`AnalyticsEvent` stores a source, type, timestamp, optional user/server/campaign/participation
dimensions, and JSON metadata. This supports web events and manual imports now, then server plugins,
client mods, Discord, and partner APIs later. Owner views say “Insufficient data” until a retention
window contains enough eligible observations.

## Replaceable infrastructure

`CacheAdapter` and `QueueAdapter` currently use in-process implementations. Redis can be introduced
without changing domain services. Payment, payout, server verification, fraud, and rewarded-ad
providers are defined by narrow interfaces because those dependencies are already known to vary.

## Deliberately deferred

- Real payment and payout providers
- Minecraft server plugin and client mod
- Automated ownership challenges
- Rewarded ads
- Advanced analytics SaaS, A/B tests, and benchmark reports
- Redis-backed queues/caching

These are integration points, not half-built product promises.
