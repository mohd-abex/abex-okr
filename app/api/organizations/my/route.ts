// app/api/organizations/my/route.ts
import supabase from "@/app/api/utils/db";
import { UserPayload } from "@/app/api/types/auth/authTypes";
import { Role } from "../../types/auth/roles";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "../../utils/authGuard";

export const GET = requireAuth(
  [Role.ORG_ADMIN, Role.EMPLOYEE, Role.TEAM_LEAD],
  async (req: NextRequest, user: UserPayload) => {
    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("created_by", user.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ organization: data });
  }
);
