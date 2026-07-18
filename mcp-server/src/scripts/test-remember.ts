import { config } from "../config.js";
import { remember } from "../remember.js";

// Usage: npm run remember  (uses a canned session)  OR  npm run remember -- "some text"
const sample =
  process.argv.slice(2).join(" ") ||
  `We spent the session on rate limiting. Decided to use a Redis token-bucket per API key
because it survives multiple serverless instances (in-memory wouldn't). Hit a bug: the
limiter counted preflight OPTIONS requests, so browsers got throttled — need to skip OPTIONS.
Touched middleware.ts. User prefers we log rate-limit hits to Datadog, not console.
Open task: decide per-plan limits (free vs pro).`;

const r = await remember(config.workspace, sample, "Rate limiting");
console.log(r.preview);
console.log(`\nsession: ${r.sessionId}`);
console.log(`nodes: ${r.nodeIds.length}, edges: ${r.edgeCount}`);
console.log(`compressed: ${r.rawTokens} → ${r.engramTokens} tokens`);
