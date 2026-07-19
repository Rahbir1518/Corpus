import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getWorkspacesForUser } from "@/lib/workspaces";

// GET /api/workspaces → this user's workspaces + documents + membership state.
// The dashboard refetches this when Realtime reports workspace_members or
// documents changed (corpus-connect / corpus-disconnect / corpus_save).
export async function GET() {
  const session = await auth0.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const workspaces = await getWorkspacesForUser(String(session.user.sub));
  return NextResponse.json({ workspaces });
}
