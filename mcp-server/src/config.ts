import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Load mcp-server/.env regardless of the current working directory, since
// Claude Code may launch this server from the repo root. quiet:true keeps
// dotenv's banner OFF stdout — required, since MCP stdio must be pure JSON-RPC.
loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env"), quiet: true });

export const config = {
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  openaiKey: process.env.OPENAI_API_KEY ?? "",
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? "",
  workspace: process.env.CORPUS_WORKSPACE ?? "demo",
  embeddingModel: process.env.EMBEDDING_MODEL ?? "text-embedding-3-small",
  claudeModel: process.env.CLAUDE_MODEL ?? "claude-haiku-4-5-20251001",
};

export const hasSupabase = () => Boolean(config.supabaseUrl && config.supabaseKey);
export const hasOpenAI = () => Boolean(config.openaiKey);
export const hasAnthropic = () => Boolean(config.anthropicKey);
