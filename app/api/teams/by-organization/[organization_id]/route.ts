import { RawSupabaseTeam } from "@/app/api/types/teams/type";
import db from "@/app/api/utils/db"; // Supabase client
import { NextRequest, NextResponse } from "next/server";

function extractIdFromPath(
  pathname: string,
  positionFromEnd: number = 1
): string | null {
  const segments = pathname.split("/").filter(Boolean);
  const idx = segments.length - positionFromEnd;
  return idx >= 0 ? segments[idx] : null;
}

export const GET = async (req: NextRequest) => {
  // e.g. /api/teams/by-organization/<org_id>
  const organization_id = extractIdFromPath(req.nextUrl.pathname);

  if (!organization_id) {
    return NextResponse.json(
      { error: "Missing organization_id in path" },
      { status: 400 }
    );
  }

  const { data: teams, error } = await db
    .from("teams")
    .select(
      `
      id,
      name,
      lead_id,
      organization_id,
      users:users!users_team_id_fkey ( id, name, role, is_deleted ),
      objectives:objectives!fk_objectives_team_id (
        id,
        progress,
        status
      ),
      team_lead:users!teams_lead_id_fkey ( id, name )
      `
    )
    .eq("organization_id", organization_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const formatted = (teams as RawSupabaseTeam[]).map((team) => {
    const activeObjs =
      team.objectives?.filter((o) => o.status !== "archived") ?? [];
    const avg =
      activeObjs.length > 0
        ? Math.round(
            activeObjs.reduce((sum, o) => sum + (o.progress ?? 0), 0) /
              activeObjs.length
          )
        : 0;

    const status = avg >= 90 ? "Ahead" : avg >= 70 ? "On Track" : "Behind";

    return {
      id: team.id,
      name: team.name,
      team_lead: team.team_lead ?? null,
      members_count: team.users.map((u) => !u.is_deleted)?.length ?? 0,
      active_okrs_count: activeObjs.length,
      average_progress: avg,
      status,
    };
  });

  return NextResponse.json(formatted);
};
