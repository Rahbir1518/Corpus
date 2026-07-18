/**
 * Pure markdown document operations — no I/O. Storage lives in store.ts.
 *
 * Format contract (ARCHITECTURE.md "Document model"): the `state` document has a fixed
 * section order parsed by `## ` headings. Current-state sections (Status, Next steps) are
 * REWRITTEN on save; history sections (Decisions, Session log) are APPEND-ONLY.
 */

export const STATE_DOC = "state";

const SECTIONS = ["Status", "Next steps", "Decisions", "Architecture notes", "Session log"] as const;
export type SectionName = (typeof SECTIONS)[number];

export function stateTemplate(projectName: string): string {
  return `# Corpus memory — ${projectName}

_Last updated: ${new Date().toISOString()} · maintained by Corpus_

## Status

**Done:** (nothing recorded yet)

**In progress:** (nothing recorded yet)

## Next steps

(none recorded yet)

## Decisions

## Architecture notes

## Session log
`;
}

function stampUpdated(content: string): string {
  return content.replace(
    /^_Last updated: .*$/m,
    `_Last updated: ${new Date().toISOString()} · maintained by Corpus_`,
  );
}

/** [start, end) line range of a section's body — after its `## ` heading, up to the next `## ` or EOF. */
function sectionRange(lines: string[], name: SectionName): { start: number; end: number } | null {
  const headingIdx = lines.findIndex((l) => l.trim() === `## ${name}`);
  if (headingIdx === -1) return null;
  let end = lines.length;
  for (let i = headingIdx + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) {
      end = i;
      break;
    }
  }
  return { start: headingIdx + 1, end };
}

export function getSection(content: string, name: SectionName): string | null {
  const lines = content.split("\n");
  const r = sectionRange(lines, name);
  if (!r) return null;
  return lines.slice(r.start, r.end).join("\n").trim();
}

/** Replace a section's body entirely (current-state sections). */
export function replaceSection(content: string, name: SectionName, body: string): string {
  const lines = content.split("\n");
  const r = sectionRange(lines, name);
  if (!r) throw new Error(`Section "## ${name}" not found in state document`);
  return stampUpdated(
    [...lines.slice(0, r.start), "", body.trim(), "", ...lines.slice(r.end)].join("\n"),
  );
}

/** Append to the end of a section's body (history sections). */
export function appendToSection(content: string, name: SectionName, addition: string): string {
  const lines = content.split("\n");
  const r = sectionRange(lines, name);
  if (!r) throw new Error(`Section "## ${name}" not found in state document`);
  let end = r.end;
  while (end > r.start && lines[end - 1].trim() === "") end--;
  return stampUpdated(
    [...lines.slice(0, end), addition.trimEnd(), "", ...lines.slice(r.end)].join("\n"),
  );
}

/** Ensure a `### <label>` heading exists in the session log; append it if not. */
export function ensureSessionHeading(content: string, sessionLabel: string): string {
  const body = getSection(content, "Session log") ?? "";
  if (body.includes(`### ${sessionLabel}`)) return content;
  return appendToSection(content, "Session log", `### ${sessionLabel}`);
}
