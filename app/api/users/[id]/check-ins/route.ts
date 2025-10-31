import { requireAuth } from "@/app/api/utils/authGuard";
import supabase from "@/app/api/utils/db";
import { Role } from "@/app/api/types/auth/roles";
import { NextResponse } from "next/server";

export const GET = requireAuth(
  [Role.EMPLOYEE, Role.TEAM_LEAD, Role.ORG_ADMIN],
  async (req, user) => {
    const userIdParam = req.nextUrl.pathname.split("/")[3]; // users/[id]/check-ins

    // Access control: only admin can access any user's check-ins
    // others can only access their own
    if (
      user.role !== Role.ORG_ADMIN &&
      user.id.toString() !== userIdParam.toString()
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("check_ins")
      .select("*")
      .eq("user_id", userIdParam);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  }
);
