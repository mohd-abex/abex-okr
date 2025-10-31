import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/api/utils/authGuard";
import supabase from "@/app/api/utils/db";
import { UserPayload } from "@/app/api/types/auth/authTypes";
import { Role } from "@/app/api/types/auth/roles";

export const GET = requireAuth(
  [Role.EMPLOYEE],
  async (_req: NextRequest, user: UserPayload) => {
    const today = new Date();
    const weekLater = new Date();
    weekLater.setDate(today.getDate() + 7);

    // 1️⃣ Active OKRs: count of KRs not yet 'completed'
    const { count: activeCount, error: activeErr } = await supabase
      .from("key_results")
      .select("id", { head: true, count: "exact" })
      .eq("assigned_to", user.id)
      .neq("status", "completed");
    if (activeErr) {
      return NextResponse.json({ error: activeErr.message }, { status: 500 });
    }

    // 2️⃣ Avg. Progress: average of (current_value/target_value *100)
    const { data: krData, error: krErr } = await supabase
      .from("key_results")
      .select("current_value, target_value, id")
      .eq("assigned_to", user.id);
    if (krErr) {
      return NextResponse.json({ error: krErr.message }, { status: 500 });
    }
    const percentages = krData.map((kr) =>
      kr.target_value ? (kr.current_value / kr.target_value) * 100 : 0
    );
    const avgProgress =
      percentages.length > 0
        ? Math.round(
            percentages.reduce((a, b) => a + b, 0) / percentages.length
          )
        : 0;

    // 3️⃣ Due This Week: KRs whose end_date is between today and weekLater
    const { data: dueData, error: dueErr } = await supabase
      .from("key_results")
      .select("title")
      .eq("assigned_to", user.id)
      .gte("end_date", today.toISOString().slice(0, 10))
      .lte("end_date", weekLater.toISOString().slice(0, 10));
    if (dueErr) {
      return NextResponse.json({ error: dueErr.message }, { status: 500 });
    }
    const dueCount = dueData.length;
    const nextDueTitle = dueData[0]?.title || null;

    // 4️⃣ Comments: count of comments on your KRs in the last 7 days
    const since = new Date();
    since.setDate(since.getDate() - 7);
    // first get your KR IDs
    const yourKrIds = krData.map((kr) => kr.id);
    let commentsCount = 0;
    if (yourKrIds.length) {
      const { count: cCount, error: cErr } = await supabase
        .from("comments")
        .select("id", { head: true, count: "exact" })
        .in("key_result_id", yourKrIds)
        .gte("created_at", since.toISOString());
      if (cErr) {
        return NextResponse.json({ error: cErr.message }, { status: 500 });
      }
      commentsCount = cCount!;
    }

    return NextResponse.json({
      activeOkrs: activeCount,
      avgProgress,
      dueThisWeek: {
        count: dueCount,
        nextTitle: nextDueTitle,
      },
      comments: commentsCount,
    });
  }
);
