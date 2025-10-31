import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface RealtimePostgresPayload<T> {
  schema: string; // e.g., "public"
  table: string; // table name
  commit_timestamp: string; // timestamp of change
  eventType: "INSERT" | "UPDATE" | "DELETE"; // type of change
  new: T | null; // new row (INSERT or UPDATE)
  old: T | null; // old row (UPDATE or DELETE)
}
