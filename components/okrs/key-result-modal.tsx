"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

import { KRForModal } from "./update-progress-modal";
import { RealtimePostgresPayload, supabase } from "@/lib/supabaseClient";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

type KR = {
  id: string;
  title: string;
  target_value: number;
  current_value: number;
  assigned_to?: string | null;
  units?: string | null;
  status?: string | null;
  description?: string | null;
};

type Comment = {
  id: string;
  text: string;
  user: {
    id: string;
    name: string;
    role: string;
  };
};

interface KeyResultCardProps {
  kr: KR;
  isMine: boolean;
  isEmployee: boolean;
  membersMap: Record<string, string>;
  currentUserId: string;
  loadingAction: boolean;
  commentText: Record<string, string>;
  setCommentText: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  commentOpenId: string | null;
  setCommentOpenId: React.Dispatch<React.SetStateAction<string | null>>;
  setLoadingAction: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveKR: (kr: KRForModal) => void;
  setUpdateModalOpen: (v: boolean) => void;
  setCheckInModalOpen: (v: boolean) => void;
}
type CommentPayload = RealtimePostgresPayload<Comment>;

export default function KeyResultCard({
  kr,
  isMine,
  isEmployee,
  membersMap,
  loadingAction,
  commentText,
  setCommentText,
  commentOpenId,
  setCommentOpenId,
  setLoadingAction,
  setActiveKR,
  setUpdateModalOpen,
  setCheckInModalOpen,
}: KeyResultCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const token = localStorage.getItem("token");
  const { toast } = useToast();
  const krPercent = () => {
    const t = Number(kr.target_value || 0);
    const c = Number(kr.current_value || 0);
    return t > 0 ? Math.round((c / t) * 100) : 0;
  };

  const highlightClass = isMine
    ? "bg-blue-50 shadow-md border-blue-200"
    : "bg-gray-50";
  const fetchComments = async (keyResultId: string) => {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/key-results/${keyResultId}/comments`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error("Failed to fetch comments");
      const data = await res.json();
      setComments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComments(false);
    }
  };
  const postComment = async (krId: string) => {
    const text = (commentText[krId] || "").trim();
    if (!text) return;
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/key-results/${krId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Failed to post comment");
      setCommentText((s) => ({ ...s, [krId]: "" }));
      fetchComments(krId);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to fetch key comments!",
        variant: "destructive",
      });
    } finally {
      setLoadingAction(false);
      setCommentOpenId(null);
    }
  };
  const handleToggleComments = (keyResultId: string) => {
    if (!showComments) {
      fetchComments(keyResultId); // always refresh list when opening
    }
    setShowComments((prev) => !prev);
  };

  return (
    <div
      className={`p-3 rounded-lg space-y-3 border border-zinc-200 shadow-sm ${highlightClass}`}
    >
      <div className="flex justify-between items-start">
        <div className="max-w-[75%]">
          <div className="font-medium">{kr.title}</div>
          <div className="text-xs text-muted-foreground">
            {kr.current_value} / {kr.target_value} {kr.units ?? ""}
          </div>

          <div className="mt-2 mb-2 text-sm">Progress</div>
          <div className="flex items-center gap-3">
            <Progress
              value={Math.max(0, Math.min(100, krPercent()))}
              className="h-2 flex-1 border border-gray-300"
            />
            <div className="text-sm">{krPercent()}%</div>
          </div>

          {kr.description ? (
            <div className="mt-3 p-3 bg-white rounded text-sm text-gray-700">
              {kr.description}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-3">
          <Badge className="bg-emerald-100 text-emerald-800">
            {kr.status ?? "On Track"}
          </Badge>
          <div className="text-xs text-muted-foreground">
            Assigned To:{" "}
            {kr.assigned_to
              ? membersMap[kr.assigned_to] ?? kr.assigned_to
              : "—"}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {isEmployee && isMine && kr.current_value < kr.target_value ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setActiveKR({
                id: kr.id,
                title: kr.title,
                current_value: kr.current_value,
                target_value: kr.target_value,
                units: kr.units,
              });
              setCheckInModalOpen(true);
            }}
            disabled={loadingAction}
          >
            Check In
          </Button>
        ) : (
          !isEmployee && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveKR({
                  id: kr.id,
                  title: kr.title,
                  current_value: kr.current_value,
                  target_value: kr.target_value,
                  units: kr.units,
                });
                setUpdateModalOpen(true);
              }}
              disabled={loadingAction}
            >
              Update Progress
            </Button>
          )
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setCommentOpenId((prev) => (prev === kr.id ? null : kr.id));
          }}
        >
          Comments
        </Button>
      </div>

      {commentOpenId === kr.id && (
        <div className="pt-2">
          <Textarea
            id={`kr-comment-${kr.id}`}
            value={commentText[kr.id] ?? ""}
            onChange={(e) =>
              setCommentText((s) => ({
                ...s,
                [kr.id]: e.target.value,
              }))
            }
            placeholder="Add a comment..."
            rows={2}
          />
          <div className="flex justify-end pt-2">
            <Button
              size="sm"
              onClick={() => postComment(kr.id)}
              disabled={loadingAction || !commentText[kr.id]}
            >
              {loadingAction ? "Posting..." : "Post Comment"}
            </Button>
          </div>

          <Button
            variant="outline"
            className="mt-2"
            onClick={() => handleToggleComments(kr.id)}
          >
            {showComments ? "Hide comments" : "Show comments"}
          </Button>

          {showComments && (
            <div className="mt-3">
              {loadingComments ? (
                <p className="m-2 text-sm">Loading comments...</p>
              ) : comments.length === 0 ? (
                <p className="text-xs m-2">No comments yet.</p>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className="flex gap-3 p-3 bg-gray-50 rounded-lg shadow-sm border border-gray-100"
                  >
                    {/* Avatar / Initials */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-semibold">
                      {c.user.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Comment Content */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {c.user.name}
                        </p>
                        <span className="text-xs text-gray-400">
                          {c.user.role}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{c.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
