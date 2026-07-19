# Nortix Plugin SDK

Contracts for future Minecraft server plugins and client mods. The SDK intentionally contains no
Minecraft-specific runtime so Paper, Fabric, Forge, Bedrock, and partner integrations can consume
the same signed REST contract.

Every integration request must include a rotating key ID, timestamp, nonce, signature, and
idempotency key. See `docs/integrations.md` for the signing algorithm and endpoint contract.
