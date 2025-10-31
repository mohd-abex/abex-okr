"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Users,
  Target,
  TrendingUp,
  Clock,
  UserCheck,
  LucideIcon,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { StatCard } from "./stat-card";

/* ---------- types ---------- */
type QuickInsights = {
  teamMembers: number;
  teamOkrs: { total: number; completed: number };
  teamProgress: number;
  pendingReviews: number;
};

type MemberInsight = {
  id: string;
  member: { name: string; title?: string | null };
  team: string;
  okrs: number;
  progress: number;
  status: string;
  last_login?: string | null;
};

/**
 * shape returned by `/api/checkins/pending`
 */
type PendingCheckinAPI = {
  id: string;
  progress_value: number;
  comment?: string | null;
  check_in_date?: string | null;
  created_at?: string | null;
  key_result: {
    id: string;
    title?: string | null;
    target_value: number;
  };
  user: {
    id: string;
    name?: string | null;
  };
};

/**
 * shape used by the UI after minimal normalization
 */
type PendingForUI = {
  id: string;
  key_result_id?: string;
  key_result_title?: string;
  target_value: number;
  user_id?: string;
  memberName: string;
  progress_value: number;
  comment?: string | null;
  check_in_date?: string | null;
  created_at?: string | null;
};

/* ---------- component ---------- */
export function TeamLeadDashboard() {
  const { user } = useAuth();
  const teamId = user?.team_id;

  const [quick, setQuick] = useState<QuickInsights | null>(null);
  const [members, setMembers] = useState<MemberInsight[]>([]);
  const [pending, setPending] = useState<PendingCheckinAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
    {}
  );
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const { toast } = useToast();

  const fetchQuick = useCallback(async () => {
    if (!teamId) return;
    try {
      const res = await fetch(`/api/dashboard/team-lead/${teamId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to fetch quick insights");
      const data = await res.json();
      setQuick(data);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to fetch quick insights!",
        variant: "destructive",
      });
    }
  }, [teamId, token, toast]);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard/team-lead/insights`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to fetch members insights");
      const data = await res.json();
      setMembers(data);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to fetch member insights!",
        variant: "destructive",
      });
    }
  }, [token, toast]);

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch(`/api/checkins/pending`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to fetch pending check-ins");
      const data: PendingCheckinAPI[] = await res.json();
      setPending(data);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to fetch pending check-ins",
        variant: "destructive",
      });
    }
  }, [token, toast]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.allSettled([fetchQuick(), fetchMembers(), fetchPending()]);
    setLoading(false);
  }, [fetchQuick, fetchMembers, fetchPending]);

  useEffect(() => {
    if (!teamId) return;
    fetchAll();
  }, [teamId, fetchAll]);

  const statusLabel = (s?: string) => {
    if (!s) return "Unknown";
    switch (s.toLowerCase()) {
      case "ahead":
        return "Ahead";
      case "on_track":
      case "on track":
        return "On Track";
      case "at_risk":
      case "at risk":
        return "At Risk";
      case "behind":
        return "Behind";
      default:
        return s;
    }
  };

  const handleCheckinAction = async (
    keyResultId: string,
    checkInId: string,
    status: "approved" | "rejected"
  ) => {
    if (!keyResultId || !checkInId) return;
    setActionLoading((p) => ({ ...p, [checkInId]: true }));
    try {
      const res = await fetch(
        `/api/key-results/${keyResultId}/check-ins/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ status, checkInId }),
        }
      );
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to update check-in status");
      }
      // refresh relevant data
      await Promise.all([fetchPending(), fetchQuick(), fetchMembers()]);
    } catch (err) {
      console.error("Action failed:", err);
      toast({
        title: "Error",
        description: "Failed to update check-in status",
        variant: "destructive",
      });
    } finally {
      setActionLoading((p) => ({ ...p, [checkInId]: false }));
    }
  };

  // Normalize pending for UI usage. We derive memberName and the KR title/id from the API result.
  const pendingForUI: PendingForUI[] = pending.map((p) => ({
    id: p.id,
    key_result_id: p.key_result?.id,
    key_result_title: p.key_result?.title ?? undefined,
    target_value: p.key_result?.target_value ?? null,
    user_id: p.user?.id,
    memberName: p.user?.name ?? "Unknown",
    progress_value: p.progress_value ?? 0,
    comment: p.comment ?? undefined,
    check_in_date: p.check_in_date ?? undefined,
    created_at: p.created_at ?? undefined,
  }));

  /* ---------- Loading skeleton (styling only) ---------- */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card
              key={i}
              className="rounded-2xl bg-[#FBEAE4] border border-zinc-100 shadow-sm"
            >
              <CardHeader className="flex items-center justify-between pb-2">
                <div className="h-4 bg-zinc-200 rounded w-24 animate-pulse" />
                <div className="h-8 w-8 rounded-lg bg-primary/10 animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-zinc-200 rounded w-20 animate-pulse mb-2" />
                <div className="h-3 bg-zinc-200 rounded w-28 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="rounded-2xl bg-white border border-zinc-100 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-[#FF8A5B]" /> Team Members
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="p-4 bg-zinc-50 rounded animate-pulse h-16"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="rounded-2xl bg-white border border-zinc-100 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#FF8A5B]" /> Pending Approvals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-20 bg-zinc-50 rounded animate-pulse"
                  />
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Metrics data for visual cards (render using StatCard) ---------- */
  const metrics = [
    {
      title: "Team Members",
      value: quick?.teamMembers ?? 0,
      icon: Users,
      change: undefined,
    },
    {
      title: "Team OKRs",
      value: quick?.teamOkrs?.total ?? 0,
      icon: Target,
      change: quick ? `${quick.teamOkrs.completed} completed` : undefined,
    },
    {
      title: "Team Progress",
      value: `${quick?.teamProgress ?? 0}%`,
      icon: TrendingUp,
      change: undefined,
    },
    {
      title: "Pending Reviews",
      value: quick?.pendingReviews ?? 0,
      icon: Clock,
      change: undefined,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        {metrics.map((m, idx) => (
          <StatCard
            key={idx}
            title={m.title}
            value={m.value}
            icon={m.icon as unknown as LucideIcon}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Members Performance */}
        <div className="lg:col-span-2">
          <Card className="rounded-2xl bg-white border border-zinc-200 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-zinc-900">
                <UserCheck className="h-5 w-5 text-[#FF8A5B]" />
                Team Members Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table className="rounded-xl">
                <TableHeader className="bg-gray-100">
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>OKRs</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.length > 0 ? (
                    members.map((m) => (
                      <TableRow key={m.id} className="hover:bg-zinc-50">
                        <TableCell>
                          <div>
                            <p className="font-medium text-zinc-900">
                              {m.member?.name}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {m.member?.title ?? m.team}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-zinc-900">
                          {m.okrs}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="rounded-full bg-[#FFE7DF] w-36 h-2 overflow-hidden">
                              <div
                                className="h-2 bg-[#FF8A5B] rounded-full"
                                style={{ width: `${m.progress}%` }}
                              />
                            </div>
                            <span className="text-sm">{m.progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const key = (m.status || "").toLowerCase();
                            const map: Record<string, string> = {
                              ahead: "bg-blue-500 text-white",
                              on_track: "bg-[#FF8A5B] text-white",
                              "on track": "bg-[#FF8A5B] text-white",
                              at_risk: "bg-amber-400 text-white",
                              behind: "bg-rose-500 text-white",
                              overdue: "bg-rose-500 text-white",
                              completed: "bg-emerald-500 text-white",
                            };
                            return (
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                                  map[key] || "bg-zinc-200 text-zinc-700"
                                )}
                              >
                                {statusLabel(m.status)}
                              </span>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-sm text-zinc-500">
                          {m.last_login
                            ? new Date(m.last_login).toLocaleString()
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-sm text-zinc-500">
                        No member data
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Pending Approvals */}
        <div>
          <Card className="rounded-2xl bg-white border border-zinc-200 shadow-md min-h-full max-h-full overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-zinc-900">
                <Clock className="h-5 w-5 text-[#FF8A5B]" />
                Pending Approvals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingForUI.length > 0 ? (
                pendingForUI.map((p) => (
                  <div
                    key={p.id}
                    className="space-y-2 border-b last:border-b-0 pb-4 last:pb-0"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-zinc-900">
                          {p.memberName}
                        </p>
                        <p className="text-xs text-zinc-500">
                          KR: {p.key_result_title ?? p.key_result_id ?? "—"}
                        </p>
                      </div>
                      <div className="text-xs text-zinc-500">
                        {p.check_in_date ?? p.created_at
                          ? new Date(
                              p.check_in_date ?? p.created_at!
                            ).toLocaleString()
                          : ""}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="rounded-full bg-[#FFE7DF] w-36 h-2 overflow-hidden">
                          <div
                            className="h-2 bg-[#FF8A5B] rounded-full"
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(
                                  100,
                                  Number(
                                    Math.floor(
                                      (p.progress_value * 100) / p.target_value
                                    )
                                  )
                                )
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs">
                          {Math.floor(
                            (p.progress_value * 100) / p.target_value
                          )}
                          %
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-[#FF8A5B] text-white hover:opacity-95"
                          type="button"
                          onClick={() =>
                            handleCheckinAction(
                              p.key_result_id ?? "",
                              p.id,
                              "approved"
                            )
                          }
                          disabled={!!actionLoading[p.id]}
                        >
                          {actionLoading[p.id] ? "..." : "Approve"}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          type="button"
                          onClick={() =>
                            handleCheckinAction(
                              p.key_result_id ?? "",
                              p.id,
                              "rejected"
                            )
                          }
                          disabled={!!actionLoading[p.id]}
                        >
                          {actionLoading[p.id] ? "..." : "Reject"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-zinc-500">
                  No pending check-ins
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
