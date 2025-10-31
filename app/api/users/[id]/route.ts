import { UserPayload } from "../../types/auth/authTypes";
import { Role } from "../../types/auth/roles";
import { requireAuth } from "../../utils/authGuard";
import supabase from "../../utils/db";

export const PUT = requireAuth(
  [Role.ORG_ADMIN, Role.TEAM_LEAD, Role.EMPLOYEE],
  async (req, user: UserPayload) => {
    const userId = req.url.split("/").pop();
    const body = await req.json();
    const { name } = body;
    console.log(user.organization_id);
    const { data, error } = await supabase
      .from("users")
      .update({ name })
      .eq("id", userId)
      .eq("organization_id", user.organization_id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
      });
    }

    return new Response(
      JSON.stringify({ message: "User updated", user: data }),
      { status: 200 }
    );
  }
);

export const DELETE = requireAuth(
  [Role.ORG_ADMIN],
  async (req, user: UserPayload) => {
    const userId = req.url.split("/").pop();

    const { error } = await supabase
      .from("users")
      .update({ is_deleted: true })
      .eq("id", userId)
      .eq("organization_id", user.organization_id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
      });
    }

    return new Response(JSON.stringify({ message: "User soft-deleted" }), {
      status: 200,
    });
  }
);
