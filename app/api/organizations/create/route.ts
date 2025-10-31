import { NextResponse } from "next/server";
import { requireAuth } from "@/app/api/utils/authGuard";
import supabase from "@/app/api/utils/db";
import { UserPayload } from "@/app/api/types/auth/authTypes";
import { Role } from "../../types/auth/roles";

export const POST = requireAuth(
  [Role.ORG_ADMIN],
  async (req, user: UserPayload) => {
    try {
      const { name } = await req.json();
      if (!name) {
        return NextResponse.json(
          { error: "Organization name is required" },
          { status: 400 }
        );
      }

      // Step 1: Check if this org_admin already has an organization
      const { data: existingUser, error: userError } = await supabase
        .from("users")
        .select("organization_id")
        .eq("email", user.email)
        .single();

      if (userError) throw userError;

      if (existingUser?.organization_id) {
        return NextResponse.json(
          { error: "Organization already exists for this admin." },
          { status: 400 }
        );
      }

      // Step 2: Create the new organization
      const { data: newOrg, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name,
          created_by: user.id,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Step 3: Update the user with the organization ID
      const { error: updateError } = await supabase
        .from("users")
        .update({ organization_id: newOrg.id })
        .eq("email", user.email);

      if (updateError) throw updateError;

      return NextResponse.json(
        { message: "Organization created successfully", organization: newOrg },
        { status: 201 }
      );
    } catch (err: any) {
      return NextResponse.json(
        { error: err.message || "Internal Server Error" },
        { status: 500 }
      );
    }
  }
);
