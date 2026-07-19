import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { listProjects } from "@/lib/projects";
import { relativeTime } from "@/lib/time";

export default async function ProjectsPage() {
  const session = await auth0.getSession();
  if (!session?.user) redirect("/auth/login");

  const user = session.user;
  const projects = await listProjects();

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="dashboard-header-left">
          <Link href="/dashboard" className="brand-link">
            <Image
              src="/assets/corpus_logo.png"
              alt="Corpus"
              width={62}
              height={62}
              className="brand-logo"
            />
          </Link>
          <div>
            <h1 className="dashboard-title">Select a project</h1>
            <p className="dashboard-subtitle">
              Choose a project to view its documents
            </p>
          </div>
        </div>
        <div className="dashboard-header-right">
          <div className="dashboard-user-info">
            {user.picture && (
              <img
                src={user.picture as string}
                alt={String(user.name || "User avatar")}
                className="dashboard-avatar"
              />
            )}
            <div className="dashboard-user-details">
              <span className="dashboard-user-name">{String(user.name || "User")}</span>
              <span className="dashboard-user-email">{String(user.email || "")}</span>
            </div>
          </div>
          <a href="/auth/logout" className="btn btn-danger">
            Logout
          </a>
        </div>
      </header>

      <main className="dashboard-main">
        {projects.length === 0 ? (
          <div className="dashboard-welcome-card">
            <h2 className="dashboard-welcome-heading">No projects yet</h2>
            <p className="dashboard-welcome-text">
              Projects appear here once your Corpus memory has data. Run a{" "}
              <code>corpus_log</code> or <code>corpus_save</code> from any connected
              tool to create one.
            </p>
          </div>
        ) : (
          <div className="project-grid">
            {projects.map((p) => (
              <Link key={p.id} href={`/projects/${encodeURIComponent(p.id)}`} className="project-card">
                <div className="project-card-top">
                  <span className="project-card-avatar">{p.name.charAt(0).toUpperCase()}</span>
                  <span className="project-card-count">
                    {p.doc_count} {p.doc_count === 1 ? "doc" : "docs"}
                  </span>
                </div>
                <h3 className="project-card-name">{p.name}</h3>
                <p className="project-card-meta">
                  {p.last_updated ? `Updated ${relativeTime(p.last_updated)}` : "No activity yet"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
