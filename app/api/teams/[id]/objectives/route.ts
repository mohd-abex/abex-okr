import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/api/utils/authGuard";
import supabase from "@/app/api/utils/db";
import { UserPayload } from "@/app/api/types/auth/authTypes";
import { Role } from "@/app/api/types/auth/roles";

// Helper to load objective and its team
async function loadObjective(id: string) {
  return supabase
    .from("objectives")
    .select("*, team:team_id(id, organization_id)")
    .eq("team_id", id);
}

// Utility to extract the last path segment as ID
function extractIdFromPath(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  return segments.length ? segments[segments.length - 1] : null;
}

// GET by ID
export const GET = requireAuth(
  [Role.ORG_ADMIN],
  async (req: NextRequest, user: UserPayload) => {
    const id = extractIdFromPath(req.nextUrl.pathname);
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const { data: okrs, error } = await loadObjective(id);
    console.log(error);
    if (error || !okrs) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(okrs, { status: 200 });
  }
);
