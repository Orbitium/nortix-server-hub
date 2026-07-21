# Nortix Playtests

A production-minded modular monolith for Minecraft server discovery, moderated playtesting
campaigns, verified player rewards, Sparks progression, owner analytics, and internal operations.

The prototype deliberately avoids real payment providers. Payments are represented by
replaceable contracts and functional local mocks. Minecraft ownership verification is
implemented through short-lived public MOTD challenges.

## What is included

- React + Vite public site and responsive player, server-owner, and moderator applications
- Firebase Authentication client integration and Firebase Admin ID-token verification
- Fastify REST API with server-side permissions, ownership checks, rate limits, and safe errors
- PostgreSQL + Prisma model for the full product domain
- Append-only Earnings, Sparks, and Campaign Credit ledgers
- Paper and Velocity ownership verification through independently checked public MOTD codes
- Mock payment and payout providers with signed, idempotent webhook handling
- Signed Minecraft integration event contracts, replay protection, and an event simulator
- Realistic deterministic seed data: 20 users, 12 servers, 8 active campaigns
- Vitest financial/authorization/idempotency coverage and three Playwright product flows
- Docker Compose for PostgreSQL, API, Nginx web, and Cloudflare Tunnel containers

## Local setup

Requirements: Node.js 22+, pnpm 10+, and Docker Desktop.

For the lightweight frontend prototype:

```bash
pnpm install
npm run dev
```

Open `http://localhost:5173`. The prototype uses local fixtures when the API is unavailable.

For the complete web, API, and database workflow:

```bash
cp .env.example .env
docker compose up -d postgres
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
npm run dev:full
```

Open `http://localhost:5173`. The API is at `http://localhost:4000`; health is
`GET /health`.

`AUTH_MODE=mock` can use seeded users during local development, but visitors stay
anonymous unless a mock identity is explicitly selected. Set `VITE_MOCK_USER` to:

- `seed-firebase-1` for a server owner
- `seed-firebase-18` for a moderator
- `seed-firebase-20` for an administrator

The interface also works as a self-contained public prototype when the API is unavailable.
Read operations use realistic product fixtures; authenticated writes require the API.

## Firebase

1. Create a Firebase project and enable Email/Password and Google providers.
2. Add the public `VITE_FIREBASE_*` web values to `.env`.
3. Download a Firebase Admin service-account JSON file to `firebase.json` in the
   repository root. This file is ignored by Git and excluded from Docker builds.
4. Set `FIREBASE_PROJECT_ID` for backend ID-token verification.
5. Change `AUTH_MODE=firebase`.
6. Add the production web origin to Firebase authorized domains and `WEB_ORIGIN`.

The backend verifies ID tokens, resolves or creates a local user, then uses local roles,
permissions, ownership, and status for authorization. Firebase custom claims are not trusted as
the application's authorization source.

## Database and seed

```bash
pnpm db:migrate
pnpm db:seed
pnpm --filter @nortix/database studio
```

Ledger rows are authoritative. Cached user balances exist only for fast summaries and are
recomputed after reward issuance.

## Validation

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Playwright starts the Vite preview automatically. The three critical flows cover:

1. Player sign-in, campaign browsing, terms acceptance, join, and progress.
2. Owner server registration, ownership evidence, and campaign submission.
3. Moderator campaign review and approval.

## Docker

The Docker deployment uses a single public origin:

- Website: `https://hub.nortixlabs.com`
- API: `https://hub.nortixlabs.com/api/v1`
- Cloudflare Tunnel origin service: `http://web:80`

PostgreSQL and Fastify stay on a private Docker network. Nginx is the only origin
reachable by `cloudflared`; it serves the React application and proxies `/api/` to
Fastify. A one-shot `migrate` container applies committed Prisma migrations after
PostgreSQL becomes healthy. The API starts only after the migration succeeds.

Copy the deployment environment and replace every production secret:

```bash
cp .env.example .env
```

For a production account, set `AUTH_MODE=firebase`, provide the Firebase browser
values and `FIREBASE_PROJECT_ID`, then place the downloaded Firebase Admin
service-account file at `./firebase.json`. Compose mounts it read-only at
`/run/secrets/firebase-service-account.json`; it is never copied into an image.
Set `FIREBASE_SERVICE_ACCOUNT_FILE` when the host file lives elsewhere. The API
uses the credential to verify token signature, issuer, audience, expiry, project
binding, revocation, and disabled-user status. `AUTH_MODE=mock` is only intended
for local evaluation.

Create a remotely managed Cloudflare Tunnel in the Cloudflare dashboard, add a
published application route for `hub.nortixlabs.com`, and set its service URL to
`http://web:80`. Copy the tunnel token into `CLOUDFLARE_TUNNEL_TOKEN` in `.env`.
No public A record, API port, or database port is required.

Start the complete public stack:

```bash
docker compose up -d --build
```

Docker caches the dependency installation separately from application source and
exports one production-only API image shared by the migration and API services.
After the first build, source-only changes reuse the dependency layer. When no
source or dependency changed, omit `--build` for the fastest restart:

```bash
docker compose up -d
```

The tunnel stack does not publish a host HTTP port. Cloudflared reaches Nginx at
`http://web:80` over the private Compose network, avoiding conflicts with ports
already used by a host web server or another container.

Check tunnel readiness with:

```bash
docker compose ps
docker compose logs --tail=100 cloudflared
docker compose exec cloudflared \
  cloudflared tunnel ready --metrics 127.0.0.1:2000
```

An unhealthy or restarting `cloudflared` container means Cloudflare has no active
connector and may return error 1033. In the Cloudflare dashboard, the tunnel must
show **Healthy** and the `hub.nortixlabs.com` public hostname must belong to the
same tunnel token stored in `.env`. If the logs report connectivity pre-check
failures, allow outbound UDP and TCP port 7844; cloudflared automatically selects
QUIC or HTTP/2 from the available paths.

For local Docker testing without Cloudflare:

```bash
# Set AUTH_MODE=mock in .env for local-only evaluation.
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
```

Open `http://localhost:8080`. The browser still uses `/api/v1`, so the same-origin
proxy path is exercised locally. Check container readiness with:

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml ps
docker compose -f docker-compose.yml -f docker-compose.local.yml logs migrate
curl http://localhost:8080/healthz
curl http://localhost:8080/api/health
```

If port 8080 is already used during local testing, set another loopback port without
changing the Compose files:

```bash
HTTP_PORT=8081 docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
```

Prisma Client generation and all required workspace builds happen while the API
image is built. Schema migrations run on every Compose startup and safely skip
changes that are already applied.

Seed data is intentionally not applied automatically because the development seed
replaces existing records. To seed a new, disposable local database:

```bash
docker compose run --rm migrate pnpm --filter @nortix/database seed
```

Never run that seed command against a persistent or production database.

### Production public-server catalog

The `20260722010000_discovered_servers` migration safely adds 50 public Minecraft
server listings with `INSERT ... ON CONFLICT DO NOTHING`. It does not delete or
replace existing data, create users, or create campaigns. These records live in a
separate discovery table and are shown as unverified public listings until an
owner registers and verifies a Nortix server.

The API refreshes their status through the
[mcsrvstat.us API](https://api.mcsrvstat.us/) using one request at a time, spaced
12 seconds apart (at most five starts per minute). Each listing is scheduled every
10 minutes. Requests have an eight-second timeout and are not retried; an HTTP 429
pauses the complete scanner for ten minutes.

Compose enables the scanner by default. Its production settings are:

```dotenv
DISCOVERY_SCAN_ENABLED=true
DISCOVERY_SCAN_INTERVAL_MINUTES=10
DISCOVERY_SCAN_SPACING_MS=12000
MCSRVSTAT_USER_AGENT=NortixServerHub/1.0 (+https://hub.nortixlabs.com/contact)
SERVER_VALIDATION_SECRET=<unique-random-secret-at-least-32-characters>
```

Set a descriptive `MCSRVSTAT_USER_AGENT` with a real project contact URL or email
before release. Applying normal Prisma migrations is the only seed step required;
do not run the destructive development seed command.

Do not expose ports 4000 or 5432 in production. Rotate the database password,
integration secret, payment webhook secret, Firebase credentials, and tunnel token
if an environment file is ever disclosed.

## Documentation

- [Architecture](docs/architecture.md)
- [REST API](docs/api.md)
- [Security model](docs/security.md)
- [Minecraft integration contract](docs/integrations.md)
- [Product and financial language](docs/product-language.md)
- [Frontend localization](docs/localization.md)

Nortix Playtests is not affiliated with Mojang Studios or Microsoft.
