# Nortix Minecraft plugins

## Nortix-operated premium identity verifier

`nortix-identity-verifier-0.5.0.jar` is only for the server operated by Nortix
at `verify.nortixlabs.com`. It deliberately refuses to operate unless the
server uses `online-mode=true` and a dedicated secret of at least 32
characters is configured.

1. Set `IDENTITY_VERIFICATION_SECRET` on the API to a new random 64-character
   value.
2. Put the same value in the verifier plugin's `verification-secret` setting.
3. Keep the server standalone and online-mode. Do not place it behind an
   offline-mode proxy.
4. Players create a ten-minute code on their Nortix account page, join the
   verification server, and run `/nortixclaim CODE`.

The secret is never accepted from browsers and should be available only to the
API and this Nortix-operated server. The plugin sends an HMAC-authenticated,
timestamped request; the API atomically consumes the one-time claim.

## Server-scoped cracked names

The standard Paper plugin 0.5.0 reports a `PLAYER_JOIN` observation with the
server-scoped name. A player must reserve that exact name on the server's
Nortix page before its first observed join. The API, not the plugin, decides
whether the reservation predates the first join and whether it is still within
the thirty-minute window.

Before the backend enables cracked-name reservations for a server, the plugin
uploads its existing Bukkit player-name history in bounded batches. This closes
the upgrade gap where a player who joined before Nortix 0.3 could otherwise be
mistaken for a first-time player. Leave `sync-player-history` enabled on every
server that offers cracked-name linking.

The Paper plugin supports Minecraft 1.16 through current Paper releases with
Java 8-compatible bytecode. The Velocity 3.x plugin verifies one public proxy;
Paper backends report milestones independently.

## Ownership verification

1. Register the public address in Nortix.
2. Choose Paper for a standalone server or Velocity for a proxy network.
3. Run `/nortix verify CODE` or `/nortixproxy verify CODE`.
4. The plugin temporarily adds the code to the public ping MOTD.
5. Nortix independently pings the address and completes the claim.

A verified Velocity proxy covers its registered child servers. Those backends
do not need public addresses or separate MOTD verification.

## Server voting links

Players can run `/nortix vote` on a connected Paper server or Velocity proxy. The plugin sends a
clickable link to `/dashboard/vote?server=SERVER_ID`, so that server is already selected after the
player signs in. The URL does not grant voting authority: Nortix still checks the authenticated
player, verified server binding, recent plugin heartbeat, Turnstile proof, and daily vote limits.

Self-hosted installations can set `web-base-url`; it defaults to `https://hub.nortixlabs.com`.

## Milestone tracking

After verification, open **Plugin & Servers**, select the exact server, and
generate a server signing-key pair. On that Paper backend run the one-time command shown by Nortix:

```text
/nortix connect SERVER_ID KEY_ID PRIVATE_KEY
```

Version 0.5.0 intentionally does not accept the older bearer-token configuration. After upgrading
from 0.4.x, rotate the server integration in Nortix and run the new connection command once.

For a proxy network, register each backend as a child of the verified proxy and
run its own connection command on each Paper backend. Each child keeps separate
credentials, capability reports, event data, and campaigns. Campaigns can track
one backend or aggregate the whole proxy network.

Native Paper milestones include:

- player kills and unique opponents;
- PvP kill streaks;
- mob kills, optionally by entity type;
- block breaks, optionally by material;
- active playtime.

Soft adapters cover ten widely used plugin ecosystems:

- BentoBox + Level
- SuperiorSkyblock2
- IridiumSkyblock
- ASkyBlock
- uSkyBlock
- LifeStealZ
- LifestealCore
- CombatLogX
- PvPManager
- mcMMO

Optional numeric metrics use PlaceholderAPI's supported integration surface.
Missing plugins or placeholders remain unavailable in the web milestone picker
and never prevent Paper from starting.

## Build

```powershell
.\gradlew.bat clean build
```

Built JARs are copied to `plugins/minecraft/dist/` and the web downloads folder.

## Paper configuration

- `api-base-url`: Nortix API base URL.
- `web-base-url`: public Nortix Hub origin used by `/nortix vote`.
- `public-address`: optional verification diagnostic.
- `verification-code`: active temporary ownership code.
- `plugin-motd`: publish the ownership code in ping responses.
- `server-id` / `server-key-id` / `server-private-key`: backend-specific signed connection. The
  API stores the matching public key only; rotating keys immediately revokes the previous pair.
- `proxy-server-name`: optional proxy backend name for diagnostics.
- `metric-poll-seconds`: optional plugin-metric and playtime interval.
- `presence-snapshot-seconds`: privacy-conscious presence interval, clamped to 30–60 seconds.
- `privacy-conscious-analytics`: enables aggregate activity samples used for campaign eligibility.
- `max-queued-events`: bounded outage queue.
- `adapter-placeholders`: per-provider overrides for API/expansion version changes.

The TypeScript contracts in `@nortix/plugin-sdk` are canonical.

## Server-store fulfillment

After a recipient redeems a purchased item in Nortix, the Paper plugin checks the signed,
server-bound store-delivery queue every ten seconds. Claimed deliveries contain console commands
whose supported placeholders were rendered by the API from an immutable purchase snapshot. Paper
executes those commands on the main server thread and signs the delivery result back to Nortix.

Completed delivery IDs are retained in the plugin data folder to avoid running a command twice
when an acknowledgement must be retried. Owners should still include `%purchase_id%` when
integrating with a command-aware fulfillment plugin so that plugin can enforce its own
idempotency. Failed terminal deliveries are refunded by the API; plugin credentials never reveal
or authorize changes to a player's Sparks balance.

## Privacy-conscious activity analytics

Connected Paper servers and Velocity proxies publish one activity snapshot every 60 seconds.
A snapshot contains the online count, capacity, software version, and the Minecraft UUID plus
current backend for players online at that moment. It does not send chat, commands, IP addresses,
coordinates, inventory, message contents, device data, or arbitrary plugin data.

The API authenticates each snapshot with the server-scoped public key, verifies the signed method,
path, body, timestamp, nonce, and idempotency key, checks the bound plugin instance and observation
time, converts UUIDs into one-way server-scoped hashes, retains only aggregate backend counts, and
removes samples after 14 days. Raw player names are not stored in activity samples, and owners
cannot view the sampled roster.

Campaign eligibility uses the rolling seven-day history. A server needs at least ten samples
spanning eight minutes, a sample from the last ten minutes, and at least 10 average online players.
Disabling activity snapshots also prevents the server from establishing campaign eligibility.

## Public player profiles

Players may run `/nortix help` or `/nortix <minecraft-name>`. Paper opens an inventory view;
Velocity displays the equivalent text view. Only public Nortix username, display name, reputation
tier, tester level, reputation score, and aggregate verified milestone count are returned.
Campaign history, Sparks, identity details, account IDs, moderation state, and private activity are
never included. An unmatched name returns “This user is not registered to Nortix.”
