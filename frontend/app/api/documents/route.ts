import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getSupabase } from "@/lib/supabase";
import { updateDocument } from "@/lib/documents";

// PUT /api/documents { workspace_id, name, content } → save a markdown document.
export async function PUT(req: NextRequest) {
  const session = await auth0.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const workspace_id = body?.workspace_id;
  const name = body?.name;
  const content = body?.content;

  if (
    typeof workspace_id !== "string" ||
    typeof name !== "string" ||
    typeof content !== "string" ||
    !workspace_id ||
    !name
  ) {
    return NextResponse.json({ error: "workspace_id, name and content are required" }, { status: 400 });
  }

  const sb = getSupabase();
  if (!sb) {
    // Demo mode (no Supabase env): pretend the save landed so the UI flow works.
    return NextResponse.json({ ok: true, demo: true, updated_at: new Date().toISOString() });
  }

  // The document is addressed by workspace id OR by the workspace's slug depending on
  // which schema the DB is on (lib/documents.ts), so the slug has to be resolved first.
  const { data: ws, error: wErr } = await sb
    .from("workspaces")
    .select("id,slug")
    .eq("id", workspace_id)
    .maybeSingle();
  if (wErr) {
    return NextResponse.json({ error: wErr.message }, { status: 500 });
  }
  if (!ws) {
    return NextResponse.json({ error: `unknown workspace ${workspace_id}` }, { status: 404 });
  }

  const updated_at = new Date().toISOString();
  try {
    const rows = await updateDocument(sb, { id: String(ws.id), slug: ws.slug }, name, content, updated_at);
    if (rows === 0) {
      return NextResponse.json(
        { error: `no document named "${name}" in this workspace` },
        { status: 404 },
      );
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, updated_at });
}
