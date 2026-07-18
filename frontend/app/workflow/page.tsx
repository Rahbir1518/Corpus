import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import Link from "next/link";
import Workspace from "./Workspace";

export default async function WorkflowPage() {
  const session = await auth0.getSession();
  if (!session?.user) redirect("/auth/login");

  return (
    <div className="workflow-page">
      <header className="dashboard-header">
        <div className="dashboard-header-left">
          <Link href="/dashboard" className="dashboard-logo">
            C
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
