# Graph Report - test4  (2026-07-18)

## Corpus Check
- 5 files · ~798 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 15 nodes · 11 edges · 4 communities (1 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `94e0cb44`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- corpus
- AGENTS.md
- CLAUDE.md
- GEMINI.md

## God Nodes (most connected - your core abstractions)
1. `corpus` - 5 edges
2. `corpus-mcp-v2` - 1 edges
3. `CORPUS_PROJECT` - 1 edges
4. `CORPUS_AGENT` - 1 edges
5. `CORPUS_WORKSPACE` - 1 edges
6. `Corpus memory` - 1 edges
7. `Exploring code: use `codebase_search` FIRST` - 1 edges
8. `Corpus memory` - 1 edges
9. `Exploring code: use `codebase_search` FIRST` - 1 edges
10. `Corpus memory` - 1 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (4 total, 3 thin omitted)

### Community 0 - "corpus"
Cohesion: 0.33
Nodes (5): CORPUS_AGENT, CORPUS_PROJECT, CORPUS_WORKSPACE, corpus-mcp-v2, corpus

## Knowledge Gaps
- **10 isolated node(s):** `corpus-mcp-v2`, `CORPUS_PROJECT`, `CORPUS_AGENT`, `CORPUS_WORKSPACE`, `Corpus memory` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `corpus-mcp-v2`, `CORPUS_PROJECT`, `CORPUS_AGENT` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._