export interface UserPayload {
  id: string;
  email: string;
  role: "admin" | "team_lead" | "employee";
  user_role?: "admin" | "team_lead" | "employee";
  organization_id?: string;
  team_id?: string;
}
