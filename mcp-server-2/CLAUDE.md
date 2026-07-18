<!-- corpus:begin -->
## Corpus memory

This project uses Corpus (MCP tools) for cross-session, cross-tool memory.

- At session start, and whenever asked to continue previous work: call `memory_load`.
- Immediately after finishing an edit, fixing a bug, or making a design decision:
  call `memory_log` — one line; for decisions include the why.
- Before ending a session, or when the user says "save state": call `memory_save`
  with concrete file/function references in every in-progress item.

## Exploring code: use `codebase_search` FIRST

`codebase_search` answers structural questions from a pre-built code graph in ~2K
tokens. The grep-and-read spiral it replaces costs tens of thousands. **Reach for it
before your first grep, not after exploration stalls** — and without waiting to be
asked. It is a default, not an escalation.

Call it whenever you need to know, and cannot already see in context:
- what calls / is called by a function, or where a symbol is defined
- how two areas connect ("how does auth reach the db")
- which files are involved in a feature, before opening any of them
- what a change might break — the blast radius of an edit
- where to start on an unfamiliar task in this repo

Then read only the files it points at. Grep and broad file reads are the fallback for
when the graph misses (it indexes structure, not string literals, comments, or config
values) — not the opening move. If it returns nothing useful, say so and fall back.
<!-- corpus:end -->
