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
- `POST /servers/:id/vote` - authenticated, idempotent Nortix server vote
- `POST /servers/:id/reviews` - authenticated 1-5 star review submission; public reviews have no replies
- `POST /servers` — `server:manage`
- `POST /servers/:id/verification` — owner only

## Campaigns and participations

- `GET /share/campaigns/:id` — public HTML social preview outside the `/v1` JSON namespace; redirects
  browsers to the campaign pop-up on its server page
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

## Sparks

- `GET /sparks/summary`
- `GET /sparks/transactions`
- `GET /sparks/shop`
- `POST /sparks/purchases`
- `GET /sparks/sponsored-stores`
- `GET /sparks/sponsored-purchases`
- `POST /sparks/sponsored-purchases`
- `GET /sparks/server-stores`
- `GET /sparks/server-store-purchases`
- `POST /sparks/server-store-purchases`
- `POST /sparks/server-store-purchases/:purchaseId/redeem`
- `POST /sparks/server-store-purchases/:purchaseId/refund`
- `GET /profile/cosmetics`
- `PUT /profile/cosmetics/equipped`
- `DELETE /profile/cosmetics/equipped`
- `GET /profile/activity`
- `POST /profile/activity/check-in` — idempotently persists today's authenticated web activity and
  returns the current streak
- `GET /profile/activity/streak` — reads the persisted streak without recording activity

Sparks are non-withdrawable, non-transferable platform points with no cash value. Purchase routes
only debit Sparks and there is no cash-out or conversion endpoint.
Cosmetic prices and level requirements come from the server catalog. Clients cannot claim an
unlock or choose an arbitrary slot. Sparks purchases debit the append-only ledger and create
durable ownership in one serializable transaction; level rewards derive from the server-owned
tester level. Equipped selections are constrained to one item per typed slot.
Sponsored gift requests use a separate catalog and fulfillment domain. Prices, required delivery
fields, availability, status, debits, and refunds are backend-controlled. Player purchase queries
are always scoped to the authenticated account.
Server owners can create and edit a private Sparks storefront before verification. Publishing it
to Server Market requires a claimed, verified, publicly discoverable server with a recent
capability-bearing plugin connection and an active server-bound signing key. A purchase may target
the buyer or a gift recipient's Nortix username. It starts in `PURCHASED`; only the recipient can
move it to `PENDING_DELIVERY`, and the signed plugin moves it to `DELIVERED`. A self-purchase can
be refunded for 14 days only while it remains unredeemed. Gifts are not eligible for a
discretionary refund.
Delivery is allowed only while the recipient's exact premium or server-scoped Minecraft identity
remains active. Stock and Sparks debits are updated atomically. Commands are snapshotted at
purchase time, remain private to authorized owners and the server's signed plugin, and a terminal
fulfillment failure may automatically restore stock and Sparks.

## Owner operations

- `GET /owner/servers`
- `DELETE /owner/servers/:serverId/registration` — owner-only removal of an unclaimed direct
  registration; requires the exact server name and a reason
- `GET /owner/campaigns`
- `GET /owner/campaign-balance`
- `POST /owner/campaign-balance/checkout`
- `GET /owner/analytics`
- `GET|PUT /owner/servers/:id/store`
- `POST /owner/servers/:id/store/media` (raw PNG, JPEG, or WebP; maximum 2 MB)
- `POST /owner/servers/:id/store/items`
- `PATCH /owner/servers/:id/store/items/:itemId`
- `GET /owner/servers/:id/store/purchases`
- `GET /owner/store-sales`
- `POST /owner/store-payouts`

The checkout endpoint returns a mock session locally. `POST /payments/webhooks/mock` verifies an
HMAC signature, stores a unique provider event, and creates one idempotent purchased-credit entry.

Store sales reporting is owner-only and never appears in player responses. Delivery creates an
append-only private proceeds entry whose eligibility date is seven days after purchase. A proceeds
request transactionally reserves only currently eligible entries. Requests remain unavailable
unless an operator has explicitly enabled the workflow and a Nortix administrator has attached a
reviewed provider account reference.

An account can have only one active registration for the same normalized edition, hostname, and
port. Separate accounts may register the same unclaimed public endpoint, but the first account to
complete independent ownership verification becomes its only owner. The claim transaction expires
all other pending registrations and challenges for that endpoint. Once claimed, new competing
registrations are rejected.

Server-owned items use explicit `DRAFT`, `PUBLISHED`, and `UNPUBLISHED` states. Only `PUBLISHED`
items from available stores are returned by the player catalog or accepted by the purchase
service. Owner permissions are required to edit or preview the other states. Image uploads are
file-signature checked, server-scoped, and returned under generated opaque same-origin URLs.

## Moderation

- `GET /admin/overview`
- `GET /admin/campaigns`
- `GET /admin/campaign-servers` — admin-only sponsored-campaign targets
- `GET /admin/campaigns/ongoing` — admin-only termination candidates
- `POST /admin/campaigns/sponsored` — admin-only Nortix-funded campaign creation
- `POST /admin/campaigns/:id/terminate` — admin-only termination and Campaign Credits refund policy
- `POST /admin/campaigns/:id/review`
- `GET|POST /admin/sponsored-stores`
- `PATCH /admin/sponsored-stores/:storeId`
- `POST /admin/sponsored-stores/:storeId/items`
- `PATCH /admin/sponsored-items/:itemId`
- `GET /admin/sponsored-purchases`
- `POST /admin/sponsored-purchases/:purchaseId/actions`
- `GET /admin/server-store-payouts`
- `PUT /admin/server-store-payout-profile`
- `POST /admin/server-store-payouts/:payoutId/actions`
- `POST /admin/completions/:id/review`
- `GET /admin/payment-events`
- `GET /admin/ledger`
- `GET /admin/audit-logs`

Moderator and administrator permissions are checked server-side. Internal economics, risk signals,
and ledgers are never serialized from public campaign endpoints.

Sponsored campaigns use the normal campaign and milestone contract, but have an explicit
`NORTIX_SPONSORED` funding source and never debit the server owner's Campaign Credits ledger.
Termination requires an exact campaign-ID confirmation and records an immutable termination
snapshot. `REFUND_ALL`, `REFUND_UNUSED`, and `NO_REFUND` affect only the owner's Campaign Credits
reservation. Already verified player Sparks are not reversed.

## Integrations

- `POST /integrations/server/events`
- `POST /integrations/client/events`
- `GET /integrations/campaigns/:campaignId/config`
- `POST /plugin/presence`
- `GET /plugin/public-profiles/:minecraftUsername`
- `GET /plugin/store-deliveries/next`
- `POST /plugin/store-deliveries/result`
- `POST /owner/servers/:id/plugin-credentials`
- `GET /owner/servers/:id/campaign-eligibility`

See [integrations.md](integrations.md) for signatures and replay protection.

Plugin requests are authenticated with a per-server P-256 key pair. The API stores only the public
key and verifies a signature over the method, path, body digest, timestamp, nonce, and idempotency
key. Nortix stores aggregate counts and server-scoped one-way UUID hashes for at most 14 days.
Campaign eligibility requires at least 10 average active players across a fresh,
sufficiently-spread seven-day sample history, and is checked during both campaign creation and
submission.

The plugin profile endpoint returns only an allowlisted public tester summary. It never returns
Sparks, campaign history, identity records, internal account IDs, moderation state, or private
activity.

## Pagination and idempotency

List endpoints use `page` and `pageSize`; page size is capped at 50. Payment provider events,
Sparks rewards, campaign-credit purchases, and cosmetic purchases use unique idempotency keys
stored in PostgreSQL.

## Inbox, messages, and notifications

Authenticated account endpoints:

- `GET /v1/notifications/summary`
- `GET /v1/notifications?unread=true|false`
- `PATCH /v1/notifications/:id/read`
- `DELETE /v1/notifications/:id`
- `GET /v1/messages?unread=true|false`
- `PATCH /v1/messages/:deliveryId/read`
- `DELETE /v1/messages/:deliveryId`
- `POST /v1/inbox/read-all`
- `GET /v1/notification-preferences`
- `PUT /v1/notification-preferences`

Every read, read-state mutation, and archive operation is scoped by the authenticated local user
ID. A delivery ID supplied by the browser is never sufficient to access another account's data.

Nortix administrator endpoints:

- `POST /v1/admin/enrollment/redeem` — authenticated account redeems a short-lived, single-use
  operator token; this is the only admin route that does not require a pre-existing staff role
- `GET /v1/admin/messages`
- `POST /v1/admin/messages`
- `POST /v1/admin/messages/:id/send`

These routes require the platform-level `message:send` permission, which is assigned only to
Nortix administrators. Server-team administrator roles never grant this permission. Sending
selects recipients on the backend, creates private delivery records transactionally, and writes an
append-only audit event.
