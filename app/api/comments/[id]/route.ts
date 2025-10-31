import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/api/utils/authGuard";
import supabase from "@/app/api/utils/db";
import { Role } from "@/app/api/types/auth/roles";
import { UserPayload } from "@/app/api/types/auth/authTypes";

function extractIdFromPath(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  return segments.length ? segments[segments.length - 1] : null;
}

// PUT — update a comment (any role, but only your own comment)
export const PUT = requireAuth(
  [Role.ORG_ADMIN, Role.TEAM_LEAD, Role.EMPLOYEE],
  async (req: NextRequest, user: UserPayload) => {
    const id = extractIdFromPath(req.nextUrl.pathname);
    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const { text } = await req.json();
    // Load the comment to check ownership
    const { data: existing, error: loadErr } = await supabase
      .from("comments")
      .select("user_id")
      .eq("id", id)
      .single();

    if (loadErr || !existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    // Only the comment's author may update it
    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("comments")
      .update({ text })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(data, { status: 200 });
  }
);

// DELETE — delete a comment
export const DELETE = requireAuth(
  [Role.ORG_ADMIN, Role.TEAM_LEAD, Role.EMPLOYEE],
  async (req: NextRequest, user: UserPayload) => {
    const id = extractIdFromPath(req.nextUrl.pathname);
    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const { data: existing, error: loadErr } = await supabase
      .from("comments")
      .select("user_id")
      .eq("id", id)
      .single();

    if (loadErr || !existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    // Admin can delete any; others only their own
    if (user.role !== Role.ORG_ADMIN && existing.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  }
);
