import jwt from "jsonwebtoken";

export function signToken(payload: object): string {
  return jwt.sign(payload, process.env.NEXT_PUBLIC_JWT_SECRET!, {
    expiresIn: "3d",
  });
}
