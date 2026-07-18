import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of fs.readFileSync("./.env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}

const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const out = process.argv[2];

const dump = {};
for (const t of ["documents", "workspaces", "workspace_members", "usage_events"]) {
  const { data, error } = await db.from(t).select("*");
  dump[t] = error ? { error: error.message } : data;
  console.log(`${t}: ${error ? "ERR " + error.message : data.length + " rows"}`);
}
dump._takenAt = new Date().toISOString();
fs.writeFileSync(out, JSON.stringify(dump, null, 2), "utf8");
console.log(`\nwrote ${out}`);
