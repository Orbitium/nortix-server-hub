# Rewarded voting

Nortix supports an optional rewarded-ad choice on the signed-in voting page. The setting is enabled
by default for every registered server and can be changed under **Owner settings → Voting**.

Players can always cast a standard vote without viewing an ad. When a server allows rewarded
voting, a player may instead opt in to one Google-served rewarded ad. A completed rewarded ad casts
one daily voting action with a weight of two. It still consumes only one of the player's five daily
voting actions and remains limited to one voting action per server per UTC day.

## Google product requirement

AdSense Offerwall rewarded ads grant access to site content and do not provide the custom completion
callback needed to award a 2× vote. Nortix therefore uses the programmable Google Ad Manager web
rewarded format through Google Publisher Tags (GPT).

Create and traffic a rewarded web ad unit in Google Ad Manager, then configure its public ad unit
path:

```dotenv
GOOGLE_AD_MANAGER_REWARDED_AD_UNIT_PATH=/1234567/nortix_rewarded_vote
```

If this variable is absent or the device/page cannot display the rewarded format, the 2× option
fails closed and the standard vote remains available. No ad network identifier or secret is sent by
the owner UI.

## Verification and abuse controls

- Starting either voting path requires a valid Cloudflare Turnstile proof.
- The API rechecks server eligibility, owner configuration, the daily per-server restriction, and
  the five-vote daily limit.
- Reward sessions expire after ten minutes, are bound to one authenticated user and server, store
  only a SHA-256 hash of the random redemption token, and can be consumed once.
- Reward redemption and weighted vote creation run in one serializable transaction.
- Owner setting changes and rewarded vote grants create audit records.
- Vote totals sum stored backend weights; the browser never supplies the weight.

Google does not provide server-side verification for rewarded ads on web. The GPT
`rewardedSlotGranted` event is therefore client-originated evidence, not cryptographic proof of an
ad view. Keep the reward limited to this non-transferable, low-impact vote multiplier. Do not reuse
this mechanism for Sparks, Campaign Credits, money, entitlements, or other valuable rewards.

## Local validation

Use Google's test inventory or a non-production Ad Manager test ad unit during local testing. A
human operator must configure the Ad Manager network and production environment variable. Agents
must not deploy this project.
