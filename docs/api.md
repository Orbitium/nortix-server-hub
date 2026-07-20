# REST API

Base URL: `/v1`. JSON is used for request and response bodies. Authenticated routes require a
Firebase ID token in `Authorization: Bearer <token>`. Local mock mode accepts `x-mock-user`.

Errors use:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "The submitted data is invalid.",
  "requestId": "uuid",
  "details": []
}
```

## Identity and profiles

- `GET /auth/me`
- `GET /users/me`
- `PATCH /users/me/profile`
- `GET /users/:username`

## Servers

- `GET /servers?page=1&pageSize=12&search=sky`
- `GET /servers/:slug`
- `POST /servers` — `server:manage`
- `POST /servers/:id/verification` — owner only

## Campaigns and participations

- `GET /campaigns`
- `GET /campaigns/:id` — private economics omitted
- `POST /campaigns/:id/join`
- `GET /campaigns/:id/participation`
- `GET /participations`
- `POST /participations/:id/milestones/:milestoneId/submit`
- `POST /owner/campaigns`
- `POST /owner/campaigns/:id/submit`
- `GET /owner/servers/:id/campaign-suggestions?budgetCredits=5000&maximumSparksReward=100&milestoneCount=3`

Joining requires `{ "acceptedTerms": true }`. Reward amounts and completion approval are never
accepted from the player client.

Campaign creation accepts compact player-facing copy, a campaign-level
`sparksRewardRange`, a Campaign Credits budget, and up to eight structured
milestones. Owners do not submit a participant limit. The backend derives an
internal capacity from the credit budget and campaign configuration. It rejects
budgets above the authoritative Campaign Credits ledger balance and reserves
the budget transactionally when the campaign is submitted. The suggestions
endpoint returns capability-aware plugin milestone presets and a deliberately
broad potential-exposure range. Exposure is directional and is not a delivery
promise.

## Earnings, withdrawals, and Sparks

- `GET /earnings/summary`
- `GET /earnings/transactions`
- `GET /withdrawals`
- `POST /withdrawals`
- `GET /sparks/summary`
- `GET /sparks/transactions`
- `GET /sparks/shop`
- `POST /sparks/purchases`

Sparks purchase routes can only debit Sparks and contain no conversion path to Earnings.

## Owner operations

- `GET /owner/servers`
- `GET /owner/campaigns`
- `GET /owner/campaign-balance`
- `POST /owner/campaign-balance/checkout`
- `GET /owner/analytics`

The checkout endpoint returns a mock session locally. `POST /payments/webhooks/mock` verifies an
HMAC signature, stores a unique provider event, and creates one idempotent purchased-credit entry.

## Moderation

- `GET /admin/overview`
- `GET /admin/campaigns`
- `POST /admin/campaigns/:id/review`
- `POST /admin/completions/:id/review`
- `GET /admin/withdrawals`
- `POST /admin/withdrawals/:id/transition`
- `GET /admin/payment-events`
- `GET /admin/ledger`
- `GET /admin/audit-logs`

Moderator and administrator permissions are checked server-side. Internal economics, risk signals,
and ledgers are never serialized from public campaign endpoints.

## Integrations

- `POST /integrations/server/events`
- `POST /integrations/client/events`
- `GET /integrations/campaigns/:campaignId/config`
- `POST /plugin/presence`
- `GET /plugin/public-profiles/:minecraftUsername`
- `GET /owner/servers/:id/campaign-eligibility`

See [integrations.md](integrations.md) for signatures and replay protection.

Plugin presence snapshots are authenticated with a server-scoped token. Nortix stores aggregate
counts and server-scoped one-way UUID hashes for at most 14 days. Campaign eligibility requires at
least 10 average active players across a fresh, sufficiently-spread seven-day sample history, and
is checked during both campaign creation and submission.

The plugin profile endpoint returns only an allowlisted public tester summary. It never returns
Sparks, campaign history, identity records, internal account IDs, moderation state, or private
activity.

## Pagination and idempotency

List endpoints use `page` and `pageSize`; page size is capped at 50. Financial provider events,
milestone rewards, Sparks rewards, campaign-credit purchases, withdrawals, and cosmetic purchases
use unique idempotency keys stored in PostgreSQL.
