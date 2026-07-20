import { lookup } from "node:dns/promises";
import net from "node:net";

export type MinecraftStatus = {
  motd: string;
  versionName?: string;
  onlinePlayers?: number;
  maxPlayers?: number;
};

const encodeVarInt = (input: number) => {
  let value = input >>> 0;
  const bytes: number[] = [];
  do {
    let byte = value & 0x7f;
    value >>>= 7;
    if (value !== 0) byte |= 0x80;
    bytes.push(byte);
  } while (value !== 0);
  return Buffer.from(bytes);
};

const encodeString = (value: string) => {
  const body = Buffer.from(value, "utf8");
  return Buffer.concat([encodeVarInt(body.length), body]);
};

const frame = (payload: Buffer) => Buffer.concat([encodeVarInt(payload.length), payload]);

const readVarInt = (buffer: Buffer, offset = 0) => {
  let value = 0;
  let position = 0;
  let cursor = offset;
  while (cursor < buffer.length) {
    const byte = buffer[cursor++]!;
    value |= (byte & 0x7f) << position;
    if ((byte & 0x80) === 0) return { value, bytes: cursor - offset };
    position += 7;
    if (position >= 35) throw new Error("Minecraft status response contains an invalid VarInt.");
  }
  return null;
};

const isPrivateIpv4 = (address: string) => {
  const [a, b] = address.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b! >= 64 && b! <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b! >= 16 && b! <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a! >= 224
  );
};

const isPrivateIp = (address: string) => {
  if (net.isIPv4(address)) return isPrivateIpv4(address);
  const normalized = address.toLowerCase();
  if (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("ff")
  ) {
    return true;
  }
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? isPrivateIpv4(mapped[1]!) : false;
};

export const resolvePublicAddress = async (hostname: string) => {
  const records = await lookup(hostname, { all: true, verbatim: true });
  if (records.length === 0 || records.some(({ address }) => isPrivateIp(address))) {
    throw new Error("Server verification requires a publicly reachable address.");
  }
  return records[0]!.address;
};

const flattenDescription = (description: unknown): string => {
  if (typeof description === "string") return description;
  if (!description || typeof description !== "object") return "";
  const component = description as { text?: unknown; translate?: unknown; extra?: unknown[] };
  const own = typeof component.text === "string" ? component.text : "";
  const translated = typeof component.translate === "string" ? component.translate : "";
  const extra = Array.isArray(component.extra)
    ? component.extra.map(flattenDescription).join("")
    : "";
  return `${own}${translated}${extra}`;
};

export const pingMinecraftServer = async (
  hostname: string,
  port: number,
  timeoutMs = 5_000,
): Promise<MinecraftStatus> => {
  const address = await resolvePublicAddress(hostname);
  const handshakePayload = Buffer.concat([
    encodeVarInt(0),
    encodeVarInt(-1),
    encodeString(hostname),
    Buffer.from([(port >>> 8) & 0xff, port & 0xff]),
    encodeVarInt(1),
  ]);

  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: address, port });
    const chunks: Buffer[] = [];
    let settled = false;
    const finish = (error?: Error, value?: MinecraftStatus) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) reject(error);
      else resolve(value!);
    };

    socket.setTimeout(timeoutMs);
    socket.once("timeout", () => finish(new Error("The server did not answer the status ping.")));
    socket.once("error", (error) =>
      finish(new Error(`The server status ping failed: ${error.message}`)),
    );
    socket.once("connect", () => {
      socket.write(frame(handshakePayload));
      socket.write(frame(Buffer.from([0])));
    });
    socket.on("data", (chunk) => {
      chunks.push(chunk);
      try {
        const response = Buffer.concat(chunks);
        const packetLength = readVarInt(response);
        if (!packetLength || response.length < packetLength.bytes + packetLength.value) return;
        let offset = packetLength.bytes;
        const packetId = readVarInt(response, offset);
        if (!packetId) return;
        offset += packetId.bytes;
        if (packetId.value !== 0) throw new Error("The server returned an unexpected status packet.");
        const jsonLength = readVarInt(response, offset);
        if (!jsonLength) return;
        offset += jsonLength.bytes;
        const payload = response.subarray(offset, offset + jsonLength.value).toString("utf8");
        const status = JSON.parse(payload) as {
          description?: unknown;
          version?: { name?: string };
          players?: { online?: number; max?: number };
        };
        finish(undefined, {
          motd: flattenDescription(status.description),
          versionName: status.version?.name,
          onlinePlayers: status.players?.online,
          maxPlayers: status.players?.max,
        });
      } catch (error) {
        finish(error instanceof Error ? error : new Error("Invalid Minecraft status response."));
      }
    });
  });
};

