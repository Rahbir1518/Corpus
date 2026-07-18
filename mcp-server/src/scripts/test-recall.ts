import { config } from "../config.js";
import { recall } from "../recall.js";

// Usage: npm run recall -- "fix the stripe webhook"
const query = process.argv.slice(2).join(" ") || "fix the stripe webhook 401";

const r = await recall(config.workspace, query);
console.log(`\nQUERY: ${query}\n`);
console.log(r.markdown);
console.log(`\nnodes: ${r.nodeIds.length} [${r.nodeIds.join(", ")}]`);
console.log(`tokens: ${r.recallTokens} recalled vs ${r.fullTokens} full corpus`);
const saved = Math.round((1 - r.recallTokens / r.fullTokens) * 1000) / 10;
console.log(`saved: ${saved}%`);
