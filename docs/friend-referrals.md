# Friend referrals

Friend referrals use single-use, expiring invite codes. The API, not the browser, owns attribution
and qualification.

## Flow

1. An authenticated user creates an invite with `POST /api/v1/referrals`.
2. The web app shares a registration URL containing the returned code.
3. A newly created account claims the code with `POST /api/v1/referrals/claim`. Claims are accepted
   only during the account's first 24 hours. An account can claim only one invite, and an inviter
   cannot claim their own invite.
4. The backend sums the referred user's credited Sparks ledger entries created during the 30 days
   after the invite is claimed. Earlier credits and credits after that window do not count. Debits
   do not reduce earned progress. At 200 credited Sparks, the invite is atomically marked
   qualified.
5. A qualified invite completes the inviter's existing `FRIEND_REFERRAL` account quest. Its
   configured 50-Sparks quest award remains idempotent.

`GET /api/v1/referrals` is actor-scoped and returns privacy-safe labels and progress. It never
returns the referred user's identity or private account data.

Invites expire after 30 days, can be claimed once, and are recorded in the append-only audit log
when created, claimed, and qualified.

Each inviter can create at most 10 single-use friend invite links per UTC calendar month. The API
enforces the limit in the same serializable transaction that creates the invite; the browser count
is informational only.
