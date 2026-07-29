# Nortix Plugin SDK

Contracts for future Minecraft server plugins and client mods. The SDK intentionally contains no
Minecraft-specific runtime so Paper, Fabric, Forge, Bedrock, and partner integrations can consume
the same signed REST contract.

Every integration request must include its server ID, rotating key ID, timestamp, nonce,
idempotency key, and ECDSA P-256 signature. The API stores only the public key; the private key is
shown once and remains on the Minecraft server. See `docs/integrations.md` for the canonical
request and endpoint contract.
