import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { UserPayload } from "../types/auth/authTypes";

type HandlerFn = (req: NextRequest, user: UserPayload) => Promise<Response>;

export function requireAuth(
  allowedRoles: string[] | string,
  handler: HandlerFn
) {
  return async (req: NextRequest): Promise<Response> => {
    try {
      const rolesArray = Array.isArray(allowedRoles)
        ? allowedRoles
        : [allowedRoles];

      //For system operations, bypass guard(CAN BE CRITICAL!)
      if (rolesArray.includes("system")) {
        return await handler(req, { id: "", email: "", role: "admin" });
      }

      const authHeader = req.headers.get("authorization");

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return NextResponse.json(
          { error: "Missing or invalid token" },
          { status: 401 }
        );
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(
        token,
        process.env.NEXT_PUBLIC_JWT_SECRET!
      ) as UserPayload;

      if (!rolesArray.includes(decoded.role)) {
        return NextResponse.json(
          { error: "Access denied: insufficient permissions" },
          { status: 403 }
        );
      }

      return await handler(req, decoded);
    } catch (err) {
      console.log(err);
      return NextResponse.json(
        { error: "Unauthorized or expired token" },
        { status: 401 }
      );
    }
  };
}
