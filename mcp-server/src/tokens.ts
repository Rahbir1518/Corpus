import { CorpusNode } from "./types.js";

// Lightweight token estimate (~4 chars/token). Good enough for the savings
// counter, which is about the ratio (full corpus vs recalled slice), and avoids
// a native tokenizer dependency.
export function countTokens(text: string): number {
  return Math.max(1, Math.round(text.length / 4));
}

export function nodeText(n: CorpusNode): string {
  return `${n.title}\n${n.body}`;
}

// Tokens it would cost to paste the ENTIRE corpus into context.
export function fullCorpusTokens(nodes: CorpusNode[]): number {
  return nodes.reduce((sum, n) => sum + countTokens(nodeText(n)), 0);
}
