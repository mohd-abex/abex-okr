import supabase from "@/app/api/utils/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { signToken } from "@/app/api/utils/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  // Find user
  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (!user || error) {
    return NextResponse.json(
      { error: "Invalid or existing credentials" },
      { status: 401 }
    );
  }

  // Validate password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return NextResponse.json({ error: "Invalid Password!" }, { status: 401 });
  }

  // Update last login
  await supabase
    .from("users")
    .update({ last_login: new Date().toISOString() })
    .eq("id", user.id)
    .neq("is_deleted", true);

  // Your normal app token (unchanged)
  const token = signToken({
    name: user.name,
    email: user.email,
    role: user.role, // your app roles
    id: user.id,
    organization_id: user.organization_id,
    team_id: user.team_id,
  });

  // Supabase-compatible token (role must be "authenticated" for RLS)
  const supabaseToken = signToken({
    sub: user.id,
    aud: "authenticated",
    role: "authenticated", // required by Supabase
    app_role: user.role, // still include your actual role if needed in RLS
  });

  return NextResponse.json({ token, supabaseToken }, { status: 200 });
}
