// File: /app/api/dashboard/team-lead/[team_id]/route.ts
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
  [Role.TEAM_LEAD],
  async (req: NextRequest, user: UserPayload) => {
    const teamId = extractIdFromPath(req.nextUrl.pathname);
    if (!teamId) {
      return NextResponse.json(
        { error: "Missing team_id in path" },
        { status: 400 }
      );
    }
    // Only your own team
    if (user.team_id !== teamId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1) Team Members count
    const { count: membersCount, error: membersErr } = await supabase
      .from("users")
      .select("id", { head: true, count: "exact" })
      .eq("team_id", teamId)
      .eq("is_deleted", false);
    if (membersErr) {
      return NextResponse.json({ error: membersErr.message }, { status: 500 });
    }

    // 2) Team OKRs (objectives)
    const { data: objectives, error: objErr } = await supabase
      .from("objectives")
      .select("progress, status, id")
      .eq("team_id", teamId);
    if (objErr) {
      return NextResponse.json({ error: objErr.message }, { status: 500 });
    }
    const totalOkrs = objectives.length;
    const completedOkrs = objectives.filter(
      (o) => o.status === "completed"
    ).length;

    // 3) Team Progress (avg of objective.progress)
    const progressValues = objectives.map((o) => o.progress ?? 0);
    const avgProgress =
      progressValues.length > 0
        ? Math.round(
            progressValues.reduce((a, b) => a + b, 0) / progressValues.length
          )
        : 0;

    // 4) Pending Reviews (check_ins with status 'pending' for this team's KRs)
    //   a) load KR ids under this team's objectives
    const objIds = objectives.map((o: any) => o.id);
    let pendingReviews = 0;
    if (objIds.length) {
      const { data: krs, error: krErr } = await supabase
        .from("key_results")
        .select("id")
        .in("objective_id", objIds);
      if (krErr) {
        return NextResponse.json({ error: krErr.message }, { status: 500 });
      }
      const krIds = krs.map((kr) => kr.id);

      if (krIds.length) {
        const { count: pendingCount, error: ciErr } = await supabase
          .from("check_ins")
          .select("id", { head: true, count: "exact" })
          .in("key_result_id", krIds)
          .eq("status", "pending");
        if (ciErr) {
          return NextResponse.json({ error: ciErr.message }, { status: 500 });
        }
        pendingReviews = pendingCount!;
      }
    }

    return NextResponse.json(
      {
        teamMembers: membersCount,
        teamOkrs: { total: totalOkrs, completed: completedOkrs },
        teamProgress: avgProgress,
        pendingReviews,
      },
      { status: 200 }
    );
  }
);
