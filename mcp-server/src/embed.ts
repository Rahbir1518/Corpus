import OpenAI from "openai";
import { config, hasOpenAI } from "./config.js";

let client: OpenAI | null = null;
function openai(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: config.openaiKey });
  return client;
}

// Embed a single string. Returns null when OpenAI isn't configured, so callers
// can fall back to keyword retrieval.
export async function embed(text: string): Promise<number[] | null> {
  if (!hasOpenAI()) return null;
  const res = await openai().embeddings.create({
    model: config.embeddingModel,
    input: text,
  });
  return res.data[0].embedding;
}

// Embed many strings in one request (used when writing nodes).
export async function embedBatch(texts: string[]): Promise<(number[] | null)[]> {
  if (!hasOpenAI() || texts.length === 0) return texts.map(() => null);
  const res = await openai().embeddings.create({
    model: config.embeddingModel,
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}
