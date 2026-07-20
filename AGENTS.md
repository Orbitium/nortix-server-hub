# Nortix Server Hub agent guide

This file applies to the entire repository. It defines the product requirements and engineering
constraints that automated coding agents must preserve.

## Deployment prohibition

**Agents must never deploy or publish this project.** Stop after local implementation and local
validation.

Prohibited actions include:

- deploying or publishing through OpenAI Sites or any other hosting provider;
- starting, updating, or promoting a Cloudflare Pages, Workers, Tunnel, or `cloudflared`
  production deployment;
- pushing images to a container registry or starting a remote Docker workload;
- changing production environment variables, secrets, domains, DNS records, or hosted databases;
- running production migrations or invoking production webhooks, APIs, queues, or moderation
  actions;
- treating a successful build as permission to release it.

Local development servers, local Docker Compose, local databases, test fixtures, builds, and
deployment-package validation are allowed. Never expose a local service through a public tunnel.
If a task requests deployment, prepare and validate the deployable artifacts, then report that a
human operator must perform the release outside the agent workflow.

## Product purpose

Nortix is a Minecraft server discovery and playtesting platform for three audiences:

1. Players discover servers, join campaigns, complete optional milestones, submit useful
   feedback, and may receive Sparks.
2. Server owners register one or more servers, invite team members, configure integrations and
   campaigns, and use detailed player-behaviour analytics to improve their servers.
3. Nortix moderators and administrators operate the platform through internal moderation,
   analytics, activity-monitoring, messaging, access-control, and termination tools.

The experience must use one consistent Nortix interface across public, player, owner, and admin
routes. The Community section and badges are currently out of scope and must not be restored
without an explicit product decision.

## Product language and rewards

- Player-facing UI must not show earnings, cash balances, dollar values, withdrawals, or monetary
  reward promises.
- Display Sparks only. Use qualified language such as "up to 100 Sparks", "may receive", or
  "could earn". Never imply that a reward is guaranteed before backend verification.
- Sparks are non-withdrawable, non-transferable, have no cash value, and are separate from
  reputation.
- Do not use play-to-earn, passive-income, investment, crypto, easy-money, or similar language.
- Server-owner private accounting or campaign-allocation data must never leak into player-facing
  responses.

## Required product areas

### Public and player experience

- Public server discovery supports useful search and filters, but publishing a server requires an
  authenticated account.
- Contributing to or joining a campaign requires an authenticated account.
- Player features include campaign discovery, quests, streaks, Sparks activity and preferences,
  campaign progress, Minecraft identity linking, and private account activity logs.
- On first visit, the UI may ask whether the visitor is a player or server owner and route the
  experience accordingly.
- Never expose one user's private profile, participation, identity, reward, or activity data to
  another user.

### Server-owner experience

- A user may own or help manage multiple servers. Accepted team memberships must appear alongside
  owned servers, with every action limited by the membership's permissions.
- Owners can register servers, verify ownership, invite team members by Nortix username, accept or
  revoke invitations, configure campaigns and milestones, manage plugin connections, and control
  discovery and Sparks-related settings.
- Owners fund campaigns with Campaign Credits, not player Sparks. A campaign budget cannot exceed
  the backend-calculated Campaign Credits ledger balance. Owners do not set participant limits;
  Nortix derives internal capacity and a broad potential-exposure range from the budget and
  campaign configuration.
- Owner dashboards should provide detailed but readable product intelligence: discovery,
  acquisition, joins, activation, retention, milestone completion, useful feedback, campaign
  performance, trends, funnels, cohorts, and clearly labelled data-quality limitations.
- Analytics must be server-scoped and permission-checked. Do not expose private benchmarks,
  identities, or another owner's raw data.

### Administration and moderation

- Admin and moderator interfaces are internal, role-gated surfaces.
- Expected capabilities include user and server review, campaign moderation, suspensions and
  terminations, admin messages, audit trails, activity monitoring, platform-usage analytics, and
  carefully permissioned data correction.
- Destructive or sensitive actions require explicit confirmation, a reason, least-privilege
  permission checks, and an immutable audit record.
- Moderator responses expose only the fields needed for the moderation task. Raw ledgers,
  secrets, and unrestricted data editing are admin-only.

## Minecraft server integrations

### Server ownership verification

- Paper and Velocity integrations support Minecraft 1.16 through the latest supported release.
- A website-generated two-way code can be placed in the server MOTD by the plugin or owner. The
  backend independently reads the public MOTD before claiming the server.
- A verified proxy covers its registered backend servers; individual proxy backends must not each
  require a separate public verification.
- Each plugin instance and event is bound to the verified server and authenticated with a
  server-specific credential. Never accept a server ID supplied by the plugin as authority on its
  own.

### Premium Minecraft identities

- Premium account ownership is verified only through the Nortix-operated, fail-closed,
  online-mode verification server. Third-party Paper or Velocity plugins are not an identity root
  of trust.
- The site issues a short-lived, single-use claim code. The Nortix verifier submits the authenticated
  UUID and username to the backend using a dedicated HMAC secret that is never sent to browsers or
  third-party servers.
- Store only a hash of the claim code. Enforce expiry, replay resistance, atomic consumption, and
  uniqueness of the premium UUID.
- A verified premium identity is reusable across eligible servers and campaigns until its owner
  unlinks it in the web UI.

### Cracked/offline-mode identities

- A cracked username is never a global profile identity. It is a private link between one Nortix
  user, one exact server, and one normalized Minecraft name.
- A user must reserve the name on that server before the name's first observed join.
- Reject the reservation if the server has historical evidence that the name played before. Do not
  enable reservations until the server plugin finishes uploading bounded historical-player batches.
- Pending reservations expire after 30 minutes unless a qualifying first join occurs. Join time is
  the signed event occurrence time, not delivery time.
- Enforce rolling backend limits of at most three cracked-name reservation attempts per hour and
  five per 24 hours across servers.
- Release an active cracked link after three days if it has produced no milestone progress.
- Prevent concurrent open reservations for the same normalized name and server using database
  constraints and serializable transactions.
- A collision with another owner must return a privacy-preserving message such as "linked to
  someone else" without revealing their identity.
- Owners can view and release only their own links and view only their own identity activity log.

### Milestones and plugin events

- Milestone definitions are configured by owners in the web application and evaluated by the
  backend. Plugins submit bounded attestations; they do not decide rewards or completion status.
- Support normal servers and per-backend-server progress on proxies.
- Integration support may adapt popular PvP, Lifesteal, and Skyblock plugin APIs into normalized
  events such as unique-player kills, playtime, levels, quests, regions, achievements, ranks, and
  returns.
- Require stable idempotency keys, signed requests, nonce/replay protection, event-time windows,
  capability checks, server binding, schema/range validation, and auditable storage.

## Security invariants

- The Fastify API and PostgreSQL database are the source of truth. Never trust browser state,
  client-provided ownership, plugin claims, cached balances, URL parameters, or analytics payloads
  as authority.
- Firebase establishes identity only. Application roles, status, permissions, ownership, and team
  membership come from the local database and are rechecked server-side.
- Every authenticated read and mutation must derive the actor from verified authentication and
  scope queries by that actor, an owned resource, or an accepted permission-checked team
  membership.
- Use explicit Prisma `select` clauses at public and cross-role boundaries. Do not serialize full
  database models by convenience.
- Public server and campaign APIs return allowlisted fields from approved, publicly listed
  resources only.
- Important mutations must be transactional, idempotent where retryable, rate-limited where
  abuse-prone, and recorded in an append-only audit trail.
- Secrets belong in environment variables or secret stores. Never commit them, log them, expose
  them to Vite, place them in browser storage, or include them in API responses.
- Production must reject mock authentication, default signing secrets, and insecure verifier
  configuration.
- Use safe client errors. Keep internal identifiers, stack traces, security thresholds, and other
  users' existence or ownership details private unless disclosure is intentional.

## Architecture

This repository is a pnpm/Turborepo modular monolith:

- `apps/web`: React and Vite public, player, owner, moderator, and admin interfaces.
- `apps/api`: Fastify REST API, authentication, authorization, domain services, and integration
  ingestion.
- `packages/database`: Prisma schema, PostgreSQL migrations, client, and seed data.
- `packages/shared`: shared Zod schemas, permissions, and transport contracts.
- `packages/plugin-sdk`: signed Minecraft event and campaign configuration contracts.
- `packages/integrations`: replaceable third-party provider contracts and local mocks.
- `packages/ui`: shared Nortix UI primitives.
- `plugins/minecraft`: Paper, Velocity, and Nortix identity-verifier Gradle modules.

The deployable topology is a same-origin web and API service behind Nginx, with PostgreSQL and the
API kept on a private Docker network. The intended public origin is `https://hub.nortixlabs.com`,
with API requests under `/api/v1`. Cloudflare Tunnel is deployment infrastructure, not an
authorization boundary.

## Implementation conventions

- Preserve the existing package manager, lockfile, monorepo structure, route patterns, design
  system, and Docker topology.
- Put shared request validation in Zod schemas. Route handlers authenticate, validate, call a
  domain service, and map a safe response; business rules belong in services.
- Add committed Prisma migrations for schema changes. Do not edit an applied migration.
- Keep UI layouts responsive, keyboard accessible, touch friendly, and readable at common desktop
  and mobile sizes. Avoid tiny text and preserve consistent card/widget padding.
- Do not add placeholder controls that appear functional. Implement the interaction or label it
  clearly as unavailable.
- Preserve user changes and avoid unrelated rewrites. Do not use destructive Git commands.
- Update relevant documentation and tests when contracts or security assumptions change.

## Local validation

Use the smallest relevant checks while iterating, then run the full local gate for material
changes:

```bash
pnpm check
```

For database changes, also generate the Prisma client and validate the schema/migration. For
Minecraft plugin changes, run the Gradle test/build tasks under `plugins/minecraft`. For significant
user journeys, run the relevant end-to-end tests when the environment supports them.

A completed agent task ends with a summary of changed behavior, validation results, and any manual
operator steps. It must not include a deployment performed by the agent.
