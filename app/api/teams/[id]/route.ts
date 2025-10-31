// /api/teams/[id]/route.ts
import { requireAuth } from "@/app/api/utils/authGuard";
import supabase from "@/app/api/utils/db";
import { UserPayload } from "@/app/api/types/auth/authTypes";
import { Role } from "../../types/auth/roles";

// GET single team
export const GET = requireAuth(
  [Role.ORG_ADMIN, Role.TEAM_LEAD, Role.EMPLOYEE],
  async (req, user: UserPayload) => {
    const id = req.url.split("/teams/")[1];

    const { data, error } = await supabase
      .from("teams")
      .select("*")
      .eq("id", id)
      .eq("organization_id", user.organization_id)
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 404,
      });
    }

    return new Response(JSON.stringify(data), { status: 200 });
  }
);

// Update a team
export const PUT = requireAuth(
  [Role.ORG_ADMIN],
  async (req, user: UserPayload) => {
    const id = req.url.split("/teams/")[1];
    const body = await req.json();
    const { name, lead_id } = body;

    const { data, error } = await supabase
      .from("teams")
      .update({ name, lead_id })
      .eq("id", id)
      .eq("organization_id", user.organization_id)
      .select();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
      });
    }

    return new Response(JSON.stringify(data[0]), { status: 200 });
  }
);

// Delete (hard delete)
export const DELETE = requireAuth(
  [Role.ORG_ADMIN],
  async (req, user: UserPayload) => {
    const id = req.url.split("/teams/")[1];

    const { error } = await supabase
      .from("teams")
      .delete()
      .eq("id", id)
      .eq("organization_id", user.organization_id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
      });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }
);
