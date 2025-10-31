import React from "react";
import { cn } from "@/lib/utils";

interface TooltipWrapperProps {
  children: React.ReactNode;
  tooltip: string;
}

export function TooltipWrapper({ children, tooltip }: TooltipWrapperProps) {
  return (
    <div className="relative inline-block group">
      {children}
      <div
        className={cn(
          "absolute z-50 top-[calc(100%+8px)] left-1/2 -translate-x-1/2",
          "min-w-max px-3 py-1.5 bg-gray-100 text-gray-900 text-xs rounded-lg shadow-md",
          "opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-300"
        )}
      >
        {tooltip}
        <div className="absolute w-2 h-2 bg-gray-100 rotate-45 -top-1 left-1/2 -translate-x-1/2"></div>
      </div>
    </div>
  );
}
