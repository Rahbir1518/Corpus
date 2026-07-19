"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { DocumentSummary } from "@/lib/projects";
import { relativeTime } from "@/lib/time";
import BonsaiTree from "./BonsaiTree";

// Two-pane document view: a bonsai tree of documents on the left (60%), the
// rendered markdown reader on the right (40%). Content ships with the initial
// server fetch, so selecting a leaf is instant.
export default function ProjectDocuments({ documents }: { documents: DocumentSummary[] }) {
  const [activeName, setActiveName] = useState<string | null>(documents[0]?.name ?? null);

  if (documents.length === 0) {
    return (
      <main className="dashboard-main">
        <div className="dashboard-welcome-card">
          <h2 className="dashboard-welcome-heading">No documents yet</h2>
          <p className="dashboard-welcome-text">
            This project has no documents. They appear as your connected tools call{" "}
            <code>corpus_log</code> / <code>corpus_save</code>.
          </p>
        </div>
      </main>
    );
  }

  const active = documents.find((d) => d.name === activeName) ?? documents[0];

  return (
    <main className="docs-layout">
      <aside className="bonsai-pane">
        <BonsaiTree
          documents={documents}
          activeName={active.name}
          onSelect={setActiveName}
        />
      </aside>

      <section className="docs-reader">
        <div className="docs-reader-head">
          <h2 className="docs-reader-title">{active.name}</h2>
          <span className="docs-reader-meta">Updated {relativeTime(active.updated_at)}</span>
        </div>
        <article className="docs-reader-body markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{active.content}</ReactMarkdown>
        </article>
      </section>
    </main>
  );
}
