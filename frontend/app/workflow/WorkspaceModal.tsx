"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WorkspaceNode } from "@/lib/similarity";

interface Doc {
  name: string;
  content: string;
  updated_at?: string;
}

interface Props {
  workspace: WorkspaceNode;
  color: string;
  onClose: () => void;
  onSaved: () => void; // let the parent refresh the graph after an edit lands
}

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export default function WorkspaceModal({ workspace, color, onClose, onSaved }: Props) {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [demo, setDemo] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/corpus/documents?project=${encodeURIComponent(workspace.id)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? r.statusText);
        return r.json();
      })
      .then((json) => {
        if (cancelled) return;
        setDocs(json.documents);
        setDemo(!!json.demo);
        const first = json.documents[0];
        if (first) {
          setActive(first.name);
          setDraft(first.content);
        }
      })
      .catch((e) => !cancelled && setLoadError(String(e.message ?? e)));
    return () => {
      cancelled = true;
    };
  }, [workspace.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const activeDoc = docs?.find((d) => d.name === active) ?? null;

  const openDoc = (doc: Doc) => {
    if (saveState === "dirty" && activeDoc && draft !== activeDoc.content) {
      if (!window.confirm("Discard unsaved changes to " + activeDoc.name + "?")) return;
    }
    setActive(doc.name);
    setDraft(doc.content);
    setSaveState("idle");
    setSaveError(null);
  };

  const save = useCallback(async () => {
    if (!activeDoc || saveState === "saving") return;
    setSaveState("saving");
    setSaveError(null);
    try {
      const res = await fetch("/api/corpus/documents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: workspace.id, name: activeDoc.name, content: draft }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? res.statusText);
      setDocs(
        (prev) =>
          prev?.map((d) =>
            d.name === activeDoc.name
              ? { ...d, content: draft, updated_at: json?.updated_at }
              : d,
          ) ?? prev,
      );
      setSaveState("saved");
      onSaved();
      setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 2000);
    } catch (e: any) {
      setSaveState("error");
      setSaveError(String(e.message ?? e));
    }
  }, [activeDoc, draft, workspace.id, saveState, onSaved]);

  // Cmd/Ctrl+S saves instead of triggering the browser dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  const dirty = activeDoc != null && draft !== activeDoc.content;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/60 backdrop-blur-sm animate-fade-rise"
      style={{ animationDuration: "0.25s" }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="liquid-glass w-full max-w-4xl h-[min(80vh,720px)] rounded-3xl border border-white/10 bg-[#0b0b12]/90 flex flex-col overflow-hidden shadow-[0_30px_90px_-20px_rgba(0,0,0,0.8)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-7 pt-6 pb-4 border-b border-white/[0.07]">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0"
                style={{ background: color, boxShadow: `0 0 14px ${color}` }}
              />
              <h2 className="font-display text-3xl tracking-tight truncate">{workspace.name}</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 font-mono">
              {workspace.docCount} document{workspace.docCount === 1 ? "" : "s"} · ~
              {workspace.tokens.toLocaleString()} tokens
              {demo && <span className="text-amber-300/80"> · demo data (read-only)</span>}
            </p>
            {workspace.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {workspace.keywords.map((k) => (
                  <span
                    key={k}
                    className="px-2 py-0.5 rounded-full text-[11px] font-mono border border-white/10 bg-white/[0.04] text-muted-foreground"
                  >
                    {k}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 w-9 h-9 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-[240px_1fr] min-h-0">
          {/* Doc list */}
          <div className="corpus-scroll overflow-y-auto border-b sm:border-b-0 sm:border-r border-white/[0.07] p-3 max-h-40 sm:max-h-none">
            {docs === null && !loadError && (
              <p className="text-sm text-muted-foreground px-2 py-3">Loading documents…</p>
            )}
            {loadError && <p className="text-sm text-red-400 px-2 py-3">{loadError}</p>}
            {docs?.length === 0 && (
              <p className="text-sm text-muted-foreground px-2 py-3">
                No documents in this workspace yet.
              </p>
            )}
            {docs?.map((d) => (
              <button
                key={d.name}
                onClick={() => openDoc(d)}
                className={`w-full text-left px-3 py-2.5 rounded-xl mb-1 transition-colors border ${
                  d.name === active
                    ? "bg-white/[0.08] border-white/15"
                    : "border-transparent hover:bg-white/[0.04]"
                }`}
              >
                <span className="block text-sm font-mono truncate text-foreground/90">
                  {d.name}
                </span>
                {d.updated_at && (
                  <span className="block text-[11px] text-muted-foreground mt-0.5">
                    {new Date(d.updated_at).toLocaleString()}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Editor */}
          <div className="flex flex-col min-h-0">
            {activeDoc ? (
              <>
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    setSaveState("dirty");
                  }}
                  spellCheck={false}
                  className="corpus-scroll flex-1 resize-none bg-transparent px-6 py-5 font-mono text-[13px] leading-relaxed text-foreground/90 outline-none placeholder:text-muted-foreground"
                  placeholder="# Empty document"
                />
                <div className="flex items-center justify-between gap-3 px-6 py-3.5 border-t border-white/[0.07]">
                  <span className="text-xs text-muted-foreground font-mono truncate">
                    {saveState === "saving" && "Saving…"}
                    {saveState === "saved" && <span className="text-emerald-400">Saved ✓</span>}
                    {saveState === "error" && <span className="text-red-400">{saveError}</span>}
                    {(saveState === "idle" || saveState === "dirty") &&
                      (dirty ? "Unsaved changes · ⌘S to save" : "Markdown · edits write to Supabase")}
                  </span>
                  <button
                    onClick={save}
                    disabled={!dirty || saveState === "saving" || demo}
                    className="liquid-glass rounded-full px-6 py-2 text-sm font-medium transition-all enabled:hover:bg-white/10 enabled:hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {demo ? "Read-only demo" : saveState === "saving" ? "Saving…" : "Save"}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                Select a document to view and edit it.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
