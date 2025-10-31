// File: /app/api/dashboard/admin/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/api/utils/authGuard";
import supabase from "@/app/api/utils/db";
import { UserPayload } from "@/app/api/types/auth/authTypes";
import { Role } from "@/app/api/types/auth/roles";

function extractIdFromPath(
  pathname: string,
  positionFromEnd: number = 1
): string | null {
  const segments = pathname.split("/").filter(Boolean);
  const idx = segments.length - positionFromEnd;
  return idx >= 0 ? segments[idx] : null;
}

export const GET = requireAuth(
  [Role.ORG_ADMIN],
  async (req: NextRequest, user: UserPayload) => {
    const organization_id = extractIdFromPath(req.nextUrl.pathname);
    const today = new Date().toISOString().slice(0, 10);

    // 1. Fetch all team IDs in this org
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id")
      .eq("organization_id", organization_id);
    if (teamsError) {
      return NextResponse.json({ error: teamsError.message }, { status: 500 });
    }
    const teamIds = teams.map((t) => t.id);

    // 2. Total Teams
    const totalTeams = teamIds.length;

    // 3. Active OKRs (objectives whose date range includes today)
    const { count: activeOkrsCount, error: activeError } = await supabase
      .from("objectives")
      .select("id", { count: "exact", head: true })
      .in("team_id", teamIds)
      .lte("start_date", today)
      .gte("end_date", today);
    if (activeError) {
      return NextResponse.json({ error: activeError.message }, { status: 500 });
    }

    // 4. Average Completion (avg of objectives.progress)
    const { data: avgData, error: avgError } = await supabase
      .from("objectives")
      .select("progress", { count: "exact" })
      .in("team_id", teamIds);
    if (avgError) {
      return NextResponse.json({ error: avgError.message }, { status: 500 });
    }
    const allProgress = (avgData ?? []).map((o) => o.progress ?? 0);
    const avgCompletion =
      allProgress.length > 0
        ? Math.round(
            allProgress.reduce((sum, p) => sum + p, 0) / allProgress.length
          )
        : 0;

    // 5. At Risk OKRs (objectives with status = 'at_risk')
    const { count: atRiskCount, error: riskError } = await supabase
      .from("objectives")
      .select("id", { count: "exact", head: true })
      .in("team_id", teamIds)
      .eq("status", "at_risk");
    if (riskError) {
      return NextResponse.json({ error: riskError.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        totalTeams,
        activeOkrs: activeOkrsCount,
        avgCompletion, // as a percentage
        atRiskOkrs: atRiskCount,
      },
      { status: 200 }
    );
  }
);
