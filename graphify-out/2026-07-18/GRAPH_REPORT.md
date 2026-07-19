# Graph Report - Corpus  (2026-07-18)

## Corpus Check
- 70 files · ~30,484 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 447 nodes · 567 edges · 38 communities (24 shown, 14 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cf313e51`
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

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `compilerOptions` - 11 edges
3. `Corpus — Architecture (source of truth)` - 10 edges
4. `readClient()` - 9 edges
5. `DocumentStore` - 9 edges
6. `LocalStore` - 9 edges
7. `SupabaseStore` - 9 edges
8. `DisconnectedStore` - 9 edges
9. `bin` - 8 edges
10. `Requirements & setup` - 8 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `getGraph()`  [EXTRACTED]
  frontend/app/api/graph/route.ts → frontend/lib/graph.ts
- `Props` --references--> `Graph`  [EXTRACTED]
  frontend/app/workflow/GraphView.tsx → frontend/lib/graph.ts
- `Workspace()` --calls--> `useRealtimeCorpus()`  [EXTRACTED]
  frontend/app/workflow/Workspace.tsx → frontend/lib/useRealtimeCorpus.ts
- `getGraph()` --calls--> `getSupabase()`  [EXTRACTED]
  frontend/lib/graph.ts → frontend/lib/supabase.ts
- `useRealtimeCorpus()` --calls--> `getBrowserSupabase()`  [EXTRACTED]
  frontend/lib/useRealtimeCorpus.ts → frontend/lib/supabaseBrowser.ts

## Import Cycles
- None detected.

## Communities (38 total, 14 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.05
Nodes (37): bin, corpus-connect, corpus-disconnect, corpus-hook, corpus-ls, corpus-mcp-v2, corpus-setup, corpus-status (+29 more)

### Community 1 - "dependencies"
Cohesion: 0.08
Nodes (23): @auth0/nextjs-auth0, dependencies, @auth0/nextjs-auth0, gsap, next, react, react-dom, react-force-graph-2d (+15 more)

### Community 2 - "index.ts"
Cohesion: 0.14
Nodes (24): appendToSection(), ensureSessionHeading(), getSection(), replaceSection(), SectionName, sectionRange(), SECTIONS, stampUpdated() (+16 more)

### Community 3 - "graph.ts"
Cohesion: 0.10
Nodes (23): GET(), ForceGraph2D, GraphView(), isHot(), Props, truncate(), RecallStat, estTokens() (+15 more)

### Community 4 - "devDependencies"
Cohesion: 0.11
Nodes (19): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+11 more)

### Community 5 - "compilerOptions"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+20 more)

### Community 6 - "landing-page.tsx"
Cohesion: 0.14
Nodes (4): Line, SCRIPT, auth0, config

### Community 7 - "LocalStore"
Cohesion: 0.12
Nodes (3): DocumentStore, LocalStore, SupabaseStore

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
Cohesion: 0.19
Nodes (16): clients, graph, ids, localDir, project, target, createStore(), isWorkspaceId() (+8 more)

### Community 13 - "devDependencies"
Cohesion: 0.48
Nodes (6): HookGroup, installEvents(), installHooks(), mergeEvent(), readJson(), writeJson()

### Community 14 - "smoke.ts"
Cohesion: 0.18
Nodes (8): client, dc, dcDir, dcTransport, dir, h, initText, transport

### Community 15 - "setup.ts"
Cohesion: 0.07
Nodes (45): ClientDef, CLIENTS, ClientState, jsonPath(), PatchResult, patchWorkspace(), readAllClients(), readClient() (+37 more)

### Community 16 - "corpus"
Cohesion: 0.33
Nodes (5): CORPUS_AGENT, CORPUS_PROJECT, CORPUS_WORKSPACE, corpus-mcp-v2, corpus

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

## Knowledge Gaps
- **215 isolated node(s):** `corpus-mcp-v2`, `CORPUS_PROJECT`, `CORPUS_AGENT`, `CORPUS_WORKSPACE`, `Line` (+210 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `wireRepo()` connect `setup.ts` to `index.ts`, `devDependencies`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `DisconnectedStore` connect `include` to `Workspace.tsx`, `LocalStore`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `LocalStore` connect `LocalStore` to `Workspace.tsx`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `corpus-mcp-v2`, `CORPUS_PROJECT`, `CORPUS_AGENT` to the rest of the system?**
  _215 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.135632183908046 - nodes in this community are weakly interconnected._