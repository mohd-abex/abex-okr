"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User } from "lucide-react";

export function SettingsView() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Profile settings
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/users/${user?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });
      const oldUser = JSON.parse(localStorage.getItem("user")!);
      localStorage.setItem("user", JSON.stringify({ ...oldUser, name })!);
      setUser({ ...oldUser, name });
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Settings
        </h2>
        <p className="text-sm text-zinc-500">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid gap-6">
        {/* Profile Settings */}
        <Card className="rounded-2xl border border-zinc-200 shadow-md bg-white">
          <CardHeader className="px-6 py-5">
            <div className="flex items-start justify-between w-full gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="rounded-lg bg-[#FCEBE5] p-2">
                  <User className="h-5 w-5 text-[#E98E75]" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-lg font-semibold text-zinc-900">
                    Profile Settings
                  </CardTitle>
                  <CardDescription className="text-sm text-zinc-500">
                    Update your personal information and account details
                  </CardDescription>
                </div>
              </div>

              {/* role chip */}
              <div className="hidden sm:flex items-center gap-2">
                <div className="text-xs px-3 py-1 rounded-full bg-[#FFF2EF] text-[#FF8A5B] font-medium">
                  {user?.role?.toUpperCase() || "USER"}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 px-6 py-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm text-zinc-700">
                  Full Name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="border-zinc-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-zinc-700">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="bg-zinc-50 border-zinc-200 text-zinc-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm text-zinc-700">
                Role
              </Label>
              <Input
                id="role"
                value={user?.role || ""}
                disabled
                className="bg-zinc-50 border-zinc-200 text-zinc-700"
              />
              <p className="text-xs text-zinc-500">
                Contact your administrator to change your role
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  // reset to stored user values (no logic change)
                  setName(user?.name || "");
                  setEmail(user?.email || "");
                }}
                className="border-zinc-200 text-zinc-700"
              >
                Reset
              </Button>

              <Button
                onClick={handleSaveProfile}
                disabled={isLoading}
                className="bg-[#FF8A5B] hover:opacity-95 text-white"
              >
                {isLoading ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
