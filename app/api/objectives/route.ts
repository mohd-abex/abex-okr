// File: /api/objectives/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/api/utils/authGuard";
import supabase from "@/app/api/utils/db";
import { UserPayload } from "@/app/api/types/auth/authTypes";
import { Role } from "@/app/api/types/auth/roles";

// GET all objectives
export const GET = requireAuth(
  [Role.ORG_ADMIN, Role.TEAM_LEAD, Role.EMPLOYEE],
  async (_req: NextRequest, user: UserPayload) => {
    // 1. Fetch allowed team IDs
    let teamIds: string[];
    if (user.role === Role.ORG_ADMIN) {
      const { data: teams, error: tError } = await supabase
        .from("teams")
        .select("id")
        .eq("organization_id", user.organization_id);
      if (tError) {
        return NextResponse.json({ error: tError.message }, { status: 500 });
      }
      teamIds = teams.map((t) => t.id);
    } else {
      teamIds = [user.team_id!];
    }

    // 2. Fetch objectives for those teams
    const { data, error } = await supabase
      .from("objectives")
      .select(
        "id, title, description, team:team_id(id,name), start_date, end_date, progress, status, created_at"
      )
      .in("team_id", teamIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data, { status: 200 });
  }
);

// POST create new objective
export const POST = requireAuth(
  [Role.ORG_ADMIN, Role.TEAM_LEAD],
  async (req: NextRequest, user: UserPayload) => {
    const { title, description, team_id, start_date, end_date } =
      await req.json();

    // Verify the team belongs to this org
    const { data: team, error: teamErr } = await supabase
      .from("teams")
      .select("id")
      .eq("id", team_id)
      .eq("organization_id", user.organization_id)
      .single();
    if (teamErr || !team) {
      return NextResponse.json(
        { error: "Team not found in your organization" },
        { status: 404 }
      );
    }

    // If team lead, ensure it's their team
    if (user.role === Role.TEAM_LEAD && team_id !== user.team_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Insert
    const { data, error } = await supabase
      .from("objectives")
      .insert([
        {
          title,
          description,
          team_id,
          start_date,
          end_date,
          created_by: user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(data, { status: 201 });
  }
);
