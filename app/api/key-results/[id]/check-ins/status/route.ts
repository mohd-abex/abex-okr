import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/api/utils/authGuard";
import supabase from "@/app/api/utils/db";
import { Role } from "@/app/api/types/auth/roles";
import { CheckInStatus } from "@/app/api/types/checkins/types";
import { UserPayload } from "@/app/api/types/auth/authTypes";

export const PATCH = requireAuth(
  [Role.ORG_ADMIN, Role.TEAM_LEAD],
  async (_req: NextRequest, user: UserPayload) => {
    const keyResultId = _req.nextUrl.pathname.split("/")[3];
    const { checkInId, status } = await _req.json();

    if (![CheckInStatus.APPROVED, CheckInStatus.REJECTED].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Get the check-in and its associated key result
    const { data: checkIn, error: fetchError } = await supabase
      .from("check_ins")
      .select("*")
      .eq("id", checkInId)
      .eq("key_result_id", keyResultId)
      .single();

    if (fetchError || !checkIn) {
      return NextResponse.json(
        { error: "Check-in not found" },
        { status: 404 }
      );
    }

    // Get the user assigned to the key result
    const { data: krData, error: krError } = await supabase
      .from("key_results")
      .select("assigned_to")
      .eq("id", keyResultId)
      .single();

    if (krError || !krData) {
      return NextResponse.json(
        { error: "Key result not found" },
        { status: 404 }
      );
    }

    const assignedUserId = krData.assigned_to;

    // Fetch the assigned user's team_id
    const { data: assignedUser, error: userError } = await supabase
      .from("users")
      .select("team_id")
      .eq("id", assignedUserId)
      .single();

    if (userError || !assignedUser) {
      return NextResponse.json(
        { error: "Assigned user not found" },
        { status: 404 }
      );
    }
    console.log(user.team_id);
    // Allow org_admin OR team_lead of same team
    if (user.role === Role.TEAM_LEAD && user.team_id !== assignedUser.team_id) {
      return NextResponse.json(
        { error: "Not authorized to approve/reject this check-in." },
        { status: 403 }
      );
    }

    // Update the check-in status
    const { error: updateError } = await supabase
      .from("check_ins")
      .update({ status })
      .eq("id", checkInId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // If approved, update the key-result progress
    if (status === CheckInStatus.APPROVED) {
      const { error: krUpdateError } = await supabase
        .from("key_results")
        .update({ current_value: checkIn.progress_value })
        .eq("id", keyResultId);

      if (krUpdateError) {
        return NextResponse.json(
          { error: krUpdateError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { message: "Check-in updated successfully." },
      { status: 200 }
    );
  }
);
