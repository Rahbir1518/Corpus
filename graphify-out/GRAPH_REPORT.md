# Graph Report - Corpus  (2026-07-19)

## Corpus Check
- 89 files · ~46,684 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 573 nodes · 847 edges · 42 communities (27 shown, 15 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `60dea9e7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- dependencies
- index.ts
- graph.ts
- devDependencies
- compilerOptions
- landing-page.tsx
- LocalStore
- compilerOptions
- Corpus v2 — MCP server
- Corpus — Architecture (source of truth)
- Workspace.tsx
- include
- devDependencies
- smoke.ts
- setup.ts
- corpus
- layout.tsx
- README.md
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- graphify.ts
- install.sh script
- corpus
- backup-tmp.mjs
- AGENTS.md
- corpus.md
- CLAUDE.md
- GEMINI.md
- AGENTS.md
- CLAUDE.md
- GEMINI.md
- AGENTS.md
- CLAUDE.md
- GEMINI.md
- corpus
- AGENTS.md
- CLAUDE.md
- DashboardClient.tsx

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `getSupabase()` - 13 edges
3. `compilerOptions` - 11 edges
4. `Corpus — Architecture (source of truth)` - 10 edges
5. `auth0` - 9 edges
6. `readClient()` - 9 edges
7. `DocumentStore` - 9 edges
8. `LocalStore` - 9 edges
9. `SupabaseStore` - 9 edges
10. `DisconnectedStore` - 9 edges

## Surprising Connections (you probably didn't know these)
- `BonsaiTree()` --indirect_call--> `doc()`  [INFERRED]
  frontend/app/projects/[slug]/BonsaiTree.tsx → frontend/app/components/LandingGraph.tsx
- `ConnectionsView()` --calls--> `clusterColor()`  [EXTRACTED]
  frontend/app/(dashboard)/dashboard/DashboardClient.tsx → frontend/app/(dashboard)/dashboard/CorpusGraph.tsx
- `Props` --references--> `WorkspaceWithDocs`  [EXTRACTED]
  frontend/app/(dashboard)/dashboard/CorpusGraph.tsx → frontend/lib/workspaces.ts
- `DashboardClient()` --calls--> `getBrowserSupabase()`  [EXTRACTED]
  frontend/app/(dashboard)/dashboard/DashboardClient.tsx → frontend/lib/supabaseBrowser.ts
- `GET()` --calls--> `getGraph()`  [EXTRACTED]
  frontend/app/api/graph/route.ts → frontend/lib/graph.ts

## Import Cycles
- None detected.

## Communities (42 total, 15 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.05
Nodes (37): bin, corpus-connect, corpus-disconnect, corpus-hook, corpus-ls, corpus-mcp-v2, corpus-setup, corpus-status (+29 more)

### Community 1 - "dependencies"
Cohesion: 0.07
Nodes (27): @auth0/nextjs-auth0, dependencies, @auth0/nextjs-auth0, gsap, next, react, react-dom, react-force-graph-2d (+19 more)

### Community 2 - "index.ts"
Cohesion: 0.14
Nodes (24): appendToSection(), ensureSessionHeading(), getSection(), replaceSection(), SectionName, sectionRange(), SECTIONS, stampUpdated() (+16 more)

### Community 3 - "graph.ts"
Cohesion: 0.11
Nodes (21): GET(), ForceGraph2D, GraphView(), isHot(), Props, truncate(), RecallStat, estTokens() (+13 more)

### Community 4 - "devDependencies"
Cohesion: 0.11
Nodes (19): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+11 more)

### Community 5 - "compilerOptions"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+20 more)

### Community 6 - "landing-page.tsx"
Cohesion: 0.09
Nodes (31): PUT(), GET(), Dashboard(), ProjectsPage(), ProjectPage(), ProjectDocuments(), auth0, DocumentKeying (+23 more)

### Community 7 - "LocalStore"
Cohesion: 0.09
Nodes (4): DisconnectedStore, DocumentStore, LocalStore, SupabaseStore

### Community 8 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, module, moduleResolution, outDir, rootDir, skipLibCheck (+7 more)

### Community 9 - "Corpus v2 — MCP server"
Cohesion: 0.08
Nodes (25): Commands (global, from `npm link`), Corpus v2 — MCP server, Dev, Hooks (installed by `corpus-setup`), Setup, Storage modes, Tools, Try the handoff (no keys, no network) (+17 more)

### Community 10 - "Corpus — Architecture (source of truth)"
Cohesion: 0.12
Nodes (16): codebase_search, Components, Corpus — Architecture (source of truth), corpus_load, corpus_log, corpus_save, Demo script (deterministic — every step user-triggered), Document model (+8 more)

### Community 11 - "Workspace.tsx"
Cohesion: 0.06
Nodes (68): ClientDef, CLIENTS, ClientState, jsonPath(), PatchResult, patchWorkspace(), readAllClients(), readClient() (+60 more)

### Community 12 - "include"
Cohesion: 0.25
Nodes (17): args, checkLogged(), Client, hasGraph(), markDirty(), markLogged(), pretool(), readState() (+9 more)

### Community 13 - "devDependencies"
Cohesion: 0.48
Nodes (6): HookGroup, installEvents(), installHooks(), mergeEvent(), readJson(), writeJson()

### Community 14 - "smoke.ts"
Cohesion: 0.18
Nodes (8): client, dc, dcDir, dcTransport, dir, h, initText, transport

### Community 15 - "setup.ts"
Cohesion: 0.31
Nodes (8): doc(), BonsaiTree(), Doc, Props, Pt, ribbon(), sampleCubic(), truncate()

### Community 16 - "corpus"
Cohesion: 0.29
Nodes (6): cmd, CORPUS_AGENT, CORPUS_PROJECT, CORPUS_WORKSPACE, corpus, corpus-mcp-v2

### Community 17 - "layout.tsx"
Cohesion: 0.40
Nodes (3): instrumentSerif, inter, metadata

### Community 18 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 22 - "graphify.ts"
Cohesion: 0.33
Nodes (5): CORPUS_AGENT, CORPUS_PROJECT, CORPUS_WORKSPACE, corpus-mcp-v2, corpus

### Community 23 - "install.sh script"
Cohesion: 0.70
Nodes (4): install.sh script, fail(), step(), warn()

### Community 24 - "corpus"
Cohesion: 0.40
Nodes (4): CORPUS_AGENT, CORPUS_PROJECT, corpus-mcp-v2, corpus

### Community 26 - "backup-tmp.mjs"
Cohesion: 0.50
Nodes (3): db, dump, env

### Community 38 - "corpus"
Cohesion: 0.40
Nodes (4): node, CORPUS_AGENT, CORPUS_PROJECT, corpus

### Community 42 - "DashboardClient.tsx"
Cohesion: 0.07
Nodes (31): Line, SCRIPT, DEMO, LandingGraph(), Shooter, Star, Starfield(), CGLink (+23 more)

## Knowledge Gaps
- **247 isolated node(s):** `cmd`, `corpus-mcp-v2`, `CORPUS_PROJECT`, `CORPUS_AGENT`, `CORPUS_WORKSPACE` (+242 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `wireRepo()` connect `Workspace.tsx` to `index.ts`, `devDependencies`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `getSupabase()` connect `landing-page.tsx` to `graph.ts`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `DisconnectedStore` connect `LocalStore` to `Workspace.tsx`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `cmd`, `corpus-mcp-v2`, `CORPUS_PROJECT` to the rest of the system?**
  _247 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.135632183908046 - nodes in this community are weakly interconnected._