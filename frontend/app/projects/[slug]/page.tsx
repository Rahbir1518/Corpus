import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { listDocuments, getProject } from "@/lib/projects";
import ProjectDocuments from "./ProjectDocuments";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth0.getSession();
  if (!session?.user) redirect("/auth/login");

  // The [slug] route param is the workspace id (documents are keyed by workspace_id).
  const { slug: raw } = await params;
  const id = decodeURIComponent(raw);

  const project = await getProject(id);
  if (!project) redirect("/projects");

  const documents = await listDocuments(id);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="dashboard-header-left">
          <Link href="/projects" className="brand-link">
            <Image
              src="/assets/corpus_logo.png"
              alt="Corpus"
              width={62}
              height={62}
              className="brand-logo"
            />
          </Link>
          <div>
            <h1 className="dashboard-title">{project.name}</h1>
            <p className="dashboard-subtitle">
              {documents.length} {documents.length === 1 ? "document" : "documents"}
            </p>
          </div>
        </div>
        <div className="dashboard-header-right">
          <Link href="/projects" className="btn btn-secondary">
            ← All projects
          </Link>
        </div>
      </header>

      <ProjectDocuments documents={documents} />
    </div>
  );
}
