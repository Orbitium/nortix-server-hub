import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const webDist = resolve(root, "apps/web/dist");
const deploymentDist = resolve(root, "dist");

await rm(deploymentDist, { recursive: true, force: true });
await mkdir(resolve(deploymentDist, "client"), { recursive: true });
await mkdir(resolve(deploymentDist, "server"), { recursive: true });
await mkdir(resolve(deploymentDist, ".openai"), { recursive: true });
await cp(webDist, resolve(deploymentDist, "client"), { recursive: true });

const worker = `export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");
    if (request.method === "GET" && acceptsHtml) {
      return env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
    }
    return response;
  },
};
`;

await writeFile(resolve(deploymentDist, "server/index.js"), worker);
const hosting = await readFile(resolve(root, ".openai/hosting.json"), "utf8");
await writeFile(resolve(deploymentDist, ".openai/hosting.json"), hosting);

console.info("Prepared Cloudflare-compatible Nortix frontend in dist/.");
