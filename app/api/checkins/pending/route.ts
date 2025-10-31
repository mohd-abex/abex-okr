// File: /app/api/check-ins/pending/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/api/utils/authGuard";
import supabase from "@/app/api/utils/db";
import { Role } from "@/app/api/types/auth/roles";
import { UserPayload } from "@/app/api/types/auth/authTypes";

export interface PendingCheckIn {
  id: string;
  key_result: { id: string; title: string; target_value: number }[];
  user: { id: string; name: string }[];
  progress_value: number;
  comment: string | null;
  check_in_date: string;
  created_at: string;
}

export const GET = requireAuth(
  [Role.TEAM_LEAD],
  async (_req: NextRequest, user: UserPayload) => {
    const teamId = user.team_id;
    if (!teamId) {
      return NextResponse.json({ error: "No team assigned" }, { status: 400 });
    }

    // 1) Get objective IDs for this team
    const { data: objectives, error: objErr } = await supabase
      .from("objectives")
      .select("id")
      .eq("team_id", teamId);
    if (objErr) {
      return NextResponse.json({ error: objErr.message }, { status: 500 });
    }
    const objectiveIds = objectives?.map((o) => o.id) || [];
    if (objectiveIds.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // 2) Get KR IDs for those objectives
    const { data: krs, error: krErr } = await supabase
      .from("key_results")
      .select("id")
      .in("objective_id", objectiveIds);
    if (krErr) {
      return NextResponse.json({ error: krErr.message }, { status: 500 });
    }
    const krIds = krs?.map((kr) => kr.id) || [];
    if (krIds.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // 3) Fetch pending check-ins
    const { data, error } = await supabase
      .from("check_ins")
      .select(
        `id,
         key_result:key_result_id(id,title,target_value),
         user:user_id(id,name),
         progress_value,
         comment,
         check_in_date,
         created_at`
      )
      .in("key_result_id", krIds)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Type-safe cast
    const pending: PendingCheckIn[] = data ?? [];
    return NextResponse.json(pending, { status: 200 });
  }
);
