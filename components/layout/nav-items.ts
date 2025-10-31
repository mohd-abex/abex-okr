// app/nav-items.ts
import {
  LayoutDashboard,
  Target,
  Users,
  Group,
  Settings,
  Bell,
  CheckCircle,
  HelpCircle,
} from "lucide-react";

export type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  roles: string[];
};

export const menuItems: NavItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "team_lead", "employee"],
  },
  {
    title: "OKRs",
    url: "/okrs",
    icon: Target,
    roles: ["admin", "team_lead", "employee"],
  },
  {
    title: "Teams",
    url: "/teams",
    icon: Group,
    roles: ["admin", "team_lead", "employee"],
  },
  {
    title: "Users",
    url: "/users",
    icon: Users,
    roles: ["admin"],
  },
  {
    title: "Notifications",
    url: "/notifications",
    icon: Bell,
    roles: ["admin", "team_lead", "employee"],
  },
  {
    title: "Checkins",
    url: "/checkins",
    icon: CheckCircle,
    roles: ["employee"],
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    roles: ["admin", "team_lead", "employee"],
  },
];
