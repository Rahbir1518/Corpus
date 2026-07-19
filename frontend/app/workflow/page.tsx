import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Workspace from "./Workspace";

export default async function WorkflowPage() {
  const session = await auth0.getSession();
  if (!session?.user) redirect("/auth/login");

  return (
    <div className="workflow-page">
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
          <h1 className="dashboard-title">Corpus — memory graph</h1>
        </div>
        <div className="dashboard-header-right">
          <Link href="/dashboard" className="btn btn-secondary">
            Dashboard
          </Link>
        </div>
      </header>
      <Workspace />
    </div>
  );
}
