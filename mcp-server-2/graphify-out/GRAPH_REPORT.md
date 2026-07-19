# Graph Report - mcp-server-2  (2026-07-19)

## Corpus Check
- 27 files · ~17,462 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 257 nodes · 433 edges · 17 communities (13 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f0897a38`
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
- AGENTS.md
- Corpus v2 — MCP server
- smoke.ts
- LocalStore
- corpus
- AGENTS.md
- CLAUDE.md
- ls.ts
- backup-tmp.mjs
- hookwire.ts

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 11 edges
2. `SupabaseStore` - 10 edges
3. `readClient()` - 9 edges
4. `DocumentStore` - 9 edges
5. `LocalStore` - 9 edges
6. `DisconnectedStore` - 9 edges
7. `bin` - 8 edges
8. `Corpus v2 — MCP server` - 8 edges
9. `registerClient()` - 7 edges
10. `patchWorkspace()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `resolveProject()` --calls--> `readClient()`  [EXTRACTED]
  src/hooks.ts → src/clients.ts
- `wireRepo()` --calls--> `registerClient()`  [EXTRACTED]
  src/wire.ts → src/clients.ts
- `getOrCreateState()` --calls--> `stateTemplate()`  [EXTRACTED]
  src/index.ts → src/document.ts
- `estimateFullGraphTokens()` --calls--> `estimateTokens()`  [EXTRACTED]
  src/graphify.ts → src/tokens.ts
- `findWorkspace()` --calls--> `isWorkspaceId()`  [EXTRACTED]
  src/workspace.ts → src/store.ts

## Import Cycles
- None detected.

## Communities (17 total, 4 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.13
Nodes (25): appendToSection(), ensureSessionHeading(), getSection(), replaceSection(), SectionName, sectionRange(), SECTIONS, stampUpdated() (+17 more)

### Community 1 - "package.json"
Cohesion: 0.05
Nodes (37): @modelcontextprotocol/sdk, bin, corpus-connect, corpus-disconnect, corpus-hook, corpus-ls, corpus-mcp-v2, corpus-setup (+29 more)

### Community 3 - "status.ts"
Cohesion: 0.20
Nodes (15): clients, graph, ids, localDir, project, target, createStore(), isWorkspaceId() (+7 more)

### Community 4 - "clients.ts"
Cohesion: 0.21
Nodes (17): ClientDef, CLIENTS, ClientState, jsonPath(), PatchResult, patchWorkspace(), readAllClients(), readClient() (+9 more)

### Community 5 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, module, moduleResolution, outDir, rootDir, skipLibCheck (+7 more)

### Community 6 - "dependencies"
Cohesion: 0.25
Nodes (17): args, checkLogged(), Client, hasGraph(), markDirty(), markLogged(), pretool(), readState() (+9 more)

### Community 8 - "Corpus v2 — MCP server"
Cohesion: 0.22
Nodes (8): Commands (global, from `npm link`), Corpus v2 — MCP server, Dev, Hooks (installed by `corpus-setup`), Setup, Storage modes, Tools, Try the handoff (no keys, no network)

### Community 9 - "smoke.ts"
Cohesion: 0.18
Nodes (8): client, dc, dcDir, dcTransport, dir, h, initText, transport

### Community 10 - "LocalStore"
Cohesion: 0.12
Nodes (3): DisconnectedStore, DocumentStore, LocalStore

### Community 11 - "corpus"
Cohesion: 0.40
Nodes (4): CORPUS_AGENT, CORPUS_PROJECT, corpus-mcp-v2, corpus

### Community 15 - "ls.ts"
Cohesion: 0.09
Nodes (35): bad(), blue, bold, cmd(), cyan, dim, green, heading() (+27 more)

### Community 17 - "backup-tmp.mjs"
Cohesion: 0.50
Nodes (3): db, dump, env

### Community 18 - "hookwire.ts"
Cohesion: 0.48
Nodes (6): HookGroup, installEvents(), installHooks(), mergeEvent(), readJson(), writeJson()

## Knowledge Gaps
- **106 isolated node(s):** `corpus-mcp-v2`, `CORPUS_PROJECT`, `CORPUS_AGENT`, `env`, `db` (+101 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `wireRepo()` connect `clients.ts` to `index.ts`, `hookwire.ts`, `ls.ts`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `DisconnectedStore` connect `LocalStore` to `status.ts`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `SupabaseStore` connect `store.ts` to `LocalStore`, `status.ts`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `corpus-mcp-v2`, `CORPUS_PROJECT`, `CORPUS_AGENT` to the rest of the system?**
  _106 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12903225806451613 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._