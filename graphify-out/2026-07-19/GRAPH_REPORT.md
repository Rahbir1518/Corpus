# Graph Report - Corpus  (2026-07-19)

## Corpus Check
- 95 files · ~55,677 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 641 nodes · 955 edges · 55 communities (39 shown, 16 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `82eae3ca`
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
- GEMINI.md
- AGENTS.md
- GEMINI.md
- AGENTS.md
- CLAUDE.md
- clients.ts
- uninstall.ts
- ls.ts
- hookwire.ts
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
- `fixture()` --calls--> `wireRepo()`  [EXTRACTED]
  mcp-server-2/src/scripts/smoke-uninstall.ts → mcp-server-2/src/wire.ts
- `ConnectionsView()` --calls--> `clusterColor()`  [EXTRACTED]
  frontend/app/(dashboard)/dashboard/DashboardClient.tsx → frontend/app/(dashboard)/dashboard/CorpusGraph.tsx
- `Props` --references--> `WorkspaceWithDocs`  [EXTRACTED]
  frontend/app/(dashboard)/dashboard/CorpusGraph.tsx → frontend/lib/workspaces.ts
- `DashboardClient()` --calls--> `getBrowserSupabase()`  [EXTRACTED]
  frontend/app/(dashboard)/dashboard/DashboardClient.tsx → frontend/lib/supabaseBrowser.ts

## Import Cycles
- None detected.

## Communities (55 total, 16 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.05
Nodes (41): bin, corpus-connect, corpus-disconnect, corpus-hook, corpus-ls, corpus-mcp-v2, corpus-setup, corpus-status (+33 more)

### Community 1 - "dependencies"
Cohesion: 0.11
Nodes (19): @auth0/nextjs-auth0, dependencies, @auth0/nextjs-auth0, gsap, next, react, react-dom, react-force-graph-2d (+11 more)

### Community 2 - "index.ts"
Cohesion: 0.12
Nodes (27): appendToSection(), ensureSessionHeading(), getSection(), replaceSection(), SectionName, sectionRange(), SECTIONS, stampUpdated() (+19 more)

### Community 3 - "graph.ts"
Cohesion: 0.11
Nodes (21): GET(), ForceGraph2D, GraphView(), isHot(), Props, truncate(), RecallStat, estTokens() (+13 more)

### Community 4 - "devDependencies"
Cohesion: 0.07
Nodes (27): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+19 more)

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
Cohesion: 0.17
Nodes (12): Dashboard, Dashboard (optional), Environment variables, Graphify (optional), MCP server, MCP server, Prerequisites, Requirements and setup (+4 more)

### Community 10 - "Corpus — Architecture (source of truth)"
Cohesion: 0.18
Nodes (11): Components, Corpus — Architecture (source of truth), Demo script (deterministic — every step user-triggered), Document model, Non-negotiable design rules, Phases, Sharing & access, The connect verbs (+3 more)

### Community 11 - "Workspace.tsx"
Cohesion: 0.22
Nodes (13): clients, graph, ids, localDir, project, target, isWorkspaceId(), client() (+5 more)

### Community 12 - "include"
Cohesion: 0.25
Nodes (17): args, checkLogged(), Client, hasGraph(), markDirty(), markLogged(), pretool(), readState() (+9 more)

### Community 13 - "devDependencies"
Cohesion: 0.12
Nodes (13): again, before, bogus, claude, dry, fixture(), hookJson, localMemory (+5 more)

### Community 14 - "smoke.ts"
Cohesion: 0.18
Nodes (8): client, dc, dcDir, dcTransport, dir, h, initText, transport

### Community 15 - "setup.ts"
Cohesion: 0.13
Nodes (23): bad(), blue, bold, cmd(), cyan, dim, green, heading() (+15 more)

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
Cohesion: 0.06
Nodes (42): GET(), Line, SCRIPT, DEMO, LandingGraph(), Shooter, Star, Starfield() (+34 more)

### Community 26 - "backup-tmp.mjs"
Cohesion: 0.50
Nodes (3): db, dump, env

### Community 31 - "AGENTS.md"
Cohesion: 0.40
Nodes (4): node, CORPUS_AGENT, CORPUS_PROJECT, corpus

### Community 32 - "CLAUDE.md"
Cohesion: 0.20
Nodes (10): Corpus, Dashboard, Install, Optional features, Repository layout, Shared team memory, Structural code search, Use (+2 more)

### Community 33 - "GEMINI.md"
Cohesion: 0.31
Nodes (8): doc(), BonsaiTree(), Doc, Props, Pt, ribbon(), sampleCubic(), truncate()

### Community 34 - "AGENTS.md"
Cohesion: 0.31
Nodes (7): CLIENTS, project, target, installBlock(), INSTRUCTION_FILES, wireRepo(), supabaseConfigured()

### Community 35 - "CLAUDE.md"
Cohesion: 0.25
Nodes (8): Commands (global, from `npm link`), Corpus v2 — MCP server, Dev, Hooks (installed by `corpus-setup`), Setup, Storage modes, Tools, Try the handoff (no keys, no network)

### Community 36 - "GEMINI.md"
Cohesion: 0.40
Nodes (5): codebase_search, corpus_load, corpus_log, corpus_save, Tool contracts

### Community 38 - "AGENTS.md"
Cohesion: 0.70
Nodes (4): install.sh script, fail(), step(), warn()

### Community 40 - "GEMINI.md"
Cohesion: 0.50
Nodes (3): Corpus technology use graph, Primary technology inventory, Trust boundaries

### Community 43 - "clients.ts"
Cohesion: 0.31
Nodes (13): ClientDef, ClientState, jsonPath(), PatchResult, patchWorkspace(), readAllClients(), readClient(), readJson() (+5 more)

### Community 44 - "uninstall.ts"
Cohesion: 0.11
Nodes (16): alsoForget, alsoGraph, alsoMemory, argv, dryRun, forgotten, graphDir, hooksPresent (+8 more)

### Community 45 - "ls.ts"
Cohesion: 0.18
Nodes (13): all, hereIds, known, online, target, unlisted, FILE, forgetRepo() (+5 more)

### Community 46 - "hookwire.ts"
Cohesion: 0.33
Nodes (10): findCorpusHooks(), HOOK_FILES, HookGroup, installEvents(), installHooks(), mergeEvent(), readJson(), uninstallFrom() (+2 more)

### Community 47 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

## Knowledge Gaps
- **287 isolated node(s):** `cmd`, `corpus-mcp-v2`, `CORPUS_PROJECT`, `CORPUS_AGENT`, `CORPUS_WORKSPACE` (+282 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `wireRepo()` connect `AGENTS.md` to `index.ts`, `clients.ts`, `devDependencies`, `hookwire.ts`, `setup.ts`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `SupabaseStore` connect `README.md` to `index.ts`, `LocalStore`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `getSupabase()` connect `landing-page.tsx` to `install.ps1`, `graph.ts`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `cmd`, `corpus-mcp-v2`, `CORPUS_PROJECT` to the rest of the system?**
  _287 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.047619047619047616 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12121212121212122 - nodes in this community are weakly interconnected._