// File: /api/objectives/[id]/key-results/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/api/utils/authGuard";
import supabase from "@/app/api/utils/db";
import { UserPayload } from "@/app/api/types/auth/authTypes";
import { Role } from "@/app/api/types/auth/roles";

// Utility to extract the last path segment (the objective ID)
function extractIdFromPath(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  return segments.length ? segments[segments.length - 2] : null;
}

// Helper to load an objective along with its team/org for permission checks
async function loadObjectiveWithTeam(id: string) {
  const { data: obj, error: objErr } = await supabase
    .from("objectives")
    .select("id, team_id")
    .eq("id", id)
    .single();
  if (objErr || !obj) return { obj: null, team: null, error: objErr };

  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .select("id, organization_id")
    .eq("id", obj.team_id)
    .single();
  if (teamErr || !team) return { obj, team: null, error: teamErr };

  return { obj, team, error: null };
}

// GET /api/objectives/[id]/key-results
export const GET = requireAuth(
  [Role.ORG_ADMIN, Role.TEAM_LEAD, Role.EMPLOYEE],
  async (req: NextRequest, user: UserPayload) => {
    // 1. Extract the objective ID from the path
    const objectiveId = extractIdFromPath(req.nextUrl.pathname);
    if (!objectiveId) {
      return NextResponse.json(
        { error: "Missing objective ID" },
        { status: 400 }
      );
    }

    // 2. Load the objective & its team/org
    const {
      obj,
      team,
      error: loadErr,
    } = await loadObjectiveWithTeam(objectiveId);
    if (loadErr || !obj || !team) {
      return NextResponse.json(
        { error: "Objective not found" },
        { status: 404 }
      );
    }

    // 3. Org‐level check
    if (team.organization_id !== user.organization_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 4. Team‐level check for non‐admins
    if (
      (user.role === Role.TEAM_LEAD || user.role === Role.EMPLOYEE) &&
      obj.team_id !== user.team_id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 5. Fetch the Key Results for that Objective
    const { data: keyResults, error } = await supabase
      .from("key_results")
      .select(
        `id,
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
      .eq("objective_id", objectiveId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(keyResults, { status: 200 });
  }
);
