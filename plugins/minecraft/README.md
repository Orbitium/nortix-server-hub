# Nortix Minecraft ownership plugins

This directory contains two deliberately small plugins. They only implement server
registration and ownership verification.

- `paper`: a standalone Paper plugin compiled against the 1.16.5 API with Java 8
  bytecode, using APIs available from Minecraft 1.16 onward.
- `velocity`: a Velocity 3.x proxy plugin compiled with Java 11 bytecode. One
  successful proxy claim covers the proxy network; backend servers do not need
  separate public ownership checks.

## Verification flow

1. Sign in to Nortix and open **Server owners → Plugin & Servers → Register server**.
2. Enter the public Java server address and choose Paper or Velocity.
3. Nortix creates a 15-minute code such as `NORTIX-A1B2-C3D4`.
4. Put the appropriate JAR in `plugins/`, restart, and run:
   - Paper: `/nortix verify NORTIX-A1B2-C3D4`
   - Velocity: `/nortixproxy verify NORTIX-A1B2-C3D4`
5. The plugin sends a handshake to the configured backend and temporarily adds
   `[NORTIX-A1B2-C3D4]` to the public ping MOTD.
6. Click **Check verification** on the website. Nortix independently sends a
   Minecraft status ping to the registered address. The claim succeeds only if
   that public response contains the matching code.

Server owners may skip the plugin and add `[CODE]` to the MOTD manually. Plugin
handshakes never claim a server by themselves.

## Build

The repository includes a Gradle wrapper:

```powershell
.\gradlew.bat clean build
```

Built JARs are copied to `plugins/minecraft/dist/`.

## Configuration

Paper writes `plugins/NortixVerification/config.yml`. Velocity writes
`plugins/nortix-verification/config.properties`. Both support:

- `api-base-url`: Nortix API origin, without a trailing slash.
- `verification-code`: current one-time code; normally set by the command.
- `public-address`: optional address echoed in the handshake for diagnostics.
- `plugin-motd` / `base-motd`: whether and how the plugin publishes the proof.

The plugin removes its active proof after the backend reports `VERIFIED`.
