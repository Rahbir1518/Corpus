# Graph Report - mcp-server-2  (2026-07-18)

## Corpus Check
- 20 files · ~9,107 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 169 nodes · 226 edges · 15 communities (11 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `51207698`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.ts
- package.json
- store.ts
- status.ts
- clients.ts
- compilerOptions
- dependencies
- devDependencies
- Corpus v2 — MCP server
- smoke.ts
- LocalStore
- corpus
- AGENTS.md
- CLAUDE.md
- GEMINI.md

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 11 edges
2. `LocalStore` - 8 edges
3. `readClient()` - 7 edges
4. `patchWorkspace()` - 7 edges
5. `DocumentStore` - 7 edges
6. `SupabaseStore` - 7 edges
7. `bin` - 6 edges
8. `queryGraph()` - 6 edges
9. `Corpus v2 — MCP server` - 6 edges
10. `scripts` - 5 edges

## Surprising Connections (you probably didn't know these)
- `getOrCreateState()` --calls--> `stateTemplate()`  [EXTRACTED]
  src/index.ts → src/document.ts

## Import Cycles
- None detected.

## Communities (15 total, 4 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.15
Nodes (21): appendToSection(), ensureSessionHeading(), getSection(), replaceSection(), SectionName, sectionRange(), SECTIONS, stampUpdated() (+13 more)

### Community 1 - "package.json"
Cohesion: 0.09
Nodes (21): bin, corpus-connect, corpus-disconnect, corpus-mcp-v2, corpus-setup, corpus-status, description, engines (+13 more)

### Community 2 - "store.ts"
Cohesion: 0.12
Nodes (9): before, connected, results, target, createStore(), DocumentStore, resolveProject(), resolveWorkspace() (+1 more)

### Community 3 - "status.ts"
Cohesion: 0.17
Nodes (16): results, target, wired, clients, graph, ids, localDir, project (+8 more)

### Community 4 - "clients.ts"
Cohesion: 0.20
Nodes (15): ClientDef, CLIENTS, ClientState, jsonPath(), PatchResult, patchWorkspace(), readAllClients(), readClient() (+7 more)

### Community 5 - "compilerOptions"
Cohesion: 0.12
Nodes (15): src/scripts/**, src/**/*.ts, compilerOptions, declaration, esModuleInterop, module, moduleResolution, outDir (+7 more)

### Community 6 - "dependencies"
Cohesion: 0.29
Nodes (7): @modelcontextprotocol/sdk, dependencies, @modelcontextprotocol/sdk, @supabase/supabase-js, zod, @supabase/supabase-js, zod

### Community 7 - "devDependencies"
Cohesion: 0.29
Nodes (7): devDependencies, tsx, @types/node, typescript, tsx, @types/node, typescript

### Community 8 - "Corpus v2 — MCP server"
Cohesion: 0.29
Nodes (6): Corpus v2 — MCP server, Dev, Setup (per project, one time), Storage modes, Tools, Try the handoff (no keys, no network)

### Community 9 - "smoke.ts"
Cohesion: 0.29
Nodes (4): client, dir, h, transport

### Community 11 - "corpus"
Cohesion: 0.40
Nodes (4): CORPUS_AGENT, CORPUS_PROJECT, corpus-mcp-v2, corpus

## Knowledge Gaps
- **80 isolated node(s):** `corpus-mcp-v2`, `CORPUS_PROJECT`, `CORPUS_AGENT`, `name`, `version` (+75 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LocalStore` connect `LocalStore` to `store.ts`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `DocumentStore` connect `store.ts` to `LocalStore`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `corpus-mcp-v2`, `CORPUS_PROJECT`, `CORPUS_AGENT` to the rest of the system?**
  _80 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11578947368421053 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._