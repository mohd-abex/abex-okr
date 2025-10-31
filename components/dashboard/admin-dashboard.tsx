"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Target,
  TrendingUp,
  AlertTriangle, // icon change for "At Risk"
  Clock,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { StatCard } from "./stat-card";

interface QuickStats {
  totalTeams: number;
  activeOkrs: number;
  avgCompletion: number;
  atRiskOkrs: number;
}

interface TableStats {
  team: string;
  lead: string;
  members: number;
  completion: number;
  status: string;
}

interface InactiveUser {
  id: string;
  name: string;
  last_login: string;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [tableData, setTableData] = useState<TableStats[] | null>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<InactiveUser[]>([]);
  const { user } = useAuth();
  const token = localStorage.getItem("token");
  const { toast } = useToast();

  useEffect(() => {
    const fetchDashboardQuickData = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `/api/dashboard/admin/${user?.organization_id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        toast({
          title: "Error",
          description: "Failed to fetch dashboard data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardQuickData();
  }, []);

  useEffect(() => {
    const fetchTableData = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`/api/teams/admin/insights`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setTableData(data);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        toast({
          title: "Error",
          description: "Failed to fetch dashboard data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTableData();
  }, []);

  useEffect(() => {
    const fetchInactiveUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`/api/users/inactive`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        toast({
          title: "Error",
          description: "Failed to fetch dashboard data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchInactiveUsers();
  }, []);

  const sendNotification = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/notifications`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        method: "POST",
        body: JSON.stringify({
          title: "Follow Up",
          message: `Hello ${name}, this is to notify you, that you are being inactive for more than 7 days. Kindly be more active on active operations.`,
          type: "follow_up",
          target: { type: "user", ids: [id] },
        }),
      });

      if (!res.ok) {
        toast({
          title: "Error",
          description: "Failed to follow up, there are errors",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "User followed up successfully",
        });
      }
    } catch (error) {
      console.log(error);
      toast({
        title: "Error",
        description: "Failed to follow up, there are errors!",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card
              key={i}
              className="rounded-2xl border border-zinc-100 shadow-sm"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-zinc-200 rounded w-20 animate-pulse" />
                <div className="h-7 w-7 rounded-xl bg-primary/10 animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-zinc-200 rounded w-16 animate-pulse mb-2" />
                <div className="h-3 bg-zinc-200 rounded w-24 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Admin Dashboard
        </h2>
        <p className="text-sm text-zinc-500">
          Overview of your organization's OKR performance
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Total Teams"
          value={String(stats?.totalTeams || 0)}
          icon={Users}
        />
        <StatCard
          title="Active OKRs"
          value={String(stats?.activeOkrs || 0)}
          icon={Target}
        />
        <StatCard
          title="Avg Completion"
          value={`${stats?.avgCompletion || 0}%`}
          icon={TrendingUp}
        />
        <StatCard
          title="At Risk OKRs"
          value={String(stats?.atRiskOkrs || 0)}
          icon={AlertTriangle}
        />
      </div>

      {/* Teams summary + Inactive users */}
      <div className="grid gap-6 md:grid-cols-[63%_35%]">
        {/* Teams Summary */}
        <Card className="rounded-2xl border border-zinc-200 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-zinc-900">
              Teams Summary
            </CardTitle>
            <CardDescription className="text-zinc-500">
              Latest updates across your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tableData?.length ? (
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-100">
                    <TableRow className="bg-zinc-50">
                      <TableHead className="min-w-[100px] sm:min-w-[120px] text-zinc-500">
                        Team
                      </TableHead>
                      <TableHead className="min-w-[100px] sm:min-w-[120px] text-zinc-500">
                        Lead
                      </TableHead>
                      <TableHead className="min-w-[80px] sm:min-w-[100px] text-zinc-500">
                        Members
                      </TableHead>
                      <TableHead className="min-w-[150px] sm:min-w-[180px] text-zinc-500">
                        Completion
                      </TableHead>
                      <TableHead className="min-w-[100px] sm:min-w-[120px] text-zinc-500">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableData.map((row, idx) => {
                      const statusPill: Record<string, string> = {
                        ahead: "bg-amber-400 text-white",
                        on_track: "bg-blue-500 text-white",
                        at_risk: "bg-red-500 text-white",
                        completed: "bg-emerald-500 text-white",
                        overdue: "bg-rose-500 text-white",
                      };

                      return (
                        <TableRow key={idx} className="hover:bg-zinc-50/60">
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="rounded-full border-zinc-200 text-zinc-700 truncate max-w-[100px] sm:max-w-[120px]"
                            >
                              {row.team}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-zinc-800">
                            <div className="truncate max-w-[100px] sm:max-w-[120px]">
                              {row.lead}
                            </div>
                          </TableCell>
                          <TableCell className="text-zinc-800">
                            {row.members}
                          </TableCell>
                          <TableCell>
                            <div className="w-full ">
                              <span className="text-xs text-zinc-500">
                                {row.completion}%
                              </span>
                              <Progress
                                value={row.completion}
                                className="mt-1 h-2 bg-zinc-100"
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1 text-xs font-medium ${
                                statusPill[row.status] ||
                                "bg-zinc-200 text-zinc-700"
                              }`}
                            >
                              {row.status.replace(/_/g, " ")}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No team found</p>
            )}
          </CardContent>
        </Card>

        {/* Inactive Users */}
        <Card className="rounded-2xl border border-zinc-200 shadow-md">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold text-zinc-900">
              Inactive Users (7+ days)
            </CardTitle>
          </CardHeader>

          <CardContent className="divide-y divide-zinc-100">
            {users.length > 0 ? (
              users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between py-3 text-sm"
                >
                  <div className="space-y-0.5">
                    <div className="font-medium text-zinc-900">{u.name}</div>
                    <span className="text-xs text-zinc-500">
                      {u.last_login.substring(0, 10)}
                    </span>
                  </div>
                  <button
                    onClick={() => sendNotification(u.id, u.name)}
                    className="font-medium text-primary hover:text-primary/80"
                  >
                    Follow Up
                  </button>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500 p-2 px-6">
                No inactive user found.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
