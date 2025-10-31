"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Target, Calendar, MessageSquare, TrendingUp } from "lucide-react";
import { OKRsView } from "../okrs/okrs-view";
import { useToast } from "../ui/use-toast";
import { StatCard } from "./stat-card"; // <- uses the StatCard you shared

interface EmployeeInsights {
  activeOkrs: number;
  avgProgress: number;
  dueThisWeek: { count: number; nextTitle: string | null };
  comments: number;
}

interface KeyResult {
  id: string;
  title: string;
  progress: number;
  assignedToMe: boolean;
}

interface Objective {
  id: string;
  title: string;
  progress: number;
  status: string;
  keyResults: KeyResult[];
}

export function EmployeeDashboard() {
  const [insights, setInsights] = useState<EmployeeInsights | null>(null);
  const [okrs, setOkrs] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkInModal, setCheckInModal] = useState<{
    open: boolean;
    krId: string | null;
  }>({ open: false, krId: null });
  const [checkInProgress, setCheckInProgress] = useState("");
  const [checkInComment, setCheckInComment] = useState("");
  const token = localStorage.getItem("token");
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const resInsights = await fetch("/api/dashboard/employee", {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const insightsData = await resInsights.json();
        setInsights(insightsData);

        const resOkrs = await fetch("/api/objectives", {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const okrData = await resOkrs.json();
        setOkrs(okrData);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
        toast({
          title: "Error",
          description: "Failed to fetch dashboard data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  async function handleCheckIn() {
    if (!checkInModal.krId) return;
    try {
      await fetch(`/api/key-results/${checkInModal.krId}/check-ins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: checkInComment,
          progress: Number(checkInProgress),
        }),
      });
      setCheckInModal({ open: false, krId: null });
      setCheckInProgress("");
      setCheckInComment("");
      // optionally refresh OKRs
    } catch (err) {
      console.error("Failed to create check-in", err);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard title="..." value=" " icon={Target} />

          <StatCard title="..." value=" " icon={TrendingUp} />

          <StatCard title="..." value=" " icon={Calendar} />

          <StatCard title="..." value=" " icon={MessageSquare} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      {insights && (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="Active OKRs"
            value={insights.activeOkrs}
            icon={Target}
          />

          <StatCard
            title="Avg. Progress"
            value={`${Math.round(insights.avgProgress)}%`}
            icon={TrendingUp}
          />

          <StatCard
            title="Due This Week"
            value={insights.dueThisWeek.count}
            icon={Calendar}
          />

          <StatCard
            title="Comments"
            value={insights.comments}
            icon={MessageSquare}
          />
        </div>
      )}

      {/* Optional: quick personal OKRs list rendered via existing OKRsView */}
      <div className="space-y-6">
        <Card className="rounded-2xl bg-white border border-zinc-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-zinc-900">
              <Target className="h-5 w-5 text-[#FF8A5B]" />
              Your OKRs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* OKRsView remains unchanged, containing its own logic */}
            <OKRsView />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
