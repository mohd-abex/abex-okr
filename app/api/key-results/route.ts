// File: /api/key-results/route.ts
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

// GET all key results
export const GET = requireAuth(
  [Role.ORG_ADMIN, Role.TEAM_LEAD, Role.EMPLOYEE],
  async (_req: NextRequest, user: UserPayload) => {
    // 1. Determine valid team IDs
    let teamIds: string[];
    if (user.role === Role.ORG_ADMIN) {
      const { data: teams, error: tErr } = await supabase
        .from("teams")
        .select("id")
        .eq("organization_id", user.organization_id);
      if (tErr)
        return NextResponse.json({ error: tErr.message }, { status: 500 });
      teamIds = teams.map((t) => t.id);
    } else {
      teamIds = [user.team_id!];
    }

    // 2. Fetch objective IDs for those teams
    const { data: objectives, error: objErr } = await supabase
      .from("objectives")
      .select("id")
      .in("team_id", teamIds);
    if (objErr)
      return NextResponse.json({ error: objErr.message }, { status: 500 });
    const objectiveIds = objectives.map((o) => o.id);

    // 3. Fetch key results for those objectives
    const { data, error } = await supabase
      .from("key_results")
      .select(
        `id,
         objective_id,
         title,
         target_value,
         current_value,
         assigned_to,
         units,
         start_date,
         end_date,
         status,
         created_at`
      )
      .in("objective_id", objectiveIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data, { status: 200 });
  }
);

// POST create a new key result
export const POST = requireAuth(
  [Role.ORG_ADMIN, Role.TEAM_LEAD],
  async (req: NextRequest, user: UserPayload) => {
    const {
      objective_id,
      title,
      target_value,
      units,
      start_date,
      end_date,
      assigned_to,
    } = await req.json();

    // 1. Load the objective and its team/org
    const { data: obj, error: loadErr } = await supabase
      .from("objectives")
      .select("team_id")
      .eq("id", objective_id)
      .single();
    if (loadErr || !obj) {
      return NextResponse.json(
        { error: "Objective not found" },
        { status: 404 }
      );
    }

    // 2. Verify org scope via the team
    const { data: team, error: tErr } = await supabase
      .from("teams")
      .select("organization_id")
      .eq("id", obj.team_id)
      .single();
    if (tErr || !team || team.organization_id !== user.organization_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. If Team Lead, ensure objective is in their team
    if (user.role === Role.TEAM_LEAD && obj.team_id !== user.team_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 4. Insert
    const { data, error } = await supabase
      .from("key_results")
      .insert([
        {
          objective_id,
          title,
          target_value,
          units,
          start_date,
          end_date,
          assigned_to,
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(data, { status: 201 });
  }
);
