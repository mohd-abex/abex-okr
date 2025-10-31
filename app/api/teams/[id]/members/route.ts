// File: /app/api/teams/[team_id]/members/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/api/utils/authGuard";
import supabase from "@/app/api/utils/db";
import { Role } from "@/app/api/types/auth/roles";
import { UserPayload } from "@/app/api/types/auth/authTypes";

export const GET = requireAuth(
  [Role.TEAM_LEAD, Role.EMPLOYEE, Role.ORG_ADMIN],
  async (req: NextRequest, user: UserPayload) => {
    // 1. Extract team_id from the path
    const segments = req.nextUrl.pathname.split("/").filter(Boolean);
    // ['api','teams','[team_id]','members']
    const teamId = segments[2];
    if (!teamId) {
      return NextResponse.json({ error: "Missing team_id" }, { status: 400 });
    }
    // 2. Ensure this team_lead is actually lead of this team
    if (user.team_id !== teamId && user.role != "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Fetch users + their KRs
    const { data: users, error } = await supabase
      .from("users")
      .select(
        `
        id,
        name,
        title,
        last_login,
        team:team_id(id,name),
        key_results: key_results!fk_key_results_assigned_to (
          id,
          current_value,
          target_value,
          status
        )
      `
      )
      .eq("team_id", teamId)
      .neq("is_deleted", true);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 4. Format each member
    const members = users.map((u: any) => {
      const krList = u.key_results || [];
      const okrs = krList.length;
      const progress = okrs
        ? Math.round(
            krList.reduce((sum: number, kr: any) => {
              const pct =
                kr.target_value > 0
                  ? (kr.current_value / kr.target_value) * 100
                  : 0;
              return sum + pct;
            }, 0) / okrs
          )
        : 0;

      // pick worst status: overdue > at_risk > on_track > ahead > completed
      const statusPriority = [
        "overdue",
        "at_risk",
        "on_track",
        "ahead",
        "completed",
      ];
      const status =
        krList
          .map((kr: any) => kr.status)
          .sort((a: string, b: string) => {
            return statusPriority.indexOf(a) - statusPriority.indexOf(b);
          })[0] || "on_track";

      // last active humanized (simplest)
      const lastActive = (() => {
        if (!u.last_login) return null;
        const diff = Date.now() - new Date(u.last_login).getTime();
        const hrs = Math.floor(diff / 36e5);
        if (hrs < 1) return "Just now";
        if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
        const days = Math.floor(hrs / 24);
        return `${days} day${days > 1 ? "s" : ""} ago`;
      })();
      return {
        id: u.id,
        member: { name: u.name, title: u.title },
        team: u.team,
        okrs,
        progress, // %
        status, // on_track, at_risk, etc.
        last_active: lastActive,
      };
    });

    return NextResponse.json(members, { status: 200 });
  }
);
