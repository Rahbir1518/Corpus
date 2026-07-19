# Graph Report - mcp-server-2  (2026-07-18)

## Corpus Check
- 24 files · ~12,368 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 203 nodes · 288 edges · 18 communities (12 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d10b22aa`
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
- ls.ts
- DisconnectedStore
- backup-tmp.mjs

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 11 edges
2. `DocumentStore` - 8 edges
3. `LocalStore` - 8 edges
4. `SupabaseStore` - 8 edges
5. `DisconnectedStore` - 8 edges
6. `bin` - 7 edges
7. `readClient()` - 7 edges
8. `patchWorkspace()` - 7 edges
9. `Corpus v2 — MCP server` - 7 edges
10. `readAllClients()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `wireRepo()` --calls--> `registerClient()`  [EXTRACTED]
  src/wire.ts → src/clients.ts
- `getOrCreateState()` --calls--> `stateTemplate()`  [EXTRACTED]
  src/index.ts → src/document.ts
- `findWorkspace()` --calls--> `isWorkspaceId()`  [EXTRACTED]
  src/workspace.ts → src/store.ts

## Import Cycles
- None detected.

## Communities (18 total, 6 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.14
Nodes (21): appendToSection(), ensureSessionHeading(), getSection(), replaceSection(), SectionName, sectionRange(), SECTIONS, stampUpdated() (+13 more)

### Community 1 - "package.json"
Cohesion: 0.09
Nodes (22): bin, corpus-connect, corpus-disconnect, corpus-ls, corpus-mcp-v2, corpus-setup, corpus-status, description (+14 more)

### Community 3 - "status.ts"
Cohesion: 0.19
Nodes (16): clients, graph, ids, localDir, project, target, createStore(), isWorkspaceId() (+8 more)

### Community 4 - "clients.ts"
Cohesion: 0.13
Nodes (25): ClientDef, CLIENTS, ClientState, jsonPath(), PatchResult, patchWorkspace(), readAllClients(), readClient() (+17 more)

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
Cohesion: 0.25
Nodes (7): Commands (global, from `npm link`), Corpus v2 — MCP server, Dev, Setup, Storage modes, Tools, Try the handoff (no keys, no network)

### Community 9 - "smoke.ts"
Cohesion: 0.20
Nodes (7): client, dc, dcDir, dcTransport, dir, h, transport

### Community 11 - "corpus"
Cohesion: 0.40
Nodes (4): CORPUS_AGENT, CORPUS_PROJECT, corpus-mcp-v2, corpus

### Community 15 - "ls.ts"
Cohesion: 0.19
Nodes (11): all, hereIds, known, online, target, unlisted, FILE, KnownWorkspace (+3 more)

### Community 17 - "backup-tmp.mjs"
Cohesion: 0.50
Nodes (3): db, dump, env

## Knowledge Gaps
- **96 isolated node(s):** `corpus-mcp-v2`, `CORPUS_PROJECT`, `CORPUS_AGENT`, `env`, `db` (+91 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LocalStore` connect `LocalStore` to `status.ts`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `SupabaseStore` connect `store.ts` to `LocalStore`, `status.ts`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `DisconnectedStore` connect `DisconnectedStore` to `LocalStore`, `status.ts`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `corpus-mcp-v2`, `CORPUS_PROJECT`, `CORPUS_AGENT` to the rest of the system?**
  _96 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14153846153846153 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Should `clients.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12643678160919541 - nodes in this community are weakly interconnected._