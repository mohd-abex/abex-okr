"use client";

import { useAuth } from "@/contexts/auth-context";
import { MainLayout } from "@/components/layout/main-layout";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { TeamLeadDashboard } from "@/components/dashboard/team-lead-dashboard";
import { EmployeeDashboard } from "@/components/dashboard/employee-dashboard";

export default function DashboardPage() {
  const { user } = useAuth();

  const renderDashboard = () => {
    switch (user?.role) {
      case "admin":
        return <AdminDashboard />;
      case "team_lead":
        return <TeamLeadDashboard />;
      case "employee":
        return <EmployeeDashboard />;
      default:
        return <div>Loading...</div>;
    }
  };

  return <MainLayout>{renderDashboard()}</MainLayout>;
}
