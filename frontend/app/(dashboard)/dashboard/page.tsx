import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { getWorkspacesForUser } from "@/lib/workspaces";
import DashboardClient from "./DashboardClient";

export default async function Dashboard() {
  const session = await auth0.getSession();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const user = session.user;
  const workspaces = await getWorkspacesForUser(String(user.sub));

  return (
    <DashboardClient
      user={{
        name: String(user.name || "there"),
        email: String(user.email || ""),
        picture: user.picture ? String(user.picture) : undefined,
      }}
      workspaces={workspaces}
    />
  );
}
