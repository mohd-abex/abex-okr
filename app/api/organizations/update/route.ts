import { requireAuth } from "@/app/api/utils/authGuard";
import supabase from "@/app/api/utils/db";
import { UserPayload } from "@/app/api/types/auth/authTypes";
import { Role } from "../../types/auth/roles";

export const PUT = requireAuth(
  [Role.ORG_ADMIN],
  async (req, user: UserPayload) => {
    const body = await req.json();
    const { name } = body;

    const { data, error } = await supabase
      .from("organizations")
      .update({ name })
      .eq("created_by", user.id)
      .select();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
      });
    }

    return new Response(JSON.stringify({ updated: data }), { status: 200 });
  }
);
