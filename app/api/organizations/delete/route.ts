import { requireAuth } from "@/app/api/utils/authGuard";
import supabase from "@/app/api/utils/db";
import { UserPayload } from "@/app/api/types/auth/authTypes";
import { Role } from "../../types/auth/roles";

export const DELETE = requireAuth(
  [Role.ORG_ADMIN],
  async (_, user: UserPayload) => {
    const { error } = await supabase
      .from("organizations")
      .delete()
      .eq("created_by", user.id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
      });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }
);
