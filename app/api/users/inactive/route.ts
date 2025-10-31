import { UserPayload } from "../../types/auth/authTypes";
import { Role } from "../../types/auth/roles";
import { requireAuth } from "../../utils/authGuard";
import supabase from "../../utils/db";

export const GET = requireAuth(
  [Role.ORG_ADMIN],
  async (req, user: UserPayload) => {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, role, last_login")
      .eq("organization_id", user.organization_id)
      .neq("is_deleted", true)
      .gt("last_login", "1970-01-01") // avoid nulls
      .lte("last_login", since.toISOString());

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
      });
    }

    return new Response(JSON.stringify(data), { status: 200 });
  }
);
