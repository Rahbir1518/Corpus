/**
 * Terminal color for the `corpus-*` CLIs. Hand-rolled rather than a dependency: these
 * commands are the install path, so every package added here is one more thing that can
 * fail before the user has working memory.
 *
 * Colors are decoration, never information — each line still reads correctly with color
 * stripped, because it often is. `ENABLED` is false when output is piped, when NO_COLOR
 * is set (no-color.org), or on a dumb terminal, so `corpus-status > log.txt` produces a
 * clean file and not a pile of escape codes.
 *
 * NOT for the MCP server (index.ts): its stdout is the JSON-RPC channel, and an escape
 * code in there corrupts the protocol.
 */
const FORCED = process.env.FORCE_COLOR;

export const ENABLED =
  FORCED !== undefined && FORCED !== "0"
    ? true
    : // NO_COLOR is honored on presence, whatever the value — that is the spec.
      process.env.NO_COLOR === undefined &&
      process.env.TERM !== "dumb" &&
      process.stdout.isTTY === true;

const wrap = (open: number, close: number) => (s: string | number) =>
  ENABLED ? `\x1b[${open}m${s}\x1b[${close}m` : String(s);

export const bold = wrap(1, 22);
export const dim = wrap(2, 22);
export const red = wrap(31, 39);
export const green = wrap(32, 39);
export const yellow = wrap(33, 39);
export const blue = wrap(34, 39);
export const magenta = wrap(35, 39);
export const cyan = wrap(36, 39);

/**
 * Semantic wrappers. Call sites say what a thing IS, not what color to paint it, so the
 * palette stays consistent across five separate command files.
 */
export const heading = (s: string) => bold(s);
/** A workspace id, path, or other value the user may copy. */
export const value = (s: string | number) => cyan(s);
/** A command the user is meant to run. */
export const cmd = (s: string) => magenta(s);
/** Working / connected / reachable. */
export const ok = (s: string | number) => green(s);
/** Broken: unreachable, orphaned, invalid. */
export const bad = (s: string | number) => red(s);
/** Degraded but not broken: unverified, off, skipped. */
export const warn = (s: string | number) => yellow(s);
/** Explanatory second lines and parentheticals. */
export const hint = (s: string) => dim(s);
