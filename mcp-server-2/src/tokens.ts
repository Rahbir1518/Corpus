/**
 * Token estimation. chars/4 is a deliberate, clearly-labelled estimate — good enough
 * for the savings footer. Real demo numbers come from actual transcript totals
 * (see ARCHITECTURE.md "Token accounting").
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
