import supabase from "@/app/api/utils/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { signToken } from "@/app/api/utils/auth";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  const { email, orgName, password, name, role } = await req.json();

  // Check if user exists
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingUser) {
    return NextResponse.json({ error: "User already exists" }, { status: 400 });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  let orgId;
  // If admin, create org
  if (role === "admin") {
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert([
        {
          name: orgName || "",
        },
      ])
      .select("*")
      .maybeSingle();
    orgId = org.id;
    if (orgError) {
      return NextResponse.json({ error: orgError.message }, { status: 500 });
    }
  }

  // Insert user
  const { data: user, error: insertError } = await supabase
    .from("users")
    .insert([
      {
        email,
        password: hashedPassword,
        name,
        organization_id: orgId,
        role: role || "employee",
        last_login: new Date(),
      },
    ])
    .select("*")
    .maybeSingle();
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Updated organization owner info
  const { error: userUpdateError } = await supabase
    .from("organizations")
    .update({ created_by: user.id })
    .eq("id", orgId);

  if (userUpdateError) {
    return NextResponse.json(
      { error: userUpdateError.message },
      { status: 500 }
    );
  }
  // Your normal app token (keeps `role` as is)
  const appToken = signToken({
    name: user.name,
    email: user.email,
    role: user.role, // employee | team_lead | admin
    id: user.id,
    organization_id: user.organization_id,
    team_id: user.team_id,
  });

  // Supabase Realtime token (role must be "authenticated")
  const supabaseToken = signToken({
    sub: user.id,
    aud: "authenticated",
    role: "authenticated", // Supabase requirement
    my_role: user.role, // optionally still pass your role for RLS
  });

  return NextResponse.json(
    {
      token: appToken,
      supabaseToken, // frontend uses this ONLY for Realtime
    },
    { status: 201 }
  );
}
