# Minecraft integration contract

The first implementation does not ship a Minecraft plugin or client mod. The API and
`@nortix/plugin-sdk` package define the future wire contract so campaign logic does not need to be
rewritten.

## Request signing

Integration writes include:

```text
X-Nortix-Key-Id: key identifier
X-Nortix-Timestamp: 2026-07-19T20:00:00.000Z
X-Nortix-Nonce: unique random value
X-Nortix-Signature: lowercase hex HMAC-SHA256
Idempotency-Key: unique source event key
```

Canonical message:

```text
<timestamp>.<raw-json-body>
```

The signature is `HMAC_SHA256(secret, canonicalMessage)`. Requests outside a five-minute window are
rejected. Event IDs are unique in PostgreSQL. Production key resolution must also verify the key is
active, unexpired, scoped for the endpoint, and belongs to the event server.

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

## Future client mod responsibilities

- show campaign progress and verified milestone status in-game;
- provide server discovery and deep links;
- submit structured feedback;
- identify the connected Minecraft identity with explicit user consent.

## Local event simulator

```bash
pnpm --filter @nortix/api simulate:event -- \
  --server server-id \
  --campaign campaign-id \
  --type SERVER_CONNECTION
```

The simulator signs the event with `INTEGRATION_SIGNING_SECRET` and sends it to the local API. It
uses no Minecraft client or server.
