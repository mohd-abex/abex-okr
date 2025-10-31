"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Construction, Plus } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

interface CreateObjectiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onObjectiveCreated?: () => void;
}

type MemberItem = {
  id: string;
  member: { name: string; title?: string | null };
  team?: string;
};
type TeamItem = { id: string; name: string };

export function CreateObjectiveDialog({
  open,
  onOpenChange,
  organizationId,
  onObjectiveCreated,
}: CreateObjectiveDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [teamId, setTeamId] = useState<string | "">(user?.team_id || "");
  const [dueDate, setDueDate] = useState<string>("");
  const [keyResults, setKeyResults] = useState<
    {
      title: string;
      target_value: number | "";
      units: string;
      assigned_to?: string | "";
    }[]
  >([{ title: "", target_value: "", units: "count", assigned_to: "" }]);
  const [loading, setLoading] = useState(false);

  const [members, setMembers] = useState<MemberItem[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (!organizationId) return;
    const fetchTeams = async () => {
      try {
        const tRes = await fetch(
          `/api/teams/by-organization/${organizationId}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }
        );
        if (tRes.ok) {
          const t = await tRes.json();
          setTeams(t.map((x: any) => ({ id: x.id, name: x.name })));
        }
      } catch (err) {
        console.error("fetch teams error", err);
        toast({
          title: "Error",
          description: "Failed to fetch teams",
          variant: "destructive",
        });
      }
    };
    if (user?.role == "admin") {
      fetchTeams();
    }
  }, [organizationId, token]);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const mRes = await fetch(`/api/teams/${teamId}/members`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (mRes.ok) {
          const m = await mRes.json();
          setMembers(m.map((x: any) => ({ id: x.id, member: x.member })));
        }
      } catch (error) {
        console.log("fetch members error", error);
        toast({
          title: "Error",
          description: "Failed to fetch members",
          variant: "destructive",
        });
      }
    };
    fetchMembers();
  }, [teamId]);

  const addKeyResult = () =>
    setKeyResults((s) => [
      ...s,
      { title: "", target_value: "", units: "count", assigned_to: "" },
    ]);
  const removeKeyResult = (idx: number) =>
    setKeyResults((s) => s.filter((_, i) => i !== idx));
  const setKR = (idx: number, patch: Partial<(typeof keyResults)[number]>) =>
    setKeyResults((s) => s.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    if (!title.trim()) return;
    setLoading(true);

    try {
      // Create objective - using created_by (owner) and team_id
      const objectiveBody: any = {
        title,
        description,
        start_date: new Date().toISOString().slice(0, 10),
        end_date: dueDate || null,
        team_id: teamId || user?.team_id,
        created_by: user?.id || null,
      };

      const res = await fetch("/api/objectives", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(objectiveBody),
      });

      if (!res.ok) {
        const txt = await res.text();
        toast({
          title: "Error",
          description: "Failed to create objective",
          variant: "destructive",
        });
        return;
      }

      const created = await res.json();
      const objectiveId =
        created.id || created.objective_id || created.data?.id;
      if (!objectiveId) {
        // If API returns created object differently, try to handle gracefully
        toast({
          title: "Error",
          description: "Invalid object id",
          variant: "destructive",
        });
        return;
      }

      // Create key results (only those with a non-empty title)
      const krToCreate = keyResults.filter((k) => k.title && k.title.trim());
      await Promise.all(
        krToCreate.map((kr) =>
          fetch("/api/key-results", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              objective_id: objectiveId,
              title: kr.title,
              description: "",
              target_value: Number(kr.target_value) || 0,
              current_value: 0,
              units: kr.units || "count",
              start_date: new Date().toISOString().slice(0, 10),
              end_date: dueDate || null,
              assigned_to: kr.assigned_to || null,
            }),
          })
        )
      );

      // success - reset
      setTitle("");
      setDescription("");
      setTeamId("");
      setDueDate("");
      setKeyResults([
        { title: "", target_value: "", units: "count", assigned_to: "" },
      ]);
      onOpenChange(false);
      if (onObjectiveCreated) onObjectiveCreated();

      toast({
        title: "Success",
        description: "New Objective Created.",
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-full">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              Create New Objective
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <Label htmlFor="objective-title">Objective Title</Label>
            <Input
              id="objective-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter objective title..."
              className="mt-2"
              required
            />
          </div>

          <div>
            <Label htmlFor="objective-desc">Description</Label>
            <Textarea
              id="objective-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the objective..."
              className="mt-2"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {user?.role === "admin" && (
              <div>
                <Label htmlFor="team">Team</Label>
                <select
                  id="team"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="w-full mt-2 rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">Select team (optional)</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <Label htmlFor="due-date">Due Date</Label>
              <input
                id="due-date"
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full mt-2 rounded-md border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <Label>Key Results</Label>
            <div className="space-y-3 mt-2">
              {keyResults.map((kr, idx) => (
                <div key={idx} className="space-y-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <Input
                        placeholder={`Key result ${idx + 1}...`}
                        value={kr.title}
                        onChange={(e) => setKR(idx, { title: e.target.value })}
                        className="mb-2"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Target value"
                          type="number"
                          value={
                            kr.target_value === ""
                              ? ""
                              : String(kr.target_value)
                          }
                          onChange={(e) =>
                            setKR(idx, {
                              target_value:
                                e.target.value === ""
                                  ? ""
                                  : Number(e.target.value),
                            })
                          }
                        />
                        <Input
                          placeholder="Units (e.g. count)"
                          value={kr.units}
                          onChange={(e) =>
                            setKR(idx, { units: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="w-36">
                      <Label className="text-xs">Assign</Label>
                      <select
                        value={kr.assigned_to}
                        onChange={(e) =>
                          setKR(idx, { assigned_to: e.target.value })
                        }
                        className="w-full mt-2 rounded-md border px-2 py-2 text-sm"
                      >
                        <option value="">Unassigned</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.member?.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500" />
                    <div className="flex gap-2">
                      {keyResults.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeKeyResult(idx)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addKeyResult}
              >
                <Plus className="mr-2 h-4 w-4" /> Add More Key Results
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" onClick={handleSubmit} disabled={loading}>
              {loading ? "Creating..." : "Create Objective"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
