import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  iconBg = "bg-[#FBEAE4]",
  iconColor = "text-[#E98E75]",
}: StatCardProps) {
  return (
    <div className="rounded-3xl bg-gray-100 p-4 shadow-md border border-gray-200">
      {/* Title outside */}
      <p className="text-sm font-medium text-gray-600 mb-3">{title}</p>

      {/* Inner colored box */}
      <div
        className={cn(
          "flex items-center justify-between rounded-2xl px-10 py-6",
          iconBg
        )}
      >
        <h2 className="text-3xl font-semibold text-gray-900">{value}</h2>
        <Icon className={cn("w-7 h-7", iconColor)} strokeWidth={2} />
      </div>
    </div>
  );
}
