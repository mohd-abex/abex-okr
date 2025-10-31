// File: /api/objectives/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/api/utils/authGuard";
import supabase from "@/app/api/utils/db";
import { UserPayload } from "@/app/api/types/auth/authTypes";
import { Role } from "@/app/api/types/auth/roles";

// Helper to load objective and its team
async function loadObjective(id: string) {
  return supabase
    .from("objectives")
    .select("*, team:team_id(id,name, organization_id)")
    .eq("id", id)
    .single();
}

// Utility to extract the last path segment as ID
function extractIdFromPath(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  return segments.length ? segments[segments.length - 1] : null;
}

// GET by ID
export const GET = requireAuth(
  [Role.ORG_ADMIN, Role.TEAM_LEAD, Role.EMPLOYEE],
  async (req: NextRequest, user: UserPayload) => {
    const id = extractIdFromPath(req.nextUrl.pathname);
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const { data: obj, error } = await loadObjective(id);
    if (error || !obj) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Org admin always OK within their org
    if (
      user.role !== Role.ORG_ADMIN &&
      obj.team.organization_id !== user.organization_id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Team leads & employees limited to their team
    if (
      (user.role === Role.TEAM_LEAD || user.role === Role.EMPLOYEE) &&
      obj.team_id !== user.team_id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(obj, { status: 200 });
  }
);

// PUT update
export const PUT = requireAuth(
  [Role.ORG_ADMIN, Role.TEAM_LEAD],
  async (req: NextRequest, user: UserPayload) => {
    const id = extractIdFromPath(req.nextUrl.pathname);
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const updates = await req.json();
    const { data: obj, error: loadErr } = await loadObjective(id);
    if (loadErr || !obj) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Org‐scope check
    if (
      user.role !== Role.ORG_ADMIN &&
      obj.team.organization_id !== user.organization_id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Team lead only their team
    if (user.role === Role.TEAM_LEAD && obj.team_id !== user.team_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("objectives")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(data, { status: 200 });
  }
);

// DELETE
export const DELETE = requireAuth(
  [Role.ORG_ADMIN],
  async (req: NextRequest, user: UserPayload) => {
    const id = extractIdFromPath(req.nextUrl.pathname);
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const { data: obj, error: loadErr } = await loadObjective(id);
    if (loadErr || !obj) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    // Only org admin may delete across org
    if (obj.team.organization_id !== user.organization_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase.from("objectives").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  }
);
