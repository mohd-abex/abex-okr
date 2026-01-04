"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Trash, Edit, Group } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

const editTeamSchema = z.object({
  name: z.string().min(2, "Team name must be at least 2 characters."),
  lead_id: z.string().optional().nullable(),
});

interface Team {
  id: string;
  name: string;
  description?: string;
  members_count: number;
  active_okrs_count: number;
  average_progress: number;
  status: string;
  team_lead: { id: string; name: string } | null;
}

interface Member {
  id: string;
  email: string;
  member: { name: string; title: string | null };
  team: { id: string; name: string } | null;
  okrs: number;
  progress: number;
  status: "on_track" | "ahead" | "at_risk" | "behind";
  last_active: string;
}

const statusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "on_track":
    case "on track":
      return "bg-[#EEF8FF] text-[#2563EB]";
    case "ahead":
      return "bg-[#ECFDF5] text-[#059669]";
    case "at_risk":
    case "at risk":
      return "bg-[#FFF2EB] text-[#FF8A5B]";
    case "behind":
      return "bg-[#FFF1F2] text-[#DC2626]";
    default:
      return "bg-zinc-100 text-zinc-800";
  }
};

const statusLabel = (status: string) => {
  switch (status?.toLowerCase()) {
    case "on_track":
    case "on track":
      return "On Track";
    case "ahead":
      return "Ahead";
    case "at_risk":
    case "at risk":
      return "At Risk";
    case "behind":
      return "Behind";
    default:
      return status;
  }
};

export function TeamsView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"teams" | "members">(
    user?.role === "admin" ? "teams" : "members"
  );
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [open, setOpen] = useState<boolean>(false);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string>("all");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{
    id: string;
    type: "team" | "member";
    name?: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [editTeamOpen, setEditTeamOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  const fetchTeams = useCallback(async () => {
    setLoadingTeams(true);
    try {
      const res = await fetch(
        `/api/teams/by-organization/${user?.organization_id}`
      );
      if (!res.ok) throw new Error("Failed to fetch teams");
      const data: Team[] = await res.json();
      setTeams(data);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to fetch teams!",
        variant: "destructive",
      });
    } finally {
      setLoadingTeams(false);
    }
  }, [user?.organization_id, toast]);

  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const token = localStorage.getItem("token");
      let res;
      if (user?.role === "admin") {
        res = await fetch(
          `/api/organizations/${user?.organization_id}/members`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
      } else {
        res = await fetch(`/api/teams/${user?.team_id}/members`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      }

      if (!res.ok) {
        toast({
          title: "Failed",
          description: "Failed to fetch members, try again...",
          variant: "destructive",
        });
        return;
      }

      const data: Member[] = await res.json();
      setMembers(data);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to fetch members!",
        variant: "destructive",
      });
    } finally {
      setLoadingMembers(false);
    }
  }, [user?.organization_id, user?.role, user?.team_id, toast]);

  useEffect(() => {
    if (!user?.organization_id) return;
    fetchTeams();
  }, [user?.organization_id, open, fetchTeams]);

  useEffect(() => {
    if (activeTab === "members" || editTeamOpen) {
      fetchMembers();
    }
  }, [activeTab, fetchMembers, editTeamOpen]);

  const filteredMembers =
    selectedTeam === "all"
      ? members
      : members.filter((member) => member.team?.id === selectedTeam);

  function openConfirmDelete(
    id: string,
    type: "team" | "member",
    name?: string
  ) {
    setConfirmTarget({ id, type, name });
    setConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    if (!confirmTarget) return;
    setDeleting(true);
    const token = localStorage.getItem("token");

    try {
      if (confirmTarget.type === "team") {
        const res = await fetch(`/api/teams/${confirmTarget.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || "Failed to delete team");
        }

        setTeams((prev) => prev.filter((t) => t.id !== confirmTarget.id));
        toast({
          title: "Deleted",
          description: "Team deleted.",
          variant: "default",
        });
      } else {
        const res = await fetch(`/api/users/${confirmTarget.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || "Failed to delete user");
        }

        setMembers((prev) => prev.filter((m) => m.id !== confirmTarget.id));
        toast({
          title: "Deleted",
          description: "Member removed.",
          variant: "default",
        });
      }

      setConfirmOpen(false);
      setConfirmTarget(null);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to delete. Try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
    setEditTeamOpen(true);
  };

  const handleUpdate = (updatedTeam: Team) => {
    setTeams(teams.map((t) => (t.id === updatedTeam.id ? updatedTeam : t)));
  };

  return (
    <div className="space-y-6 px-4 sm:px-0">
      {/* Page Header and Create Team Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div className="flex flex-col gap-1 sm:gap-2 mb-4 sm:mb-0">
          <h2 className="text-2xl sm:text-3xl font-semibold text-zinc-900">
            Teams & People
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500">
            Manage teams and track members performance
          </p>
        </div>
        {user?.role === "admin" && (
          <div>
            <Button
              variant="default"
              onClick={() => setOpen(true)}
              className="bg-[#FF8A5B] text-white hover:opacity-95 px-4 py-2 text-sm rounded-full"
            >
              + Create Team
            </Button>
          </div>
        )}
      </div>

      {/* Tab Buttons */}
      {user?.role === "admin" && (
        <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-2 border-[#FF8A5B] p-1">
          <Button
            variant={activeTab === "teams" ? "default" : "outline"}
            onClick={() => setActiveTab("teams")}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition",
              activeTab === "teams"
                ? "bg-[#FF8A5B] text-white shadow-sm"
                : "bg-white text-zinc-700 hover:bg-[#FFF2EF] border-0"
            )}
          >
            Teams
          </Button>
          <Button
            variant={activeTab === "members" ? "default" : "outline"}
            onClick={() => setActiveTab("members")}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition",
              activeTab === "members"
                ? "bg-[#FF8A5B] text-white shadow-sm"
                : "bg-white text-zinc-700 hover:bg-[#FFF2EF] border-0"
            )}
          >
            All Members
          </Button>
        </div>
      )}

      {/* Teams Tab Content */}
      {activeTab === "teams" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loadingTeams
            ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-zinc-100 p-4 bg-gray-100 space-y-3 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-3 w-48" />
                <div className="flex gap-8">
                  <Skeleton className="h-6 w-10" />
                  <Skeleton className="h-6 w-10" />
                  <Skeleton className="h-6 w-10" />
                </div>
                <Skeleton className="h-2 w-full" />
              </div>
            ))
            : teams.map((team) => (
              <div
                key={team.id}
                className="rounded-2xl border border-zinc-100 p-4 bg-gray-100 space-y-3 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-zinc-900">
                      {team.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className={statusColor(team.status)}>
                      {statusLabel(team.status)}
                    </Badge>
                    {user?.role === "admin" && (
                      <>
                        <button
                          aria-label={`Edit team ${team.name}`}
                          onClick={() => handleEditTeam(team)}
                          className="p-1 rounded hover:bg-zinc-50"
                        >
                          <Edit size={16} className="text-zinc-600" />
                        </button>
                        <button
                          aria-label={`Delete team ${team.name}`}
                          onClick={() =>
                            openConfirmDelete(team.id, "team", team.name)
                          }
                          className="p-1 rounded hover:bg-zinc-50"
                        >
                          <Trash size={16} className="text-red-600" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <p className="font-medium text-zinc-900">
                    {team.team_lead?.name || "___"}
                  </p>
                  <p className="text-xs text-zinc-500">Team Lead</p>
                </div>
                <div className="flex justify-between">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-zinc-900">
                      {team.members_count}
                    </p>
                    <p className="text-xs text-zinc-500">Members</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-zinc-900">
                      {team.active_okrs_count}
                    </p>
                    <p className="text-xs text-zinc-500">Active OKRs</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-zinc-900">
                      {team.average_progress}%
                    </p>
                    <p className="text-xs text-zinc-500">Avg Progress</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 text-sm">
                  <p className="text-sm text-zinc-700">Team Progress</p>
                  <div className="w-full rounded-full bg-[#FFE7DF] h-2 overflow-hidden">
                    <div
                      className="h-2 bg-[#FF8A5B] rounded-full"
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(100, team.average_progress)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Members Tab Content */}
      {activeTab === "members" && (
        <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-md">
          {user?.role === "admin" && (
            <div className="p-4 border-b border-zinc-100 flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <Label
                htmlFor="team-filter"
                className="text-sm font-medium text-zinc-700"
              >
                Filter by Team:
              </Label>
              <Select onValueChange={setSelectedTeam} defaultValue="all">
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-100">
                <TableRow>
                  <TableHead className="min-w-[150px]">Member</TableHead>
                  <TableHead className="min-w-[120px]">Team</TableHead>
                  <TableHead className="min-w-[80px]">OKRs</TableHead>
                  <TableHead className="min-w-[120px]">Progress</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="min-w-[120px]">Last Active</TableHead>
                  <TableHead className="min-w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingMembers ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <div>
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24 mt-1" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-10" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  ))
                ) : filteredMembers.length > 0 ? (
                  filteredMembers.map((m) => (
                    <TableRow key={m.id} className="hover:bg-zinc-50">
                      <TableCell className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#FF8A5B] text-white flex items-center justify-center text-sm font-semibold">
                          {m.member?.name?.charAt(0).toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <div className="font-medium text-zinc-900">
                            {m.member.name}
                          </div>
                          <div className="text-sm text-zinc-500">
                            {m.member.title || ""}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-zinc-900">
                        {m.team?.name || "_____"}
                      </TableCell>
                      <TableCell className="text-zinc-900">{m.okrs}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-36 rounded-full bg-[#FFE7DF] h-2 overflow-hidden">
                            <div
                              className="h-2 bg-[#FF8A5B] rounded-full"
                              style={{
                                width: `${Math.max(
                                  0,
                                  Math.min(100, m.progress)
                                )}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm">{m.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColor(m.status)}>
                          {statusLabel(m.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-zinc-500">
                        {m.last_active}
                      </TableCell>
                      <TableCell>
                        {user?.role === "admin" && user.id != m.id && (
                          <button
                            aria-label={`Delete member ${m.member.name}`}
                            onClick={() =>
                              openConfirmDelete(m.id, "member", m.member.name)
                            }
                            className="p-1 hover:bg-zinc-50 rounded"
                          >
                            <Trash size={16} className="text-red-600" />
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-zinc-500 py-8"
                    >
                      No members found for this team.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <CreateTeamFormModal open={open} setOpen={setOpen} />

      {editingTeam && (
        <EditTeamDialog
          open={editTeamOpen}
          setOpen={setEditTeamOpen}
          team={editingTeam}
          onUpdate={handleUpdate}
        />
      )}

      <Dialog
        open={confirmOpen}
        onOpenChange={(v) => {
          if (!v) {
            setConfirmOpen(false);
            setConfirmTarget(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>
                {confirmTarget?.type === "team"
                  ? `team "${confirmTarget?.name}"`
                  : `member "${confirmTarget?.name}"`}
              </strong>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmOpen(false);
                setConfirmTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-red-600 text-white hover:opacity-95"
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function CreateTeamFormModal({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
}) {
  const [teamName, setTeamName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const res = await fetch("/api/teams", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: teamName }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to create team");
    }

    setTeamName("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a New Team</DialogTitle>
          <DialogDescription>
            Enter the name of the team you want to create.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-name">Team Name</Label>
            <Input
              id="team-name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. Engineering"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Submit</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditTeamDialog({
  open,
  setOpen,
  team,
  onUpdate,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
  team: Team;
  onUpdate: (updatedTeam: Team) => void;
}) {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof editTeamSchema>>({
    resolver: zodResolver(editTeamSchema),
    defaultValues: {
      name: team.name,
    },
  });
  const [loading, setLoading] = useState<boolean>(false);

  // FIX: Reset the form whenever the team prop changes
  useEffect(() => {
    if (team) {
      form.reset({
        name: team.name,
      });
    }
  }, [team, form]);

  const onSubmit = async (values: z.infer<typeof editTeamSchema>) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/teams/${team.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        throw new Error("Failed to update team");
      }

      const updatedTeam = await res.json();
      onUpdate(updatedTeam);
      setOpen(false);
      toast({
        title: "Success",
        description: "Team updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update team.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Team: {team.name}</DialogTitle>
          <DialogDescription>
            Update the team's name or team lead.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-name">Team Name</Label>
            <Input
              id="team-name"
              {...form.register("name")}
              placeholder="e.g. Engineering"
            />
            {form.formState.errors.name && (
              <p className="text-xs text-red-600">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          {!team.team_lead && (
            <p className="text-sm text-gray-600">
              <span className="text-red-700 text-md font-bold">Note:</span> Move
              to <b>"Users"</b> section to add a team lead.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
