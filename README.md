# Nortix Playtests

A production-minded modular monolith for Minecraft server discovery, moderated playtesting
campaigns, verified player rewards, Sparks progression, owner analytics, and internal operations.

The prototype deliberately avoids real payment providers and automatic Minecraft verification.
Both are represented by replaceable contracts and functional local mocks.

## What is included

- React + Vite public site and responsive player, server-owner, and moderator applications
- Firebase Authentication client integration and Firebase Admin ID-token verification
- Fastify REST API with server-side permissions, ownership checks, rate limits, and safe errors
- PostgreSQL + Prisma model for the full product domain
- Append-only Earnings, Sparks, and Campaign Credit ledgers
- Manual server ownership, campaign moderation, milestone submission, and reward approval
- Mock payment and payout providers with signed, idempotent webhook handling
- Signed Minecraft integration event contracts, replay protection, and an event simulator
- Realistic deterministic seed data: 20 users, 12 servers, 8 active campaigns
- Vitest financial/authorization/idempotency coverage and three Playwright product flows
- Docker Compose for PostgreSQL, API, and web containers

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

After generating `pnpm-lock.yaml`, run:

```bash
docker compose up --build
```

The static frontend is served at `http://localhost:8080`, Fastify at
`http://localhost:4000`, and PostgreSQL at `localhost:5432`.

## Documentation

- [Architecture](docs/architecture.md)
- [REST API](docs/api.md)
- [Security model](docs/security.md)
- [Minecraft integration contract](docs/integrations.md)
- [Product and financial language](docs/product-language.md)

Nortix Playtests is not affiliated with Mojang Studios or Microsoft.
