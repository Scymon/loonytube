import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  // Auth check via user client
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = (body?.name ?? "").trim();
  if (name.length < 2)  return NextResponse.json({ error: "Name must be at least 2 characters" }, { status: 400 });
  if (name.length > 40) return NextResponse.json({ error: "Name too long (max 40)" }, { status: 400 });

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const { data, error } = await supabaseAdmin
    .from("audio_categories")
    .insert({ name, slug })
    .select("id, name, slug")
    .single();

  if (error) {
    if (error.code === "23505")
      return NextResponse.json({ error: "A category with that name already exists" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
