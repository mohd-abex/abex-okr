import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/api/utils/authGuard";
import supabase from "@/app/api/utils/db";
import { Role } from "@/app/api/types/auth/roles";
import { CheckInStatus } from "@/app/api/types/checkins/types";

// GET all check-ins for a key-result
export const GET = requireAuth(
  [Role.EMPLOYEE, Role.TEAM_LEAD, Role.ORG_ADMIN],
  async (_req: NextRequest, user) => {
    const keyResultId = _req.nextUrl.pathname.split("/")[3]; // /key-results/[id]/check-ins

    const { data, error } = await supabase
      .from("check_ins")
      .select("*")
      .eq("key_result_id", keyResultId);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ checkIns: data }, { status: 200 });
  }
);

// POST a new check-in (only if user is assigned to the key-result)
export const POST = requireAuth(
  [Role.EMPLOYEE],
  async (_req: NextRequest, user) => {
    const keyResultId = _req.nextUrl.pathname.split("/")[3];
    const { progress, comment } = await _req.json();

    const { data: keyResult, error: krError } = await supabase
      .from("key_results")
      .select("assigned_to, target_value")
      .eq("id", keyResultId)
      .single();

    if (krError || !keyResult)
      return NextResponse.json(
        { error: "Key Result not found." },
        { status: 404 }
      );

    if (keyResult.assigned_to !== user.id)
      return NextResponse.json(
        { error: "Unauthorized to check-in on this key result." },
        { status: 403 }
      );

    if (progress > keyResult.target_value) {
      return NextResponse.json(
        { error: "Invalid progress value!" },
        { status: 403 }
      );
    }

    const { error } = await supabase.from("check_ins").insert({
      key_result_id: keyResultId,
      user_id: user.id,
      progress_value: progress,
      comment,
      status: CheckInStatus.PENDING,
    });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(
      { message: "Check-in submitted successfully." },
      { status: 201 }
    );
  }
);
