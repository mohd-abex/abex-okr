import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAuth } from "@/app/api/utils/authGuard";
import supabase from "@/app/api/utils/db";
import { UserPayload } from "@/app/api/types/auth/authTypes";
import { Role } from "@/app/api/types/auth/roles";

export const POST = requireAuth(
  [Role.ORG_ADMIN],
  async (req: NextRequest, user: UserPayload) => {
    const body = await req.json();
    const { name, email, password, role, team_id } = body;

    // Validate role
    if (![Role.TEAM_LEAD, Role.EMPLOYEE].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role; must be team_lead or employee" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!name || !email || !password || !team_id) {
      return NextResponse.json(
        {
          error: "Missing required fields: name, email, password, team_id",
        },
        { status: 400 }
      );
    }

    // Verify team exists
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id, lead_id")
      .eq("id", team_id)
      .eq("organization_id", user.organization_id)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { error: "Team not found or not in your organization" },
        { status: 404 }
      );
    }

    // If role is team_lead, demote existing lead if they exist
    if (role === Role.TEAM_LEAD && team.lead_id) {
      const { error: demoteError } = await supabase
        .from("users")
        .update({ role: Role.EMPLOYEE })
        .eq("id", team.lead_id)
        .eq("organization_id", user.organization_id);

      if (demoteError) {
        return NextResponse.json(
          {
            error: "Failed to demote existing team lead",
            details: demoteError.message,
          },
          { status: 500 }
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new user
    const { data: newUser, error: userError } = await supabase
      .from("users")
      .insert([
        {
          name,
          email,
          password: hashedPassword,
          role,
          team_id: team.id,
          organization_id: user.organization_id,
        },
      ])
      .select("id, name, email, role, team:team_id(name)")
      .maybeSingle();

    if (userError || !newUser) {
      return NextResponse.json(
        { error: userError?.message || "User creation failed" },
        { status: 500 }
      );
    }

    // If the new user is a TEAM_LEAD, update the team's lead_id
    if (role === Role.TEAM_LEAD) {
      const { error: updateError } = await supabase
        .from("teams")
        .update({ lead_id: newUser.id })
        .eq("id", team_id)
        .eq("organization_id", user.organization_id);

      if (updateError) {
        return NextResponse.json(
          {
            message: "User created but failed to set team lead on team",
            user: newUser,
            error: updateError.message,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(newUser, { status: 201 });
  }
);
