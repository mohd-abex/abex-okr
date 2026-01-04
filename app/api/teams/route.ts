// /api/teams/route.ts
import { requireAuth } from "@/app/api/utils/authGuard";
import supabase from "@/app/api/utils/db";
import { UserPayload } from "@/app/api/types/auth/authTypes";
import { Role } from "../types/auth/roles";

// GET all teams in the organization
export const GET = requireAuth(
  [Role.ORG_ADMIN],
  async (req, user: UserPayload) => {
    const { data, error } = await supabase
      .from("teams")
      .select("id, name, lead_id, created_at")
      .eq("organization_id", user.organization_id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
      });
    }

    return new Response(JSON.stringify(data), { status: 200 });
  }
);

// Create a new team
export const POST = requireAuth(
  [Role.ORG_ADMIN],
  async (req, user: UserPayload) => {
    const body = await req.json();
    const { name, lead_id } = body;

    if (!user.organization_id) {
      return new Response(
        JSON.stringify({ error: "Organization ID is missing" }),
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("teams")
      .insert([
        {
          name,
          lead_id: lead_id || null, // Ensure explicit null if undefined
          organization_id: user.organization_id,
        },
      ])
      .select();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
      });
    }

    return new Response(JSON.stringify(data[0]), { status: 201 });
  }
);
