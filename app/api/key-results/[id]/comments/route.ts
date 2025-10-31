// File: /api/key-results/[id]/comments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/api/utils/authGuard";
import supabase from "@/app/api/utils/db";
import { Role } from "@/app/api/types/auth/roles";
import { UserPayload } from "@/app/api/types/auth/authTypes";

// Extract the dynamic keyResultId from the path
function extractIdFromPath(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  // ['api','key-results','{id}','comments']
  return segments.length >= 3 ? segments[2] : null;
}

// Helper to verify key result → objective → team → org
async function authorizeKeyResult(keyResultId: string, user: UserPayload) {
  // Load KR and its objective’s team
  const { data: kr, error: krErr } = await supabase
    .from("key_results")
    .select("id, objective_id")
    .eq("id", keyResultId)
    .single();
  if (krErr || !kr) return { ok: false, status: 404 };

  const { data: obj, error: objErr } = await supabase
    .from("objectives")
    .select("team_id")
    .eq("id", kr.objective_id)
    .single();
  if (objErr || !obj) return { ok: false, status: 404 };

  const { data: team, error: tErr } = await supabase
    .from("teams")
    .select("organization_id")
    .eq("id", obj.team_id)
    .single();
  if (tErr || !team) return { ok: false, status: 404 };

  // Org check
  if (team.organization_id !== user.organization_id) {
    return { ok: false, status: 403 };
  }
  // Team-lead & employee check
  if (
    (user.role === Role.TEAM_LEAD || user.role === Role.EMPLOYEE) &&
    obj.team_id !== user.team_id
  ) {
    return { ok: false, status: 403 };
  }

  return { ok: true, team_id: obj.team_id };
}

// GET comments for a key result
export const GET = requireAuth(
  [Role.ORG_ADMIN, Role.TEAM_LEAD, Role.EMPLOYEE],
  async (req: NextRequest, user: UserPayload) => {
    const keyResultId = extractIdFromPath(req.nextUrl.pathname);
    console.log(keyResultId);
    if (!keyResultId) {
      return NextResponse.json(
        { error: "Missing key result ID" },
        { status: 400 }
      );
    }

    const auth = await authorizeKeyResult(keyResultId, user);
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.status === 404 ? "Not found" : "Forbidden" },
        { status: auth.status }
      );
    }

    const { data, error } = await supabase
      .from("comments")
      .select("id, user:user_id(id, name, role), text, created_at")
      .eq("key_result_id", keyResultId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data, { status: 200 });
  }
);

// POST a new comment under a key result
export const POST = requireAuth(
  [Role.ORG_ADMIN, Role.TEAM_LEAD, Role.EMPLOYEE],
  async (req: NextRequest, user: UserPayload) => {
    const keyResultId = extractIdFromPath(req.nextUrl.pathname);
    if (!keyResultId) {
      return NextResponse.json(
        { error: "Missing key result ID" },
        { status: 400 }
      );
    }

    const auth = await authorizeKeyResult(keyResultId, user);
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.status === 404 ? "Not found" : "Forbidden" },
        { status: auth.status }
      );
    }

    const { text } = await req.json();
    const { data, error } = await supabase
      .from("comments")
      .insert([{ key_result_id: keyResultId, user_id: user.id, text }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(data, { status: 201 });
  }
);
