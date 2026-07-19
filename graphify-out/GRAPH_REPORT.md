# Graph Report - Corpus  (2026-07-19)

## Corpus Check
- 94 files · ~55,671 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 655 nodes · 973 edges · 52 communities (35 shown, 17 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `23a01cd2`
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
- GEMINI.md
- AGENTS.md
- CLAUDE.md
- AGENTS.md
- GEMINI.md
- AGENTS.md
- CLAUDE.md
- clients.ts
- uninstall.ts
- ls.ts
- README.md
- AGENTS.md
- CLAUDE.md
- GEMINI.md
- AGENTS.md
- CLAUDE.md
- GEMINI.md

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `getSupabase()` - 13 edges
3. `SupabaseStore` - 12 edges
4. `compilerOptions` - 11 edges
5. `DocumentStore` - 10 edges
6. `LocalStore` - 10 edges
7. `DisconnectedStore` - 10 edges
8. `Corpus — Architecture (source of truth)` - 10 edges
9. `auth0` - 9 edges
10. `bin` - 9 edges

## Surprising Connections (you probably didn't know these)
- `BonsaiTree()` --indirect_call--> `doc()`  [INFERRED]
  frontend/app/projects/[slug]/BonsaiTree.tsx → frontend/app/components/LandingGraph.tsx
- `ConnectionsView()` --calls--> `clusterColor()`  [EXTRACTED]
  frontend/app/(dashboard)/dashboard/DashboardClient.tsx → frontend/app/(dashboard)/dashboard/CorpusGraph.tsx
- `Props` --references--> `WorkspaceWithDocs`  [EXTRACTED]
  frontend/app/(dashboard)/dashboard/CorpusGraph.tsx → frontend/lib/workspaces.ts
- `GET()` --calls--> `getGraph()`  [EXTRACTED]
  frontend/app/api/graph/route.ts → frontend/lib/graph.ts
- `GET()` --calls--> `getWorkspacesForUser()`  [EXTRACTED]
  frontend/app/api/workspaces/route.ts → frontend/lib/workspaces.ts

## Import Cycles
- None detected.

## Communities (52 total, 17 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.05
Nodes (41): bin, corpus-connect, corpus-disconnect, corpus-hook, corpus-ls, corpus-mcp-v2, corpus-setup, corpus-status (+33 more)

### Community 1 - "dependencies"
Cohesion: 0.07
Nodes (27): @auth0/nextjs-auth0, dependencies, @auth0/nextjs-auth0, gsap, next, react, react-dom, react-force-graph-2d (+19 more)

### Community 2 - "index.ts"
Cohesion: 0.14
Nodes (24): appendToSection(), ensureSessionHeading(), getSection(), replaceSection(), SectionName, sectionRange(), SECTIONS, stampUpdated() (+16 more)

### Community 3 - "graph.ts"
Cohesion: 0.12
Nodes (20): GET(), ForceGraph2D, GraphView(), isHot(), Props, truncate(), RecallStat, estTokens() (+12 more)

### Community 4 - "devDependencies"
Cohesion: 0.11
Nodes (19): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+11 more)

### Community 5 - "compilerOptions"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+20 more)

### Community 6 - "landing-page.tsx"
Cohesion: 0.12
Nodes (20): PUT(), ProjectsPage(), ProjectPage(), ProjectDocuments(), auth0, DocumentKeying, DocumentRow, documentsKeying() (+12 more)

### Community 7 - "LocalStore"
Cohesion: 0.10
Nodes (3): DisconnectedStore, DocumentStore, LocalStore

### Community 8 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, module, moduleResolution, outDir, rootDir, skipLibCheck (+7 more)

### Community 9 - "Corpus v2 — MCP server"
Cohesion: 0.06
Nodes (30): Commands (global, from `npm link`), Corpus v2 — MCP server, Dev, Hooks (installed by `corpus-setup`), Setup, Storage modes, Tools, Try the handoff (no keys, no network) (+22 more)

### Community 10 - "Corpus — Architecture (source of truth)"
Cohesion: 0.12
Nodes (16): codebase_search, Components, Corpus — Architecture (source of truth), corpus_load, corpus_log, corpus_save, Demo script (deterministic — every step user-triggered), Document model (+8 more)

### Community 11 - "Workspace.tsx"
Cohesion: 0.19
Nodes (16): clients, graph, ids, localDir, project, target, createStore(), isWorkspaceId() (+8 more)

### Community 12 - "include"
Cohesion: 0.25
Nodes (17): args, checkLogged(), Client, hasGraph(), markDirty(), markLogged(), pretool(), readState() (+9 more)

### Community 13 - "devDependencies"
Cohesion: 0.09
Nodes (22): findCorpusHooks(), HOOK_FILES, HookGroup, installEvents(), installHooks(), mergeEvent(), readJson(), uninstallFrom() (+14 more)

### Community 14 - "smoke.ts"
Cohesion: 0.18
Nodes (8): client, dc, dcDir, dcTransport, dir, h, initText, transport

### Community 15 - "setup.ts"
Cohesion: 0.12
Nodes (26): bad(), blue, bold, cmd(), cyan, dim, green, heading() (+18 more)

### Community 16 - "corpus"
Cohesion: 0.29
Nodes (6): cmd, CORPUS_AGENT, CORPUS_PROJECT, CORPUS_WORKSPACE, corpus, corpus-mcp-v2

### Community 17 - "layout.tsx"
Cohesion: 0.40
Nodes (3): instrumentSerif, inter, metadata

### Community 22 - "graphify.ts"
Cohesion: 0.33
Nodes (5): CORPUS_AGENT, CORPUS_PROJECT, CORPUS_WORKSPACE, corpus-mcp-v2, corpus

### Community 23 - "install.sh script"
Cohesion: 0.53
Nodes (5): Req, run(), server(), step(), text()

### Community 24 - "corpus"
Cohesion: 0.40
Nodes (4): CORPUS_AGENT, CORPUS_PROJECT, corpus-mcp-v2, corpus

### Community 25 - "install.ps1"
Cohesion: 0.05
Nodes (43): GET(), Line, SCRIPT, DEMO, LandingGraph(), Shooter, Star, Starfield() (+35 more)

### Community 26 - "backup-tmp.mjs"
Cohesion: 0.50
Nodes (3): db, dump, env

### Community 31 - "AGENTS.md"
Cohesion: 0.40
Nodes (4): node, CORPUS_AGENT, CORPUS_PROJECT, corpus

### Community 32 - "CLAUDE.md"
Cohesion: 0.52
Nodes (6): documents, project_overview, usage_events, usage_stats, workspace_members, workspaces

### Community 33 - "GEMINI.md"
Cohesion: 0.31
Nodes (8): doc(), BonsaiTree(), Doc, Props, Pt, ribbon(), sampleCubic(), truncate()

### Community 34 - "AGENTS.md"
Cohesion: 0.67
Nodes (3): doc_plan, documents, workspaces

### Community 38 - "AGENTS.md"
Cohesion: 0.70
Nodes (4): install.sh script, fail(), step(), warn()

### Community 40 - "GEMINI.md"
Cohesion: 0.50
Nodes (3): Corpus technology use graph, Primary technology inventory, Trust boundaries

### Community 43 - "clients.ts"
Cohesion: 0.20
Nodes (18): ClientDef, CLIENTS, ClientState, jsonPath(), PatchResult, patchWorkspace(), readAllClients(), readClient() (+10 more)

### Community 44 - "uninstall.ts"
Cohesion: 0.11
Nodes (16): alsoForget, alsoGraph, alsoMemory, argv, dryRun, forgotten, graphDir, hooksPresent (+8 more)

### Community 45 - "ls.ts"
Cohesion: 0.18
Nodes (13): all, hereIds, known, online, target, unlisted, FILE, forgetRepo() (+5 more)

### Community 47 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

## Knowledge Gaps
- **288 isolated node(s):** `cmd`, `corpus-mcp-v2`, `CORPUS_PROJECT`, `CORPUS_AGENT`, `CORPUS_WORKSPACE` (+283 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `wireRepo()` connect `clients.ts` to `index.ts`, `devDependencies`, `setup.ts`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `SupabaseStore` connect `README.md` to `Workspace.tsx`, `LocalStore`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `getSupabase()` connect `landing-page.tsx` to `install.ps1`, `graph.ts`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `cmd`, `corpus-mcp-v2`, `CORPUS_PROJECT` to the rest of the system?**
  _288 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.047619047619047616 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.135632183908046 - nodes in this community are weakly interconnected._