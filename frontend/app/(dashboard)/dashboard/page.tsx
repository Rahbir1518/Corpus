import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Dashboard() {
  const session = await auth0.getSession();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const user = session.user;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="dashboard-header-left">
          <div className="dashboard-logo">C</div>
          <div>
            <h1 className="dashboard-title">Dashboard</h1>
            <p className="dashboard-subtitle">Your Corpus workspace overview</p>
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
              <span className="dashboard-user-name">
                {String(user.name || "User")}
              </span>
              <span className="dashboard-user-email">
                {String(user.email || "")}
              </span>
            </div>
          </div>
          <a href="/auth/logout" className="btn btn-danger">
            Logout
          </a>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-welcome-card">
          <h2 className="dashboard-welcome-heading">
            {greeting}, {String(user.name || "there")}!
          </h2>
          <p className="dashboard-welcome-text">
            Here&apos;s your workspace. Get started with your workflow.
          </p>
        </div>

        <div className="dashboard-actions">
          <Link href="/workflow" className="dashboard-action-card">
            <div className="dashboard-action-icon">⚡</div>
            <h3 className="dashboard-action-title">Workflow</h3>
            <p className="dashboard-action-desc">
              Manage and run your workflows
            </p>
          </Link>
        </div>

        <p className="dashboard-footer-note">
          Powered by Corpus — cross-session, cross-tool project memory.
        </p>
      </main>
    </div>
  );
}