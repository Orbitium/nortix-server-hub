# Minecraft integration contract

The first implementation does not ship a Minecraft plugin or client mod. The API and
`@nortix/plugin-sdk` package define the future wire contract so campaign logic does not need to be
rewritten.

## Request signing

Integration writes include:

```text
X-Nortix-Key-Id: key identifier
X-Nortix-Server-Id: server identifier
X-Nortix-Timestamp: 2026-07-19T20:00:00.000Z
X-Nortix-Nonce: unique random value
X-Nortix-Signature: base64url ECDSA P-256 signature
Idempotency-Key: unique source event key
```

Canonical message:

```text
<HTTP method>
<path beginning with /plugin>
<server ID>
<key ID>
<timestamp>
<nonce>
<idempotency key>
<lowercase SHA-256 hex of the compact JSON body, or the empty body>
```

The signature is `SHA256withECDSA(privateKey, canonicalMessage)` on the P-256 curve. Nortix stores
the public key and never receives or stores the private key after its one-time display. Requests
outside a five-minute window are rejected, and every `(key ID, nonce)` pair is consumed atomically
in PostgreSQL to prevent replay across API instances. Event IDs remain unique in PostgreSQL. Key
resolution also verifies that the key is active, unexpired, scoped for the endpoint, and belongs to
the exact server named in both the signed headers and payload.

## Event shape

```json
{
  "id": "event-unique-id",
  "type": "TUTORIAL_COMPLETED",
  "occurredAt": "2026-07-19T20:00:00.000Z",
  "serverId": "server-id",
  "campaignId": "campaign-id",
  "participationId": "participation-id",
  "minecraftUuid": "uuid",
  "metadata": {
    "tutorial": "starter-v3"
  }
}
```

Supported source values are `WEB`, `MANUAL`, `SERVER_PLUGIN`, `CLIENT_MOD`, and `API`.

## Future server plugin responsibilities

- verify joins and active playtime;
- report tutorial, achievement, region, level, quest, boss, rank, and return events;
- fetch campaign configuration;
- assist server ownership verification;
- retry events with stable idempotency keys.

## Server-store delivery

The Paper plugin polls `GET /plugin/store-deliveries/next?serverId=...` with the same per-server
P-256 request signature. The API returns at most one claimed delivery for that exact server. It
contains an opaque purchase ID and already-rendered console commands; it never exposes a player's
Sparks balance or another server's queue.

Owners can use `%player%`, `%amount%`, `%quantity%`, `%purchase_id%`, `%item_id%`, `%buyer%`, and
`%recipient%` in command templates. Newlines, control characters, and unknown placeholders are
rejected by the shared contract. `%purchase_id%` should be passed to an idempotent command or
fulfillment plugin where possible, because a Minecraft command sequence cannot be rolled back
atomically after a process or network interruption.

After executing the commands as the server console, Paper signs a success or failure result for
`POST /plugin/store-deliveries/result`. Success completes the purchase. A terminal failure returns
the buyer's Sparks and restores finite stock. Claims are leased and can be reclaimed after a
timeout so a crashed plugin does not permanently strand the queue.

## Future client mod responsibilities

- show campaign progress and verified milestone status in-game;
- provide server discovery and deep links;
- submit structured feedback;
- identify the connected Minecraft identity with explicit user consent.

## Local event simulator

```bash
pnpm --filter @nortix/api simulate:event -- \
  --server server-id \
  --key-id integration-key-id \
  --private-key p256_private-key \
  --public-key p256_public-x.public-y \
  --type PLAYER_JOIN
```

Use a disposable local server credential from the owner integrations page. Production Minecraft
plugin traffic uses the same server-specific P-256 request contract.
