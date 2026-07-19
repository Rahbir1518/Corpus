import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { getWorkspacesForUser } from "@/lib/workspaces";
import { getUsageSummary } from "@/lib/usage";
import DashboardClient from "./DashboardClient";

export default async function Dashboard() {
  const session = await auth0.getSession();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const user = session.user;
  const workspaces = await getWorkspacesForUser(String(user.sub));
  // usage_events is keyed by project slug (no FK — see schema.sql), so the
  // ledger aggregates over the slugs of the workspaces shown in the graph.
  const usage = await getUsageSummary(workspaces.map((w) => w.slug));

  return (
    <DashboardClient
      user={{
        name: String(user.name || "there"),
        email: String(user.email || ""),
        picture: user.picture ? String(user.picture) : undefined,
      }}
      workspaces={workspaces}
      usage={usage}
    />
  );
}
