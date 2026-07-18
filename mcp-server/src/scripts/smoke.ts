import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Spin up the real server over stdio and exercise it like Claude Code would.
const here = dirname(fileURLToPath(import.meta.url));
const serverEntry = resolve(here, "../index.ts");

const transport = new StdioClientTransport({
  command: "npx",
  args: ["tsx", serverEntry],
});

const client = new Client({ name: "smoke", version: "0.0.1" });
await client.connect(transport);

const tools = await client.listTools();
console.log("tools:", tools.tools.map((t) => t.name).join(", "));

const res = await client.callTool({
  name: "corpus_recall",
  arguments: { query: "fix the stripe webhook 401" },
});
const text = (res.content as any[]).map((c) => c.text).join("\n");
console.log("\n--- corpus_recall result (tail) ---");
console.log(text.split("\n").slice(-4).join("\n"));

await client.close();
process.exit(0);
