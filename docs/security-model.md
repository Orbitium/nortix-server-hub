# Nortix security model

## Authority

The API and PostgreSQL ledger are authoritative. Browser state, URL parameters,
Minecraft plugins, client mods, analytics payloads, and cached user balances are
not authoritative.

- A campaign completion is created from player evidence or backend-calculated
  integration evidence and remains pending until the backend review workflow
  verifies it.
- Plugin events are server-scoped attestations. The API validates their token,
  verified server, bound instance, delivery window, schema, capability, and
  ranges before storing them. Stored plugin data is explicitly marked as an
  untrusted attestation.
- Spend and withdrawal decisions recalculate balances from immutable ledger
  entries inside serializable transactions. Balance cache columns are display
  caches only.
- Legacy globally signed server and client event endpoints are retired because a
  shared secret cannot provide tenant isolation.

## Data access

- Public server and campaign routes use explicit field allowlists and only
  return approved, publicly listed resources.
- Player participation, transactions, withdrawals, and profile settings are
  always scoped to the authenticated user.
- Server-owner resources require ownership or an accepted team membership with
  the permission required by that route.
- Team membership administration and invitations are owner-only.
- Moderator data is minimized to the fields needed for the moderation task.
  Internal ledgers and audit snapshots require the admin-only internal-ledger
  permission.

## Identity and production safeguards

- Firebase Admin verifies production identity tokens and checks revocation.
- Suspended and banned accounts are rejected by the API.
- Mock authentication is refused in production.
- Development signing secrets are refused in production.
- Minecraft identities used for campaigns must be verified and owned by the
  authenticated Nortix account.
- Mock payment checkout and webhook routes are disabled in production until a
  production payment provider is configured.

## Engineering rules

New routes should use explicit Prisma `select` clauses at every public or
cross-role response boundary. Never serialize a complete database model merely
because the caller can access part of it. Every mutation must derive the acting
user from verified server-side authentication and scope the database query by
that user, an owned resource, or a permission-checked team membership.
