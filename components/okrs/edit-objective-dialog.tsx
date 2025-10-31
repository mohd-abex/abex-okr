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
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

interface EditObjectiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectiveId: string;
  organizationId: string;
  onObjectiveUpdated?: () => void;
}

type MemberItem = {
  id: string;
  member: { name: string; title?: string | null };
};
type TeamItem = { id: string; name: string };

type KRForm = {
  id?: string; // present for existing KRs
  title: string;
  target_value: number | "";
  units: string;
  assigned_to?: string | "";
};

export function EditObjectiveDialog({
  open,
  onOpenChange,
  objectiveId,
  organizationId,
  onObjectiveUpdated,
}: EditObjectiveDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [teamId, setTeamId] = useState<string | "">("");
  const [dueDate, setDueDate] = useState<string | "">("");

  const [keyResults, setKeyResults] = useState<KRForm[]>([]);
  const [originalKRIds, setOriginalKRIds] = useState<Set<string>>(new Set());

  const [members, setMembers] = useState<MemberItem[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const { user } = useAuth();

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (!open) return;
    if (!objectiveId) return;

    const fetchAll = async () => {
      setLoadingInitial(true);
      try {
        const [objRes, membersRes, teamsRes] = await Promise.all([
          fetch(`/api/objectives/${objectiveId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }),
          fetch(
            user?.role == "admin"
              ? `/api/organizations/${organizationId}/members`
              : `/api/teams/${user?.team_id}/members`,
            {
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            }
          ),
          fetch(`/api/teams/by-organization/${organizationId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }),
        ]);

        if (!objRes.ok) {
          toast({
            title: "Error",
            description: "Failed to fetch objective",
            variant: "destructive",
          });
          return;
        }

        const obj = await objRes.json();
        // adapt based on your API response shape
        setTitle(obj.title ?? "");
        setDescription(obj.description ?? "");
        setTeamId(obj.team_id ?? "");
        setDueDate(obj.end_date ?? "");

        // Key results: map existing records into form state
        const krArr: KRForm[] = (obj.keyResults || []).map((kr: any) => ({
          id: kr.id,
          title: kr.title ?? "",
          target_value: kr.target_value ?? 0,
          units: kr.units ?? "count",
          assigned_to: kr.assigned_to ?? "",
        }));
        setKeyResults(krArr);
        setOriginalKRIds(new Set(krArr.filter((k) => k.id).map((k) => k.id!)));

        if (membersRes.ok) setMembers(await membersRes.json());
        if (teamsRes.ok) {
          const t = await teamsRes.json();
          setTeams(t.map((x: any) => ({ id: x.id, name: x.name })));
        }
      } catch (err) {
        console.error("Failed to load objective edit data", err);
        toast({
          title: "Error",
          description: "Failed to load objective",
          variant: "destructive",
        });
      } finally {
        setLoadingInitial(false);
      }
    };

    fetchAll();
  }, [open, objectiveId, organizationId, token]);

  const addKR = () =>
    setKeyResults((s) => [
      ...s,
      { title: "", target_value: "", units: "count", assigned_to: "" },
    ]);
  const removeKR = (idx: number) =>
    setKeyResults((s) => s.filter((_, i) => i !== idx));
  const setKR = (idx: number, patch: Partial<KRForm>) =>
    setKeyResults((s) => s.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    if (!title.trim()) return;
    setLoading(true);

    try {
      // 1) Update objective
      const objectivePayload = {
        title,
        description,
        start_date: undefined, // leave as-is; backend usually ignores undefined
        end_date: dueDate || null,
        team_id: teamId || null,
      };

      const updateRes = await fetch(`/api/objectives/${objectiveId}`, {
        method: "PUT", // or PATCH depending on your API
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(objectivePayload),
      });
      if (!updateRes.ok) {
        const txt = await updateRes.text();
        throw new Error("Failed to update objective: " + txt);
      }

      // 2) Handle key results
      const currentKRIds = new Set(
        keyResults.filter((k) => k.id).map((k) => k.id!)
      );

      // KRs removed by user = originalKRIds - currentKRIds
      const removedKRIds = [...originalKRIds].filter(
        (id) => !currentKRIds.has(id)
      );

      // Delete removed KRs
      await Promise.all(
        removedKRIds.map((id) =>
          fetch(`/api/key-results/${id}`, {
            method: "DELETE",
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          })
        )
      );

      // Create or update current KRs
      await Promise.all(
        keyResults.map((kr) => {
          if (kr.id) {
            // update
            return fetch(`/api/key-results/${kr.id}`, {
              method: "PUT", // or PATCH
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                title: kr.title,
                target_value: Number(kr.target_value) || 0,
                units: kr.units,
                assigned_to: kr.assigned_to || null,
                end_date: dueDate || null,
              }),
            });
          } else {
            // create
            return fetch(`/api/key-results`, {
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
            });
          }
        })
      );

      // success
      onOpenChange(false);
      if (onObjectiveUpdated) onObjectiveUpdated();
    } catch (err) {
      console.error("Error updating objective:", err);
      // optionally show toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Edit Objective
          </DialogTitle>
        </DialogHeader>

        {loadingInitial ? (
          <div className="p-6 space-y-3">
            <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse" />
            <div className="h-32 bg-gray-200 rounded animate-pulse" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div>
              <Label htmlFor="objective-title">Objective Title</Label>
              <Input
                id="objective-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="objective-desc">Description</Label>
              <Textarea
                id="objective-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <div
                    key={kr.id ?? idx}
                    className="space-y-2 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <Input
                          placeholder={`Key result ${idx + 1}...`}
                          value={kr.title}
                          onChange={(e) =>
                            setKR(idx, { title: e.target.value })
                          }
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeKR(idx)}
                          disabled={loading}
                        >
                          Remove
                        </Button>
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
                  onClick={addKR}
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
                {loading ? "Updating..." : "Update Objective"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
