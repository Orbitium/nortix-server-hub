import { createHmac } from "node:crypto";

const args = process.argv.slice(2);
const readArg = (name: string, fallback: string) => {
  const index = args.indexOf(name);
  return index >= 0 ? (args[index + 1] ?? fallback) : fallback;
};

const event = {
  id: `sim-${crypto.randomUUID()}`,
  type: readArg("--type", "SERVER_CONNECTION"),
  occurredAt: new Date().toISOString(),
  serverId: readArg("--server", "server-1"),
  campaignId: readArg("--campaign", "campaign-1"),
  metadata: { simulator: true },
};
const timestamp = new Date().toISOString();
const raw = JSON.stringify(event);
const secret = process.env.INTEGRATION_SIGNING_SECRET ?? "local-integration-secret";
const signature = createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest("hex");
const response = await fetch("http://localhost:4000/v1/integrations/server/events", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-nortix-timestamp": timestamp,
    "x-nortix-signature": signature,
    "idempotency-key": event.id,
  },
  body: raw,
});
console.info(response.status, await response.text());
