import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getSupabase } from "@/lib/supabase";

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

  const updated_at = new Date().toISOString();
  const { error } = await sb
    .from("documents")
    .update({ content, updated_at })
    .eq("workspace_id", workspace_id)
    .eq("name", name);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, updated_at });
}
