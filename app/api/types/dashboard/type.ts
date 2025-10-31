interface KeyResult {
  current_value: number;
  target_value: number;
  status: string;
}

interface MemberPerformance {
  id: string;
  member: { name: string; title: string | null };
  team: string;
  okrs: number;
  progress: number; // percent
  status: string;
  last_login: string;
}
