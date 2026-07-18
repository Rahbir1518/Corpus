import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getSupabase } from "@/lib/supabase";
import { DEMO_DOCS } from "@/lib/demoData";

// GET /api/corpus/documents?project=<slug> → { demo, documents: [{name, content, updated_at}] }
export async function GET(req: NextRequest) {
  const session = await auth0.getSession();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const project = req.nextUrl.searchParams.get("project");
  if (!project) return NextResponse.json({ error: "project is required" }, { status: 400 });

  const sb = getSupabase();
  if (!sb) {
    const documents = DEMO_DOCS.filter((d) => d.project === project).map(
      ({ name, content, updated_at }) => ({ name, content, updated_at }),
    );
    return NextResponse.json({ demo: true, documents });
  }

  const { data, error } = await sb
    .from("documents")
    .select("name,content,updated_at")
    .eq("project", project)
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ demo: false, documents: data ?? [] });
}

// PUT /api/corpus/documents  { project, name, content } → saves the markdown edit.
export async function PUT(req: NextRequest) {
  const session = await auth0.getSession();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { project?: string; name?: string; content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { project, name, content } = body;
  if (!project || !name || typeof content !== "string") {
    return NextResponse.json({ error: "project, name and content are required" }, { status: 400 });
  }

  const sb = getSupabase();
  if (!sb) {
    return NextResponse.json(
      { error: "Demo mode — connect Supabase to save edits." },
      { status: 503 },
    );
  }

  const updated_at = new Date().toISOString();
  const { data, error } = await sb
    .from("documents")
    .update({ content, updated_at })
    .eq("project", project)
    .eq("name", name)
    .select("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "document not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, updated_at });
}
