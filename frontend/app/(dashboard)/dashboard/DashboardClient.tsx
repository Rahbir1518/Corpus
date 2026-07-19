"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { WorkspaceDoc, WorkspaceWithDocs } from "@/lib/workspaces";
import CorpusGraph, { clusterColor, docNodeId, GraphSelection, ROOT_ID } from "./CorpusGraph";

// Same motionsites.ai free clips the landing page uses — keeps the two pages
// reading as one product.
const HERO_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4";
const FOOTER_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260619_191346_9d19d66e-86a4-47f7-8dc6-712c1788c3b2.mp4";

interface DashboardUser {
  name: string;
  email: string;
  picture?: string;
}

interface Props {
  user: DashboardUser;
  workspaces: WorkspaceWithDocs[];
}

function connectMailto(ws: WorkspaceWithDocs): string {
  const subject = `Connect to "${ws.name}" on Corpus`;
  const body = [
    "Hey,",
    "",
    "Run this in your project to connect to my Corpus workspace:",
    "",
    `corpus-connect ${ws.id}`,
    "",
    "— sent from Corpus. Never explain yourself twice.",
  ].join("\n");
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function DashboardClient({ user, workspaces: initialWorkspaces }: Props) {
  const [workspaces, setWorkspaces] = useState(initialWorkspaces);
  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<GraphSelection | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelection(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const firstName = user.name.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const docCount = workspaces.reduce((n, w) => n + w.documents.length, 0);

  // Keyword search: any term hitting a workspace name/slug or a document
  // name/content lights that node up; a matched doc keeps its hub lit so the
  // whole cluster reads.
  const highlight = useMemo(() => {
    const ids = new Set<string>();
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return ids;

    for (const ws of workspaces) {
      const wsHay = `${ws.name} ${ws.slug}`.toLowerCase();
      if (terms.some((t) => wsHay.includes(t))) {
        ids.add(ws.id);
        ids.add(ROOT_ID);
      }
      for (const doc of ws.documents) {
        const hay = `${doc.name} ${doc.content}`.toLowerCase();
        if (terms.some((t) => hay.includes(t))) {
          ids.add(docNodeId(ws.id, doc.name));
          ids.add(ws.id);
        }
      }
    }
    return ids;
  }, [query, workspaces]);

  const selectedWs = selection ? workspaces.find((w) => w.id === selection.workspaceId) ?? null : null;
  const selectedWsIndex = selectedWs ? workspaces.findIndex((w) => w.id === selectedWs.id) : -1;
  const selectedDoc =
    selectedWs && selection?.docName
      ? selectedWs.documents.find((d) => d.name === selection.docName) ?? null
      : null;

  const handleSaved = (wsId: string, docName: string, content: string, updated_at: string) => {
    setWorkspaces((prev) =>
      prev.map((w) =>
        w.id === wsId
          ? {
              ...w,
              documents: w.documents.map((d) =>
                d.name === docName ? { ...d, content, updated_at } : d,
              ),
            }
          : w,
      ),
    );
  };

  return (
    <main className="bg-background text-foreground min-h-screen selection:bg-white/20 selection:text-white">
      {/* ───────── Nav ───────── */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 transition-all duration-300 ${
          scrolled ? "liquid-glass bg-background/50 border-b border-white/5" : "bg-transparent"
        }`}
      >
        <Link href="/" className="font-display text-3xl tracking-tight">
          Corpus<sup className="text-xs">®</sup>
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3">
            {user.picture && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.picture}
                alt={user.name}
                className="w-8 h-8 rounded-full border border-white/20 object-cover"
              />
            )}
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-medium">{user.name}</span>
              <span className="text-xs text-muted-foreground">{user.email}</span>
            </div>
          </div>
          <a
            href="/auth/logout"
            className="liquid-glass rounded-full px-5 py-2 text-sm font-medium hover:bg-white/10 transition-colors"
          >
            Logout
          </a>
        </div>
      </nav>

      {/* ───────── Hero header ───────── */}
      <header className="relative h-[52vh] min-h-[380px] flex flex-col items-center justify-end overflow-hidden pb-16">
        <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0">
          <source src={HERO_VIDEO} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-background/40 mix-blend-multiply z-[1]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent z-[2]"></div>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 className="font-display text-4xl sm:text-6xl md:text-7xl leading-[0.95] tracking-tight animate-fade-rise">
            {greeting}, <em className="not-italic text-muted-foreground">{firstName}.</em>
          </h1>
          <p className="text-muted-foreground mt-6 text-base sm:text-lg animate-fade-rise-delay">
            {workspaces.length} workspace{workspaces.length === 1 ? "" : "s"} · {docCount} document
            {docCount === 1 ? "" : "s"} remembered. Click a node to open it.
          </p>
        </div>
      </header>

      {/* ───────── Memory graph ───────── */}
      <section className="relative z-10 px-4 sm:px-6 pb-24 -mt-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="liquid-glass rounded-full flex items-center gap-3 px-5 py-3 flex-1 max-w-md">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="text-muted-foreground shrink-0"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your memory…"
                className="bg-transparent outline-none text-sm w-full placeholder:text-muted-foreground"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="text-muted-foreground hover:text-foreground text-xs shrink-0"
                >
                  clear
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {workspaces.map((ws, i) => (
                <button
                  key={ws.id}
                  onClick={() => setSelection({ workspaceId: ws.id })}
                  className="liquid-glass rounded-full px-4 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors inline-flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: clusterColor(i) }} />
                  {ws.name}
                </button>
              ))}
            </div>
          </div>

          <div className="relative h-[68vh] min-h-[460px] rounded-3xl liquid-glass border border-white/10 bg-white/[0.01] overflow-hidden">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  "radial-gradient(circle at center, rgba(255,255,255,0.1) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
                opacity: 0.4,
              }}
            ></div>
            <CorpusGraph
              workspaces={workspaces}
              rootLabel={`${firstName}'s corpus`}
              highlight={highlight}
              searchActive={query.trim().length > 0}
              onSelect={setSelection}
            />
            {query.trim() && highlight.size === 0 && (
              <div className="absolute inset-x-0 bottom-6 text-center text-sm text-muted-foreground">
                Nothing in your corpus matches “{query.trim()}”.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ───────── Footer ───────── */}
      <footer className="relative pt-24 pb-10 px-6 border-t border-white/5 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover object-bottom opacity-50"
          style={{
            WebkitMaskImage:
              "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 40%, rgba(0,0,0,1) 100%)",
            maskImage:
              "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 40%, rgba(0,0,0,1) 100%)",
          }}
        >
          <source src={FOOTER_VIDEO} type="video/mp4" />
        </video>

        <div className="relative z-10 max-w-6xl mx-auto w-full">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 pb-10 border-b border-white/5">
            <div>
              <p className="font-display text-3xl tracking-tight mb-3">
                Corpus<sup className="text-xs">®</sup>
              </p>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                A portable memory layer for every model you use.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-8 text-xs text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Corpus. All rights reserved.</p>
            <p className="uppercase tracking-[0.15em]">Never explain yourself twice</p>
          </div>
        </div>
      </footer>

      {/* ───────── Modals ───────── */}
      {selectedWs && selectedDoc && (
        <DocumentModal
          key={`${selectedWs.id}::${selectedDoc.name}`}
          ws={selectedWs}
          wsColor={clusterColor(selectedWsIndex)}
          doc={selectedDoc}
          onClose={() => setSelection(null)}
          onSaved={handleSaved}
        />
      )}
      {selectedWs && !selectedDoc && (
        <WorkspaceModal
          ws={selectedWs}
          wsColor={clusterColor(selectedWsIndex)}
          onClose={() => setSelection(null)}
          onOpenDoc={(docName) => setSelection({ workspaceId: selectedWs.id, docName })}
        />
      )}
    </main>
  );
}

/* ───────── Shareable id chip: opens a mail draft with corpus-connect <id> ───────── */

function ConnectIdChip({ ws }: { ws: WorkspaceWithDocs }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-2">
        Workspace ID — click to email <code className="font-mono normal-case">corpus-connect</code>
      </p>
      <a
        href={connectMailto(ws)}
        title={`Email someone: corpus-connect ${ws.id}`}
        className="liquid-glass rounded-xl px-4 py-2.5 inline-flex items-center gap-3 font-mono text-xs text-foreground hover:bg-white/10 transition-colors break-all"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-muted-foreground"
        >
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
          <polyline points="22,6 12,13 2,6"></polyline>
        </svg>
        {ws.id}
      </a>
    </div>
  );
}

/* ───────── Document editor modal ───────── */

function DocumentModal({
  ws,
  wsColor,
  doc,
  onClose,
  onSaved,
}: {
  ws: WorkspaceWithDocs;
  wsColor: string;
  doc: WorkspaceDoc;
  onClose: () => void;
  onSaved: (wsId: string, docName: string, content: string, updated_at: string) => void;
}) {
  const [draft, setDraft] = useState(doc.content);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const dirty = draft !== doc.content;

  async function save() {
    setState("saving");
    try {
      const res = await fetch("/api/documents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: ws.id, name: doc.name, content: draft }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "save failed");
      onSaved(ws.id, doc.name, draft, json.updated_at ?? new Date().toISOString());
      setState("saved");
    } catch {
      setState("error");
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display text-3xl tracking-tight">{doc.name}</h2>
          <p className="text-sm text-muted-foreground mt-1 inline-flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: wsColor }} />
            {ws.name} · updated{" "}
            {new Date(doc.updated_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
        <CloseButton onClose={onClose} />
      </div>

      <div className="mb-6">
        <ConnectIdChip ws={ws} />
      </div>

      <textarea
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setState("idle");
        }}
        spellCheck={false}
        className="w-full h-72 resize-y rounded-2xl bg-black/40 border border-white/10 focus:border-white/25 outline-none p-4 font-mono text-[13px] leading-relaxed text-foreground"
      />

      <div className="flex items-center justify-between gap-4 mt-5">
        <p className="text-xs text-muted-foreground">
          {state === "saving" && "Saving…"}
          {state === "saved" && "Saved."}
          {state === "error" && <span className="text-[#ef4444]">Save failed — try again.</span>}
          {state === "idle" && (dirty ? "Unsaved changes" : "Markdown, stored in Supabase.")}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="rounded-full px-6 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Close
          </button>
          <button
            onClick={save}
            disabled={!dirty || state === "saving"}
            className="liquid-glass rounded-full px-8 py-2.5 text-sm font-medium hover:bg-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ───────── Workspace overview modal ───────── */

function WorkspaceModal({
  ws,
  wsColor,
  onClose,
  onOpenDoc,
}: {
  ws: WorkspaceWithDocs;
  wsColor: string;
  onClose: () => void;
  onOpenDoc: (docName: string) => void;
}) {
  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display text-3xl tracking-tight inline-flex items-center gap-3">
            <span className="w-3 h-3 rounded-full" style={{ background: wsColor }} />
            {ws.name}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 font-mono">{ws.slug}</p>
        </div>
        <CloseButton onClose={onClose} />
      </div>

      <div className="mb-6">
        <ConnectIdChip ws={ws} />
      </div>

      <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-2">
        Documents
      </p>
      {ws.documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing here yet — run <code className="font-mono">corpus_save</code> from a session.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {ws.documents.map((d) => (
            <li key={d.name}>
              <button
                onClick={() => onOpenDoc(d.name)}
                className="w-full liquid-glass rounded-xl px-4 py-3 flex items-center justify-between gap-4 text-left hover:bg-white/10 transition-colors"
              >
                <span className="text-sm inline-flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: wsColor }} />
                  {d.name}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(d.updated_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </ModalShell>
  );
}

/* ───────── Shared modal chrome ───────── */

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-background/70 backdrop-blur-sm animate-modal-fade"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="liquid-glass rounded-3xl border border-white/10 bg-background/80 w-full max-w-2xl max-h-[88vh] overflow-y-auto p-6 sm:p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] animate-modal-pop">
        {children}
      </div>
    </div>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      aria-label="Close"
      className="liquid-glass rounded-full w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors shrink-0"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  );
}
