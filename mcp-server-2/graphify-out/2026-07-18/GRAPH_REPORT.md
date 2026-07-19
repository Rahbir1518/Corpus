# Graph Report - mcp-server-2  (2026-07-18)

## Corpus Check
- 26 files · ~14,824 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 229 nodes · 339 edges · 19 communities (13 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cf313e51`
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
- hookwire.ts

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 11 edges
2. `readClient()` - 9 edges
3. `DocumentStore` - 9 edges
4. `LocalStore` - 9 edges
5. `SupabaseStore` - 9 edges
6. `DisconnectedStore` - 9 edges
7. `bin` - 8 edges
8. `patchWorkspace()` - 7 edges
9. `estimateTokens()` - 7 edges
10. `wireRepo()` - 7 edges

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

## Communities (19 total, 6 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.14
Nodes (24): appendToSection(), ensureSessionHeading(), getSection(), replaceSection(), SectionName, sectionRange(), SECTIONS, stampUpdated() (+16 more)

### Community 1 - "package.json"
Cohesion: 0.06
Nodes (30): @modelcontextprotocol/sdk, bin, corpus-connect, corpus-disconnect, corpus-hook, corpus-ls, corpus-mcp-v2, corpus-setup (+22 more)

### Community 3 - "status.ts"
Cohesion: 0.18
Nodes (17): clients, graph, ids, localDir, project, target, createStore(), isWorkspaceId() (+9 more)

### Community 4 - "clients.ts"
Cohesion: 0.13
Nodes (24): ClientDef, CLIENTS, ClientState, jsonPath(), PatchResult, patchWorkspace(), readAllClients(), readClient() (+16 more)

### Community 5 - "compilerOptions"
Cohesion: 0.12
Nodes (15): src/scripts/**, src/**/*.ts, compilerOptions, declaration, esModuleInterop, module, moduleResolution, outDir (+7 more)

### Community 6 - "dependencies"
Cohesion: 0.31
Nodes (9): args, Client, firedAlready(), hasGraph(), pretool(), readStdin(), resolveProject(), sessionStart() (+1 more)

### Community 7 - "devDependencies"
Cohesion: 0.29
Nodes (7): devDependencies, tsx, @types/node, typescript, tsx, @types/node, typescript

### Community 8 - "Corpus v2 — MCP server"
Cohesion: 0.25
Nodes (7): Commands (global, from `npm link`), Corpus v2 — MCP server, Dev, Setup, Storage modes, Tools, Try the handoff (no keys, no network)

### Community 9 - "smoke.ts"
Cohesion: 0.18
Nodes (8): client, dc, dcDir, dcTransport, dir, h, initText, transport

### Community 11 - "corpus"
Cohesion: 0.40
Nodes (4): CORPUS_AGENT, CORPUS_PROJECT, corpus-mcp-v2, corpus

### Community 15 - "ls.ts"
Cohesion: 0.19
Nodes (11): all, hereIds, known, online, target, unlisted, FILE, KnownWorkspace (+3 more)

### Community 17 - "backup-tmp.mjs"
Cohesion: 0.50
Nodes (3): db, dump, env

### Community 18 - "hookwire.ts"
Cohesion: 0.48
Nodes (6): HookGroup, installEvents(), installHooks(), mergeEvent(), readJson(), writeJson()

## Knowledge Gaps
- **102 isolated node(s):** `corpus-mcp-v2`, `CORPUS_PROJECT`, `CORPUS_AGENT`, `env`, `db` (+97 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `wireRepo()` connect `clients.ts` to `index.ts`, `hookwire.ts`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `DisconnectedStore` connect `DisconnectedStore` to `LocalStore`, `status.ts`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `LocalStore` connect `LocalStore` to `status.ts`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `corpus-mcp-v2`, `CORPUS_PROJECT`, `CORPUS_AGENT` to the rest of the system?**
  _102 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.135632183908046 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._
- **Should `clients.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13054187192118227 - nodes in this community are weakly interconnected._