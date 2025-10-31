import { requireAuth } from "@/app/api/utils/authGuard";
import supabase from "@/app/api/utils/db";
import { UserPayload } from "@/app/api/types/auth/authTypes";
import { Role } from "../../types/auth/roles";

export const GET = requireAuth(
  [Role.ORG_ADMIN],
  async (req, user: UserPayload) => {
    // 1. Total Teams
    const { data: teams, error: teamErr } = await supabase
      .from("teams")
      .select("id")
      .eq("organization_id", user.organization_id);

    if (teamErr) {
      return new Response(JSON.stringify({ error: teamErr.message }), {
        status: 500,
      });
    }

    const teamIds = teams.map((team) => team.id);

    // 2. Active OKRs (we assume all objectives linked to current teams are active)
    const { data: okrs, error: okrsErr } = await supabase
      .from("objectives")
      .select("progress")
      .in("team_id", teamIds);

    if (okrsErr) {
      return new Response(JSON.stringify({ error: okrsErr.message }), {
        status: 500,
      });
    }

    const activeOKRs = okrs.length;

    // 3. At-Risk OKRs (less than 70% progress)
    const atRiskOKRs = okrs.filter((o) => o.progress < 70).length;

    // 4. Average Completion
    const avgCompletion =
      okrs.length > 0
        ? Math.round(
            (okrs.reduce((sum, obj) => sum + obj.progress, 0) / okrs.length) *
              100
          ) / 100
        : 0;

    return new Response(
      JSON.stringify({
        totalTeams: teamIds.length,
        activeOKRs,
        atRiskOKRs,
        avgCompletion,
      }),
      { status: 200 }
    );
  }
);
