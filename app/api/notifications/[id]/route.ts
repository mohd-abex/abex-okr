import { requireAuth } from "@/app/api/utils/authGuard";
import supabase from "@/app/api/utils/db";
import { NextResponse } from "next/server";
import { UserPayload } from "@/app/api/types/auth/authTypes";
import { Role } from "../../types/auth/roles";

// PATCH: update a notification (e.g., mark as read/unread)
export const PATCH = requireAuth(
  [Role.ORG_ADMIN, Role.EMPLOYEE, Role.TEAM_LEAD],
  async (req, user: UserPayload) => {
    const id = req.nextUrl.pathname.split("/").pop();
    const payload = await req.json();

    const { is_read } = payload;
    console.log(is_read);

    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read })
      .eq("id", id)
      .select()
      .single();
    console.log(error);
    if (!data) {
      return NextResponse.json(
        { error: "No notification found." },
        { status: 404 }
      );
    }
    if (error) {
      return NextResponse.json({ error: error?.message }, { status: 400 });
    }

    return NextResponse.json(data);
  }
);

// DELETE: remove a notification (only certain roles)
export const DELETE = requireAuth(
  [Role.ORG_ADMIN, Role.EMPLOYEE, Role.ORG_ADMIN],
  async (req, user: UserPayload) => {
    const id = req.nextUrl.pathname.split("/").pop();

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Notification deleted successfully." });
  }
);
