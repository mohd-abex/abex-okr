export interface RawSupabaseTeam {
  id: string;
  name: string;
  description: string | null;
  lead_id: string;
  organization_id: string;

  // team members via users_team_id_fkey
  users: {
    id: string;
    name: string;
    role: string;
    is_deleted: boolean;
  }[];

  // objectives (your OKRs) via fk_objectives_team_id
  objectives: {
    id: string;
    progress: number | null;
    status: string;
  }[];

  // team lead via teams_lead_id_fkey (as array of one or empty)
  team_lead: {
    id: string;
    name: string;
  }[];
}

// Represents each objective row returned in the joined `objectives` array
export interface RawObjective {
  id: string;
  status: string;
}

// Represents each team row returned in your joined query
export interface RawTeam {
  id: string;
  name: string;
  // team lead embedded via teams_lead_id_fkey
  team_lead: {
    id: string;
    name: string;
  } | null;
  // members embedded via users_team_id_fkey
  users: {
    id: string;
  }[];
  // objectives embedded via fk_objectives_team_id
  objectives: RawObjective[];
}
