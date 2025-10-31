// app/checkins/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "../ui/badge";
import { Bell, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type KeyResult = {
  id: string;
  title: string;
  target_value: number;
};

type CheckIn = {
  id: string;
  progress_value: number;
  comment: string;
  check_in_date: string;
  created_at: string;
  key_result: KeyResult;
  status: "pending" | "approved" | "rejected";
};

export default function CheckinsPage() {
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const { toast } = useToast();

  useEffect(() => {
    const fetchCheckins = async () => {
      try {
        const res = await fetch("/api/checkins", {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) throw new Error("Failed to fetch check-ins");
        const data: CheckIn[] = await res.json();
        setCheckins(data);
      } catch (error) {
        console.error(error);
        toast({
          title: "Error",
          description: "Failed to fetch checkins!",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCheckins();
  }, []);

  function getStatusColor(status: string) {
    switch (status?.toLowerCase()) {
      case "rejected":
        return "bg-[#FFECEC] text-[#C92A2A]";
      case "pending":
        return "bg-[#FFF4EB] text-[#FF8A5B]";
      case "approved":
        return "bg-[#ECFDF5] text-[#059669]";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }
  function capitalizeFirst(str: string) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl sm:text-3xl font-bold tracking-tight flex items-center gap-2 sm:gap-3">
              <CheckCircle className="h-8 w-8 text-[#FF8A5B]" /> Check Ins
            </h2>
            <p className="text-sm text-zinc-500">
              Track your checkins in a single place
            </p>
          </div>
        </div>

        {/* fake loading cards */}
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card
              key={i}
              className="rounded-2xl border border-zinc-100 bg-white shadow-sm p-4"
            >
              <CardContent>
                <div className="h-6 bg-zinc-200 rounded w-3/4 animate-pulse mb-3"></div>
                <div className="h-3 bg-zinc-200 rounded w-1/2 animate-pulse mb-3"></div>
                <div className="h-3 bg-zinc-200 rounded w-full animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight flex gap-2 items-center text-zinc-900">
            <CheckCircle className="h-8 w-8 text-[#FF8A5B]" /> Check Ins
          </h2>
          <p className="text-sm text-zinc-500">
            Track your checkins in a single place
          </p>
        </div>
      </div>

      {checkins.map((checkin) => {
        const percent = Math.floor(
          (checkin.progress_value / checkin.key_result.target_value) * 100
        );

        return (
          <Card
            key={checkin.id}
            className="rounded-2xl border border-zinc-100 bg-white shadow-sm p-4"
          >
            <CardHeader className="flex flex-row justify-between items-center p-0 mb-3">
              <CardTitle className="text-lg font-semibold text-zinc-900">
                {checkin.key_result.title}
              </CardTitle>
              <span className="text-sm text-zinc-500">
                {new Date(checkin.check_in_date).toLocaleDateString()}
              </span>
            </CardHeader>

            <CardContent className="p-0 space-y-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-700">{percent}%</p>
                  <div className="text-sm text-zinc-500">
                    Target: {checkin.key_result.target_value}
                  </div>
                </div>

                {/* orange themed progress bar */}
                <div className="w-full rounded-full bg-[#FFE7DF] h-3 overflow-hidden">
                  <div
                    className="h-3 bg-[#FF8A5B] rounded-full transition-all"
                    style={{
                      width: `${Math.max(0, Math.min(100, percent))}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <p className="text-sm text-zinc-600">
                  {checkin.comment || "—"}
                </p>
              </div>

              <div>
                <Badge
                  className={`${getStatusColor(
                    checkin.status
                  )} capitalize inline-flex items-center gap-2 py-1 px-2 text-xs font-medium`}
                >
                  {capitalizeFirst(checkin.status)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
