// File: /app/api/check-ins/pending/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/api/utils/authGuard";
import supabase from "@/app/api/utils/db";
import { Role } from "@/app/api/types/auth/roles";
import { UserPayload } from "@/app/api/types/auth/authTypes";

export interface CheckIn {
  id: string;
  key_result: {
    id: string;
    title: string;
    target_value: number;
  };
  progress_value: number;
  comment: string | null;
  check_in_date: string;
  created_at: string;
}

export const GET = requireAuth(
  [Role.EMPLOYEE],
  async (_req: NextRequest, user: UserPayload) => {
    const { data, error } = await supabase
      .from("check_ins")
      .select(
        "id,key_result:key_result_id(id,title,target_value),progress_value,comment,status, check_in_date, created_at"
      )
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data, { status: 200 });
  }
);
