import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/api/utils/authGuard";
import supabase from "@/app/api/utils/db";
import { Role } from "@/app/api/types/auth/roles";
import { UserPayload } from "@/app/api/types/auth/authTypes";

export const GET = requireAuth(
  [Role.TEAM_LEAD, Role.EMPLOYEE],
  async (_req: NextRequest, user: UserPayload) => {
    // Only employees & team_leads see their own team
    const teamId = user.team_id!;
    if (!teamId) {
      return NextResponse.json({ error: "No team assigned" }, { status: 400 });
    }

    // Fetch all members of this team
    const { data: members, error: memErr } = await supabase
      .from("users")
      .select(
        `
        id,
        name,
        title,
        last_login,
        team:team_id(name),
        key_results: key_results!fk_key_results_assigned_to (
          current_value,
          target_value,
          status
        )
      `
      )
      .eq("team_id", teamId)
      .neq("is_deleted", true);

    if (memErr) {
      return NextResponse.json({ error: memErr.message }, { status: 500 });
    }

    const result: MemberPerformance[] = (members || []).map((u: any) => {
      const krs: KeyResult[] = u.key_results || [];
      const okrsCount = krs.length;

      // average progress across KRs
      const progress =
        okrsCount > 0
          ? Math.round(
              krs.reduce((sum, kr) => {
                const pct = kr.target_value
                  ? (kr.current_value / kr.target_value) * 100
                  : 0;
                return sum + pct;
              }, 0) / okrsCount
            )
          : 0;

      // worst status precedence
      const precedence = [
        "overdue",
        "at_risk",
        "on_track",
        "ahead",
        "completed",
      ];
      const status =
        krs
          .map((kr) => kr.status)
          .sort((a, b) => precedence.indexOf(a) - precedence.indexOf(b))[0] ||
        "on_track";

      return {
        id: u.id,
        member: { name: u.name, title: u.title },
        team: u.team?.name,
        okrs: okrsCount,
        progress,
        status,
        last_login: u.last_login, // ISO string
      };
    });

    return NextResponse.json(result, { status: 200 });
  }
);
