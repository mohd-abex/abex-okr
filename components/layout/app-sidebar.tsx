"use client";

import React from "react";
import { useAuth } from "@/contexts/auth-context";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "../ui/button";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

import { HelpCircle } from "lucide-react";

import { menuItems } from "./nav-items";

export function AppSidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed";

  const updatedMenuItems = menuItems.map((item) => {
    if (
      item.title === "Teams" &&
      (user?.role === "team_lead" || user?.role === "employee")
    ) {
      return { ...item, title: "My Team" };
    }
    return item;
  });

  const filteredMenuItems = updatedMenuItems.filter(
    (item) => user?.role && item.roles.includes(user.role)
  );

  const collapsible = isMobile ? "offcanvas" : "icon";

  return (
    <Sidebar
      collapsible={collapsible}
      variant="sidebar"
      style={
        {
          "--sidebar-width": "20rem",
          "--sidebar-width-icon": "4.5rem",
        } as React.CSSProperties
      }
      className={`
        flex-shrink-0 rounded-[1.9rem] bg-gray-100 shadow-sm border border-slate-200 p-4
        ${
          collapsible === "icon"
            ? "transition-[width] duration-200 ease-linear"
            : ""
        }
        ${
          isCollapsed && collapsible === "icon"
            ? "w-[var(--sidebar-width-icon)]"
            : "w-[var(--sidebar-width)]"
        }
      `}
    >
      {/* Header: animate collapse instead of hiding immediately */}
      <SidebarHeader
        className={`
          px-4
          overflow-hidden
          transition-[max-height,opacity,padding] duration-250 ease-linear
          max-h-40
          opacity-100
          group-data-[collapsible=icon]:max-h-0
          group-data-[collapsible=icon]:opacity-0
          group-data-[collapsible=icon]:py-0
          `}
      >
        <div className="pointer-events-none select-none">
          <Image
            src="/logo.svg"
            alt="abex.work"
            width={130}
            height={40}
            priority
            className="block"
          />
          <div className="mt-1 flex items-baseline">
            <span className="text-[28px] font-extrabold tracking-tight text-gray-900">
              OKR
            </span>
            <span
              aria-hidden
              className="ml-1.5 inline-block h-2 w-2 rounded-full bg-[#FF8A5B] -translate-y-0.5"
            />
          </div>
          <div className="mt-5 h-px w-full bg-gray-200" />
        </div>
      </SidebarHeader>

      {/* Menu */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 px-1 py-2">
              {filteredMenuItems.map((item) => {
                const isActive = pathname === item.url;
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.title} className="relative">
                    {/* Active left bar - animate width & opacity and hide in icon mode */}
                    <span
                      className={`
                        absolute left-0 top-2 bottom-2 rounded-r bg-[#FF8A5B]
                        transition-[width,opacity] duration-200 ease-linear
                        ${isActive ? "w-1 opacity-100" : "w-0 opacity-0"}
                        group-data-[collapsible=icon]:opacity-0
                        group-data-[collapsible=icon]:w-0
                      `}
                    />

                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={isCollapsed ? item.title : undefined}
                      className="group"
                    >
                      <Link
                        href={item.url}
                        className={`
                          flex items-center gap-3 rounded-lg text-sm font-medium
                          transition-all duration-200 ease-linear
                          ${
                            isActive
                              ? "bg-[#FFF4F1] text-gray-900"
                              : "text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                          }
                          px-3 py-2
                          group-data-[collapsible=icon]:justify-center
                        `}
                      >
                        <Icon
                          className={`h-5 w-5 flex-shrink-0 transition-colors duration-150 ${
                            isActive
                              ? "text-[#FF8A5B]"
                              : "text-gray-500 group-hover:text-gray-900"
                          }`}
                        />

                        {/* Label: animate width and opacity so it disappears smoothly */}
                        <span
                          className={`
                            block truncate
                            max-w-[10rem]
                            transition-[max-width,opacity,margin] duration-200 ease-linear
                            opacity-100
                            ml-0
                            group-data-[collapsible=icon]:opacity-0
                            group-data-[collapsible=icon]:max-w-0
                            group-data-[collapsible=icon]:ml-0
                            `}
                          aria-hidden={isCollapsed}
                        >
                          {item.title}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: animated hide so collapse looks smooth */}
      <SidebarFooter
        className={`
          px-4
          overflow-hidden
          transition-[max-height,opacity,padding] duration-250 ease-linear
          max-h-48
          opacity-100
          group-data-[collapsible=icon]:max-h-0
          group-data-[collapsible=icon]:opacity-0
          group-data-[collapsible=icon]:py-0
        `}
      >
        <div className="bg-[#FF8A5B] rounded-3xl p-4 flex flex-col items-center text-center shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle className="w-4 h-4 text-white" />
            <span className="text-white font-medium text-sm">Need Help ?</span>
          </div>
          <p className="text-white/90 text-xs mb-3">Check our documentation</p>

          <Button
            size="sm"
            className="w-full bg-white text-gray-800 hover:bg-gray-100 text-sm font-medium rounded-full"
          >
            <Link href={"https://abex.work/contact"}>Get Support</Link>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
