// File: /api/key-results/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/api/utils/authGuard";
import supabase from "@/app/api/utils/db";
import { UserPayload } from "@/app/api/types/auth/authTypes";
import { Role } from "@/app/api/types/auth/roles";

// Utility to extract dynamic ID from path
function extractIdFromPath(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  return segments.length ? segments[segments.length - 1] : null;
}

// Helper to load a key result and its objective→team
async function loadKeyResultWithTeam(id: string) {
  // load KR
  const { data: kr, error: krErr } = await supabase
    .from("key_results")
    .select("*, objective:objective_id(team_id)")
    .eq("id", id)
    .single();
  if (krErr || !kr) return { kr: null, team: null, error: krErr };

  // load team for org scope
  const { data: team, error: tErr } = await supabase
    .from("teams")
    .select("id, organization_id")
    .eq("id", kr.objective.team_id)
    .single();
  if (tErr || !team) return { kr, team: null, error: tErr };

  return { kr, team, error: null };
}

// GET by ID
export const GET = requireAuth(
  [Role.ORG_ADMIN, Role.TEAM_LEAD, Role.EMPLOYEE],
  async (req: NextRequest, user: UserPayload) => {
    const id = extractIdFromPath(req.nextUrl.pathname);
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const { kr, team, error } = await loadKeyResultWithTeam(id);
    if (error || !kr || !team) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Org admin access within their org
    if (team.organization_id !== user.organization_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Team lead & employee only same team
    if (
      (user.role === Role.TEAM_LEAD || user.role === Role.EMPLOYEE) &&
      kr.objective.team_id !== user.team_id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(kr, { status: 200 });
  }
);

// PUT update
export const PUT = requireAuth(
  [Role.ORG_ADMIN, Role.TEAM_LEAD],
  async (req: NextRequest, user: UserPayload) => {
    const id = extractIdFromPath(req.nextUrl.pathname);
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    const updates = await req.json();

    const { kr, team, error: loadErr } = await loadKeyResultWithTeam(id);
    if (loadErr || !kr || !team) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Org scope
    if (team.organization_id !== user.organization_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Team lead only their team
    if (user.role === Role.TEAM_LEAD && kr.objective.team_id !== user.team_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("key_results")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(data, { status: 200 });
  }
);

// DELETE (hard delete, only Org Admin)
export const DELETE = requireAuth(
  [Role.ORG_ADMIN],
  async (req: NextRequest, user: UserPayload) => {
    const id = extractIdFromPath(req.nextUrl.pathname);
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const { kr, team, error: loadErr } = await loadKeyResultWithTeam(id);
    if (loadErr || !kr || !team) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Only Org Admin within their org
    if (team.organization_id !== user.organization_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase.from("key_results").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  }
);
