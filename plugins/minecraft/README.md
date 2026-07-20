# Nortix Minecraft plugins

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

## Milestone tracking

After verification, open **Plugin & Servers**, select the exact server, and
generate a one-time connection token. On that Paper backend run:

```text
/nortix connect SERVER_ID TOKEN
```

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
- `public-address`: optional verification diagnostic.
- `verification-code`: active temporary ownership code.
- `plugin-motd`: publish the ownership code in ping responses.
- `server-id` / `server-token`: backend-specific milestone connection.
- `proxy-server-name`: optional proxy backend name for diagnostics.
- `metric-poll-seconds`: optional plugin-metric and playtime interval.
- `max-queued-events`: bounded outage queue.
- `adapter-placeholders`: per-provider overrides for API/expansion version changes.

The TypeScript contracts in `@nortix/plugin-sdk` are canonical.
