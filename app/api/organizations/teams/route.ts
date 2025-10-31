import { requireAuth } from "@/app/api/utils/authGuard";
import supabase from "@/app/api/utils/db";
import { UserPayload } from "@/app/api/types/auth/authTypes";
import { Role } from "../../types/auth/roles";

export const GET = requireAuth(
  [Role.ORG_ADMIN],
  async (_, user: UserPayload) => {
    const { data, error } = await supabase
      .from("teams")
      .select("*")
      .eq("organization_id", user.organization_id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
      });
    }

    return new Response(JSON.stringify({ teams: data }), { status: 200 });
  }
);
