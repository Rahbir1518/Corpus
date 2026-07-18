# Graph Report - Corpus  (2026-07-18)

## Corpus Check
- 37 files · ~11,602 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 270 nodes · 301 edges · 22 communities (19 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d4cb7069`
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

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `compilerOptions` - 11 edges
3. `Corpus — Architecture (source of truth)` - 9 edges
4. `include` - 7 edges
5. `LocalStore` - 7 edges
6. `DocumentStore` - 6 edges
7. `SupabaseStore` - 6 edges
8. `Corpus v2 — MCP server` - 6 edges
9. `auth0` - 5 edges
10. `getGraph()` - 5 edges

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

## Communities (22 total, 3 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.08
Nodes (25): bin, corpus-mcp-v2, corpus-setup, dependencies, @modelcontextprotocol/sdk, @supabase/supabase-js, zod, description (+17 more)

### Community 1 - "dependencies"
Cohesion: 0.08
Nodes (23): @auth0/nextjs-auth0, dependencies, @auth0/nextjs-auth0, gsap, next, react, react-dom, react-force-graph-2d (+15 more)

### Community 2 - "index.ts"
Cohesion: 0.17
Nodes (17): appendToSection(), ensureSessionHeading(), getSection(), replaceSection(), SectionName, sectionRange(), SECTIONS, stampUpdated() (+9 more)

### Community 3 - "graph.ts"
Cohesion: 0.16
Nodes (16): GET(), ForceGraph2D, GraphView(), isHot(), Props, truncate(), getGraph(), Graph (+8 more)

### Community 4 - "devDependencies"
Cohesion: 0.11
Nodes (19): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+11 more)

### Community 5 - "compilerOptions"
Cohesion: 0.11
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 6 - "landing-page.tsx"
Cohesion: 0.14
Nodes (4): Line, SCRIPT, auth0, config

### Community 7 - "LocalStore"
Cohesion: 0.14
Nodes (5): createStore(), DocumentStore, LocalStore, resolveProject(), SupabaseStore

### Community 8 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, module, moduleResolution, outDir, rootDir, skipLibCheck (+7 more)

### Community 9 - "Corpus v2 — MCP server"
Cohesion: 0.15
Nodes (11): Corpus v2 — MCP server, Dev, Setup (per project, one time), Storage modes, Tools, Try the handoff (no keys, no network), Corpus, Demo script (5 min) (+3 more)

### Community 10 - "Corpus — Architecture (source of truth)"
Cohesion: 0.15
Nodes (13): Components, Corpus — Architecture (source of truth), corpus_code_query, corpus_load, corpus_log, corpus_save, Demo script (deterministic — every step user-triggered), Document model (+5 more)

### Community 11 - "Workspace.tsx"
Cohesion: 0.26
Nodes (7): RecallStat, estTokens(), Workspace(), getBrowserSupabase(), Handlers, RecallEvent, useRealtimeCorpus()

### Community 12 - "include"
Cohesion: 0.20
Nodes (9): exclude, include, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts (+1 more)

### Community 13 - "devDependencies"
Cohesion: 0.29
Nodes (7): devDependencies, tsx, @types/node, typescript, @types/node, typescript, tsx

### Community 14 - "smoke.ts"
Cohesion: 0.29
Nodes (4): client, dir, h, transport

### Community 15 - "setup.ts"
Cohesion: 0.33
Nodes (4): mcpConfig, mcpPath, serverPath, target

### Community 16 - "corpus"
Cohesion: 0.40
Nodes (4): CORPUS_AGENT, CORPUS_PROJECT, node, corpus

### Community 17 - "layout.tsx"
Cohesion: 0.40
Nodes (3): instrumentSerif, inter, metadata

### Community 18 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

## Knowledge Gaps
- **135 isolated node(s):** `node`, `CORPUS_PROJECT`, `CORPUS_AGENT`, `Line`, `SCRIPT` (+130 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `dependencies`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `compilerOptions` connect `compilerOptions` to `include`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `node`, `CORPUS_PROJECT`, `CORPUS_AGENT` to the rest of the system?**
  _135 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._