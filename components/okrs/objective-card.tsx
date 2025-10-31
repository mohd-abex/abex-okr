"use client";

import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import UpdateProgressModal, { KRForModal } from "./update-progress-modal";
import { useAuth } from "@/contexts/auth-context";
import KeyResultCard from "./key-result-modal";
import { supabase } from "@/lib/supabaseClient";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils"; // Import cn utility

type KR = {
  id: string;
  title: string;
  target_value: number;
  current_value: number;
  assigned_to?: string | null;
  units?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  description?: string | null;
};

export type Objective = {
  id: string;
  title: string;
  description?: string | null;
  progress: number;
  status: string;
  end_date?: string | null;
  team: {
    id: string;
    name: string;
  };
  keyResults?: KR[];
};

type Comment = {
  id: string;
  text: string;
  created_at: string;
  user: {
    id: string;
    name: string;
    role: string;
  };
};

type Props = {
  objective: Objective;
  membersMap?: Record<string, string>;
  onUpdated?: () => void;
  setEditingObjectiveId: Dispatch<SetStateAction<string | null>>;
  setShowEditDialog: Dispatch<SetStateAction<boolean>>;
  currentUserId?: string; // optional, wont break previous usage
  role?: string; // optional, use to detect 'employee'
};

export default function ObjectiveCard({
  objective,
  membersMap = {},
  onUpdated,
  setEditingObjectiveId,
  setShowEditDialog,
  currentUserId: propCurrentUserId,
  role: propRole,
}: Props) {
  // fallback to auth context if parent didn't pass currentUserId / role
  const { user } = useAuth();
  const currentUserId = propCurrentUserId ?? user?.id ?? "";
  const currentRole = propRole ?? user?.role ?? "";
  const { toast } = useToast();

  const isEmployee = currentRole?.toLowerCase() === "employee";

  const [expanded, setExpanded] = useState<boolean>(false);
  const [krs, setKrs] = useState<KR[]>(objective.keyResults ?? []);
  const [loadingKRs, setLoadingKRs] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [commentOpenId, setCommentOpenId] = useState<string | null>(null);

  // modals
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [activeKR, setActiveKR] = useState<KRForModal | null>(null);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // fetch KRs (used on mount or lazy on expand)
  const fetchKRs = useCallback(async () => {
    setLoadingKRs(true);
    try {
      const res = await fetch(`/api/objectives/${objective.id}/key-results`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.ok) {
        const data: KR[] = await res.json();
        setKrs(data);
      } else {
        setKrs([]);
      }
    } catch (err) {
      console.error("Failed to fetch key results", err);
      toast({
        title: "Error",
        description: "Failed to fetch key results!",
        variant: "destructive",
      });
      setKrs([]);
    } finally {
      setLoadingKRs(false);
    }
  }, [objective.id, token, toast]);

  // initial fetch if objective didn't include KRs
  useEffect(() => {
    if (objective.keyResults && objective.keyResults.length) return;
    fetchKRs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objective.id]);

  // lazy load on expand if not loaded
  useEffect(() => {
    if (!expanded) return;
    if (krs.length > 0) return;
    fetchKRs();
  }, [expanded, krs.length, fetchKRs]);

  useEffect(() => {
    // Subscribe to realtime changes for key_results of this objective
    const channel = supabase
      .channel(`realtime:key_results:${objective.id}`)
      .on<RealtimePostgresChangesPayload<KR>>(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "key_results",
          filter: `objective_id=eq.${objective.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" && payload.new) {
            setKrs((prev) => [...prev, payload.new as KR]);
          }
          if (payload.eventType === "UPDATE" && payload.new) {
            setKrs((prev) =>
              prev.map((kr) =>
                kr.id === (payload.new as KR).id
                  ? { ...kr, ...(payload.new as KR) }
                  : kr
              )
            );
          }
          if (payload.eventType === "DELETE" && payload.old) {
            setKrs((prev) =>
              prev.filter((kr) => kr.id !== (payload.old as KR).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [objective.id]);

  // update progress via existing modal (team-lead/admin)
  const handleKRUpdate = async (newValue: number) => {
    if (!activeKR) return;
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/key-results/${activeKR.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ current_value: newValue }),
      });
      if (!res.ok) throw new Error("Failed to update key result");
      // update local krs
      setKrs((prev) =>
        prev.map((x) =>
          x.id === activeKR.id ? { ...x, current_value: newValue } : x
        )
      );
      fetchKRs();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(false);
    }
  };

  // create a check-in (employee flow)
  const createCheckIn = async (
    krId: string,
    value: number,
    comment?: string
  ) => {
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/key-results/${krId}/check-ins`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        // your API sample expects { comment, progress } as body
        body: JSON.stringify({ comment: comment ?? null, progress: value }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to create check-in");
      }
      // Optionally refresh KRs or parent objective list
      await fetchKRs();
      onUpdated?.();
    } catch (err) {
      console.error("Check-in failed:", err);
      throw err;
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <>
      <Card className="rounded-lg border border-zinc-200 shadow-sm">
        <CardHeader className="flex flex-col-reverse sm:flex-row sm:items-start justify-between p-4 sm:p-6 pb-0">
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 mt-2 sm:mt-0">
              <CardTitle className="text-xl sm:text-2xl font-semibold text-zinc-900 leading-tight">
                {objective.title}
              </CardTitle>
              <Badge className="w-fit mt-1 sm:mt-0 bg-gray-100 text-gray-800">
                {objective.status}
              </Badge>
            </div>
            {objective.description && (
              <CardDescription className="mt-1 text-sm text-zinc-500">
                {objective.description}
              </CardDescription>
            )}
            <div className="flex flex-wrap items-center gap-x-4 text-xs text-zinc-500 mt-2">
              <div>
                Due:{" "}
                {objective.end_date
                  ? new Date(objective.end_date).toLocaleDateString()
                  : "—"}
              </div>
              {user?.role === "admin" && (
                <div>Team: {objective.team.name ?? "---"}</div>
              )}
            </div>
          </div>

          <div className="text-right sm:text-left">
            <div className="text-3xl font-bold text-zinc-900">
              {objective.progress}%
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          <div>
            <div className="flex justify-between text-sm font-medium text-zinc-700 mb-2">
              <span>Overall Progress</span>
              <span>{objective.progress}%</span>
            </div>
            <Progress
              value={Math.max(0, Math.min(100, objective.progress))}
              className="h-2 bg-zinc-200"
              indicatorClassName="bg-[#FF8A5B]"
            />
          </div>

          {/* Key Results */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between mb-2 border-b border-zinc-100 pb-2">
              <button
                className={cn(
                  "flex items-center gap-1 text-sm font-medium text-zinc-700",
                  expanded && "text-red-500"
                )}
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                aria-controls={`krs-${objective.id}`}
              >
                Key Results ({krs.length})
                {expanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>

            {expanded &&
              krs.map((kr) => {
                const isMine = !!(
                  kr.assigned_to && kr.assigned_to === currentUserId
                );
                // highlight style for assigned KRs
                const highlightClass = isMine
                  ? "bg-blue-50 shadow-md border-blue-200"
                  : "bg-gray-50";
                return (
                  <KeyResultCard
                    key={kr.id}
                    kr={kr}
                    isMine={isMine}
                    isEmployee={isEmployee}
                    membersMap={membersMap}
                    currentUserId={currentUserId}
                    loadingAction={loadingAction}
                    setLoadingAction={setLoadingAction}
                    commentText={commentText}
                    setCommentText={setCommentText}
                    commentOpenId={commentOpenId}
                    setCommentOpenId={setCommentOpenId}
                    setActiveKR={setActiveKR}
                    setUpdateModalOpen={setUpdateModalOpen}
                    setCheckInModalOpen={setCheckInModalOpen}
                  />
                );
              })}
          </div>

          {/* only show edit objective action for non-employees */}
          {!isEmployee && (
            <>
              <div className="pt-3 border-t" />
              <div className="flex gap-2 pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingObjectiveId(objective.id);
                    setShowEditDialog(true);
                  }}
                  className="w-full sm:w-auto"
                >
                  Edit Objective
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Update Progress Modal (existing) */}
      <UpdateProgressModal
        open={updateModalOpen}
        onOpenChange={(v) => {
          setUpdateModalOpen(v);
          if (!v) setActiveKR(null);
        }}
        kr={activeKR}
        onSubmit={async (newValue: number) => {
          await handleKRUpdate(newValue);
        }}
      />

      {/* Check-In Modal (employee) */}
      <CheckInModal
        open={checkInModalOpen}
        onOpenChange={(v) => {
          setCheckInModalOpen(v);
          if (!v) setActiveKR(null);
        }}
        kr={activeKR}
        onSubmit={async (value: number, comment?: string) => {
          if (!activeKR) return;
          await createCheckIn(activeKR.id, value, comment);
          setCheckInModalOpen(false);
          setActiveKR(null);
        }}
        busy={loadingAction}
      />
    </>
  );
}

function CheckInModal({
  open,
  onOpenChange,
  kr,
  onSubmit,
  busy = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kr: KRForModal | null;
  onSubmit: (value: number, comment?: string) => Promise<void>;
  busy?: boolean;
}) {
  const [value, setValue] = useState<number>(0);
  const [comment, setComment] = useState<string>("");

  // reset when opening
  useEffect(() => {
    if (open && kr) {
      setValue(Number(kr.current_value ?? 0));
      setComment("");
    }
  }, [open, kr]);

  if (!kr) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Check In — {kr.title}</DialogTitle>
          <DialogDescription>
            Update your progress and optionally add a comment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="progress">Progress value</Label>
            <Input
              id="progress"
              type="number"
              min={0}
              max={kr.target_value}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
            />
          </div>

          <div>
            <Label htmlFor="comment">Comment (optional)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row-reverse gap-2 mt-4">
          <Button
            type="button"
            onClick={async () => {
              try {
                await onSubmit(value, comment);
              } catch {
                // parent handles error
              }
            }}
            disabled={
              busy ||
              Number.isNaN(value) ||
              value < 0 ||
              value > kr.target_value
            }
            className="w-full sm:w-auto"
          >
            {busy ? "Saving..." : "Submit Check-in"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
