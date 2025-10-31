import { requireAuth } from "@/app/api/utils/authGuard";
import supabase from "@/app/api/utils/db";
import { NextResponse } from "next/server";
import { UserPayload } from "../types/auth/authTypes";
import { Role } from "../types/auth/roles";

// GET: fetch all notifications for current user
export const GET = requireAuth(
  [Role.ORG_ADMIN, Role.EMPLOYEE, Role.TEAM_LEAD],
  async (_req, user: UserPayload) => {
    const { data, error } = await supabase
      .from("notifications")
      .select(
        "id,title,message,is_read, created_at, type, user:user_id(name, role)"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  }
);

// POST: create a new notification
export const POST = requireAuth(
  [Role.ORG_ADMIN, Role.EMPLOYEE, Role.TEAM_LEAD, "system"],
  async (req) => {
    const payload = await req.json();

    const { title, message, type, target } = payload;

    if (!target || !target.type || !target.ids?.length) {
      return NextResponse.json(
        { error: "Invalid target object" },
        { status: 400 }
      );
    }

    let usersToNotify: string[] = [];

    if (target.type === "user") {
      usersToNotify = target.ids;
    } else if (target.type === "team") {
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .in("team_id", target.ids)
        .eq("is_deleted", false);

      if (error)
        return NextResponse.json({ error: error.message }, { status: 400 });

      usersToNotify = data.map((u) => u.id);
    } else if (target.type === "organization") {
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .in("organization_id", target.ids)
        .eq("is_deleted", false);

      if (error)
        return NextResponse.json({ error: error.message }, { status: 400 });

      usersToNotify = data.map((u) => u.id);
    } else {
      return NextResponse.json(
        { error: "Invalid target type" },
        { status: 400 }
      );
    }

    // Remove duplicates
    usersToNotify = [...new Set(usersToNotify)];

    // Create notification entries
    const notifications = usersToNotify.map((user_id) => ({
      user_id,
      title,
      message,
      type,
      is_read: false,
    }));

    const { error: insertError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({
      message: `Sent to ${usersToNotify.length} user(s)`,
    });
  }
);
