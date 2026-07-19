# Graph Report - Corpus  (2026-07-19)

## Corpus Check
- 84 files · ~46,335 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 574 nodes · 817 edges · 43 communities (27 shown, 16 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `341574b6`
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
- install.ps1
- backup-tmp.mjs
- AGENTS.md
- corpus.md
- CLAUDE.md
- GEMINI.md
- AGENTS.md
- CLAUDE.md
- AGENTS.md
- CLAUDE.md
- GEMINI.md
- AGENTS.md
- CLAUDE.md
- GEMINI.md
- AGENTS.md
- CLAUDE.md

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `SupabaseStore` - 12 edges
3. `compilerOptions` - 11 edges
4. `DocumentStore` - 10 edges
5. `LocalStore` - 10 edges
6. `DisconnectedStore` - 10 edges
7. `Corpus — Architecture (source of truth)` - 10 edges
8. `bin` - 9 edges
9. `readClient()` - 9 edges
10. `wireRepo()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `getGraph()`  [EXTRACTED]
  frontend/app/api/graph/route.ts → frontend/lib/graph.ts
- `getGraph()` --calls--> `getSupabase()`  [EXTRACTED]
  frontend/lib/graph.ts → frontend/lib/supabase.ts
- `resolveProject()` --calls--> `readClient()`  [EXTRACTED]
  mcp-server-2/src/hooks.ts → mcp-server-2/src/clients.ts
- `wireRepo()` --calls--> `registerClient()`  [EXTRACTED]
  mcp-server-2/src/wire.ts → mcp-server-2/src/clients.ts
- `fixture()` --calls--> `wireRepo()`  [EXTRACTED]
  mcp-server-2/src/scripts/smoke-uninstall.ts → mcp-server-2/src/wire.ts

## Import Cycles
- None detected.

## Communities (43 total, 16 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.05
Nodes (41): bin, corpus-connect, corpus-disconnect, corpus-hook, corpus-ls, corpus-mcp-v2, corpus-setup, corpus-status (+33 more)

### Community 1 - "dependencies"
Cohesion: 0.07
Nodes (27): @auth0/nextjs-auth0, dependencies, @auth0/nextjs-auth0, gsap, next, react, react-dom, react-force-graph-2d (+19 more)

### Community 2 - "index.ts"
Cohesion: 0.14
Nodes (25): appendToSection(), ensureSessionHeading(), getSection(), replaceSection(), SectionName, sectionRange(), SECTIONS, stampUpdated() (+17 more)

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
Cohesion: 0.07
Nodes (25): Line, SCRIPT, Shooter, Star, Starfield(), ProjectsPage(), BonsaiTree(), Doc (+17 more)

### Community 7 - "LocalStore"
Cohesion: 0.10
Nodes (3): DisconnectedStore, DocumentStore, LocalStore

### Community 8 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, module, moduleResolution, outDir, rootDir, skipLibCheck (+7 more)

### Community 9 - "Corpus v2 — MCP server"
Cohesion: 0.09
Nodes (20): Commands (global, from `npm link`), Corpus v2 — MCP server, Dev, Hooks (installed by `corpus-setup`), Setup, Storage modes, Tools, Try the handoff (no keys, no network) (+12 more)

### Community 10 - "Corpus — Architecture (source of truth)"
Cohesion: 0.09
Nodes (21): codebase_search, Components, Corpus — Architecture (source of truth), corpus_load, corpus_log, corpus_save, Demo script (deterministic — every step user-triggered), Document model (+13 more)

### Community 11 - "Workspace.tsx"
Cohesion: 0.20
Nodes (15): clients, graph, ids, localDir, project, target, createStore(), isWorkspaceId() (+7 more)

### Community 12 - "include"
Cohesion: 0.25
Nodes (17): args, checkLogged(), Client, hasGraph(), markDirty(), markLogged(), pretool(), readState() (+9 more)

### Community 13 - "devDependencies"
Cohesion: 0.09
Nodes (25): findCorpusHooks(), HOOK_FILES, HookGroup, installEvents(), installHooks(), mergeEvent(), readJson(), uninstallFrom() (+17 more)

### Community 14 - "smoke.ts"
Cohesion: 0.18
Nodes (8): client, dc, dcDir, dcTransport, dir, h, initText, transport

### Community 15 - "setup.ts"
Cohesion: 0.05
Nodes (70): ClientDef, CLIENTS, ClientState, jsonPath(), PatchResult, patchWorkspace(), readAllClients(), readClient() (+62 more)

### Community 16 - "corpus"
Cohesion: 0.29
Nodes (6): cmd, CORPUS_AGENT, CORPUS_PROJECT, CORPUS_WORKSPACE, corpus, corpus-mcp-v2

### Community 17 - "layout.tsx"
Cohesion: 0.40
Nodes (3): instrumentSerif, inter, metadata

### Community 22 - "graphify.ts"
Cohesion: 0.33
Nodes (5): corpus, CORPUS_AGENT, CORPUS_PROJECT, CORPUS_WORKSPACE, corpus-mcp-v2

### Community 23 - "install.sh script"
Cohesion: 0.53
Nodes (5): Req, run(), server(), step(), text()

### Community 24 - "corpus"
Cohesion: 0.40
Nodes (4): corpus, CORPUS_AGENT, CORPUS_PROJECT, corpus-mcp-v2

### Community 25 - "install.ps1"
Cohesion: 0.70
Nodes (4): install.sh script, fail(), step(), warn()

### Community 26 - "backup-tmp.mjs"
Cohesion: 0.50
Nodes (3): db, dump, env

### Community 31 - "AGENTS.md"
Cohesion: 0.40
Nodes (4): node, CORPUS_AGENT, CORPUS_PROJECT, corpus

### Community 32 - "CLAUDE.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

## Knowledge Gaps
- **268 isolated node(s):** `cmd`, `corpus-mcp-v2`, `CORPUS_PROJECT`, `CORPUS_AGENT`, `CORPUS_WORKSPACE` (+263 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `wireRepo()` connect `devDependencies` to `index.ts`, `setup.ts`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `SupabaseStore` connect `README.md` to `Workspace.tsx`, `LocalStore`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `DisconnectedStore` connect `LocalStore` to `Workspace.tsx`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `cmd`, `corpus-mcp-v2`, `CORPUS_PROJECT` to the rest of the system?**
  _268 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.047619047619047616 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.135632183908046 - nodes in this community are weakly interconnected._