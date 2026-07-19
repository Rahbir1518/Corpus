# Graph Report - mcp-server-2  (2026-07-18)

## Corpus Check
- 30 files · ~21,863 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 315 nodes · 528 edges · 19 communities (15 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `341574b6`
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
- smoke-uninstall.ts
- ls.ts
- DisconnectedStore
- backup-tmp.mjs
- hookwire.ts

## God Nodes (most connected - your core abstractions)
1. `SupabaseStore` - 12 edges
2. `compilerOptions` - 11 edges
3. `DocumentStore` - 10 edges
4. `LocalStore` - 10 edges
5. `DisconnectedStore` - 10 edges
6. `bin` - 9 edges
7. `readClient()` - 9 edges
8. `wireRepo()` - 9 edges
9. `scripts` - 8 edges
10. `value()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `resolveProject()` --calls--> `readClient()`  [EXTRACTED]
  src/hooks.ts → src/clients.ts
- `wireRepo()` --calls--> `registerClient()`  [EXTRACTED]
  src/wire.ts → src/clients.ts
- `fixture()` --calls--> `wireRepo()`  [EXTRACTED]
  src/scripts/smoke-uninstall.ts → src/wire.ts
- `getOrCreateState()` --calls--> `stateTemplate()`  [EXTRACTED]
  src/index.ts → src/document.ts
- `estimateFullGraphTokens()` --calls--> `estimateTokens()`  [EXTRACTED]
  src/graphify.ts → src/tokens.ts

## Import Cycles
- None detected.

## Communities (19 total, 4 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.14
Nodes (24): appendToSection(), ensureSessionHeading(), getSection(), replaceSection(), SectionName, sectionRange(), SECTIONS, stampUpdated() (+16 more)

### Community 1 - "package.json"
Cohesion: 0.05
Nodes (41): @modelcontextprotocol/sdk, bin, corpus-connect, corpus-disconnect, corpus-hook, corpus-ls, corpus-mcp-v2, corpus-setup (+33 more)

### Community 3 - "status.ts"
Cohesion: 0.09
Nodes (31): ClientDef, CLIENTS, ClientState, jsonPath(), PatchResult, patchWorkspace(), readAllClients(), readClient() (+23 more)

### Community 4 - "clients.ts"
Cohesion: 0.19
Nodes (16): clients, graph, ids, localDir, project, target, createStore(), isWorkspaceId() (+8 more)

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
Cohesion: 0.10
Nodes (3): DisconnectedStore, DocumentStore, LocalStore

### Community 11 - "corpus"
Cohesion: 0.40
Nodes (4): CORPUS_AGENT, CORPUS_PROJECT, corpus-mcp-v2, corpus

### Community 14 - "smoke-uninstall.ts"
Cohesion: 0.11
Nodes (15): again, before, bogus, claude, dry, fixture(), hookJson, localMemory (+7 more)

### Community 15 - "ls.ts"
Cohesion: 0.09
Nodes (39): bad(), blue, bold, cmd(), cyan, dim, green, heading() (+31 more)

### Community 16 - "DisconnectedStore"
Cohesion: 0.53
Nodes (5): Req, run(), server(), step(), text()

### Community 17 - "backup-tmp.mjs"
Cohesion: 0.50
Nodes (3): db, dump, env

### Community 18 - "hookwire.ts"
Cohesion: 0.33
Nodes (10): findCorpusHooks(), HOOK_FILES, HookGroup, installEvents(), installHooks(), mergeEvent(), readJson(), uninstallFrom() (+2 more)

## Knowledge Gaps
- **140 isolated node(s):** `corpus-mcp-v2`, `CORPUS_PROJECT`, `CORPUS_AGENT`, `env`, `db` (+135 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `wireRepo()` connect `smoke-uninstall.ts` to `index.ts`, `hookwire.ts`, `status.ts`, `ls.ts`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `SupabaseStore` connect `store.ts` to `LocalStore`, `clients.ts`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `DisconnectedStore` connect `LocalStore` to `clients.ts`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `corpus-mcp-v2`, `CORPUS_PROJECT`, `CORPUS_AGENT` to the rest of the system?**
  _140 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.047619047619047616 - nodes in this community are weakly interconnected._
- **Should `status.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09411764705882353 - nodes in this community are weakly interconnected._