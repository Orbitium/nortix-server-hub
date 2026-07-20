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

`AUTH_MODE=mock` uses seeded users during local development. The web app sends
`x-mock-user: seed-firebase-5` by default. Change the header to:

- `seed-firebase-1` for a server owner
- `seed-firebase-18` for a moderator
- `seed-firebase-20` for an administrator

The interface also works as a self-contained public prototype when the API is unavailable.
Read operations use realistic product fixtures; authenticated writes require the API.

## Firebase

1. Create a Firebase project and enable Email/Password and Google providers.
2. Add the `VITE_FIREBASE_*` web values to `.env`.
3. Create a Firebase Admin service account and set `FIREBASE_PROJECT_ID`,
   `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`.
4. Change `AUTH_MODE=firebase`.
5. Add the production web origin to Firebase authorized domains and `WEB_ORIGIN`.

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
Fastify. The API applies committed Prisma migrations before it starts.

Copy the deployment environment and replace every production secret:

```bash
cp .env.example .env
```

For a production account, set `AUTH_MODE=firebase` and provide both the Firebase
browser values and Admin service-account values. `AUTH_MODE=mock` is only intended
for local evaluation.

Create a remotely managed Cloudflare Tunnel in the Cloudflare dashboard, add a
published application route for `hub.nortixlabs.com`, and set its service URL to
`http://web:80`. Copy the tunnel token into `CLOUDFLARE_TUNNEL_TOKEN` in `.env`.
No public A record, API port, or database port is required.

Start the complete public stack:

```bash
docker compose --profile tunnel up -d --build
```

For local Docker testing without Cloudflare:

```bash
# Set AUTH_MODE=mock in .env for local-only evaluation.
docker compose up -d --build
```

Open `http://localhost:8080`. The browser still uses `/api/v1`, so the same-origin
proxy path is exercised locally. Check container readiness with:

```bash
docker compose ps
curl http://localhost:8080/healthz
curl http://localhost:8080/api/health
```

To apply seed data to a fresh local database:

```bash
docker compose exec api pnpm --filter @nortix/database seed
```

Do not expose ports 4000 or 5432 in production. Rotate the database password,
integration secret, payment webhook secret, Firebase credentials, and tunnel token
if an environment file is ever disclosed.

## Documentation

- [Architecture](docs/architecture.md)
- [REST API](docs/api.md)
- [Security model](docs/security.md)
- [Minecraft integration contract](docs/integrations.md)
- [Product and financial language](docs/product-language.md)

Nortix Playtests is not affiliated with Mojang Studios or Microsoft.
