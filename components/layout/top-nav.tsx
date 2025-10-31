"use client";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { LogOut, User, Settings, Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { menuItems } from "./nav-items";
import React from "react";
import { TooltipWrapper } from "../ui/tooltip-wrapper";

export function TopNav() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const activeItem = menuItems.find((m) => m.url === pathname);
  const ActiveIcon = activeItem?.icon ?? null;

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <header className="h-18 flex items-center">
      {/* Active page icon chip (visible on medium screens and up) */}
      <div className="hidden md:flex mr-4 gap-2 justify-end items-center">
        {ActiveIcon && (
          <div className="flex items-center justify-center">
            <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-white flex items-center justify-center border border-gray-200 shadow-sm">
              <div className="h-full w-full rounded-full bg-gray-100 flex items-center justify-center">
                <ActiveIcon className="h-1/3 w-1/3 text-[#FF8A5B]" />
              </div>
            </div>
          </div>
        )}
        <span
          aria-hidden
          className="ml-1.5 inline-block h-3 w-3 rounded-full bg-[#FF8A5B] translate-y-[-2px]"
        />
      </div>

      <div className="flex items-center justify-between w-full bg-gray-100 border border-slate-200 px-4 py-2 shadow-sm rounded-full sm:px-6 sm:py-4">
        {/* Left: Sidebar trigger + active icon + greeting */}
        <div className="flex items-center gap-3 sm:gap-4">
          <TooltipWrapper tooltip="Toggle Sidebar">
            <SidebarTrigger
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg border border-slate-100 bg-white hover:bg-slate-50"
              title="Toggle sidebar"
            />
          </TooltipWrapper>

          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
              {getGreeting()}, {user?.name ?? "User"}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Welcome to your productive space.
            </p>
          </div>
        </div>

        {/* Right: Notifications and Profile dropdown */}
        <div className="flex items-center gap-2 sm:gap-4">
          <TooltipWrapper tooltip="Notifications">
            <Button
              variant="ghost"
              className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-white border border-slate-100 hover:bg-white"
              title="Notifications"
            >
              <Link href={"/notifications"}>
                <div className="h-8 w-8 rounded-full bg-white border border-slate-100 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-[#FF8A5B]" />
                </div>
              </Link>
            </Button>
          </TooltipWrapper>

          <TooltipWrapper tooltip="My Profile">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full border border-slate-100 hover:bg-slate-50"
                  title="Account"
                >
                  <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
                    <AvatarFallback className="bg-[#FF8A5B] text-white font-medium">
                      {user?.name ? getInitials(user.name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 rounded-lg shadow-lg"
                align="end"
                forceMount
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.name}
                    </p>
                    <p className="text-xs leading-none text-gray-500">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipWrapper>
        </div>
      </div>
    </header>
  );
}
