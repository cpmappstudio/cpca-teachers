"use client";

import { Badge } from "@/components/ui/badge";
import type { UserStatus } from "@/convex/types";

const statusStyles: Record<UserStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-700",
  inactive: "bg-gray-500/15 text-gray-700",
  on_leave: "bg-amber-500/15 text-amber-700",
  terminated: "bg-rose-500/20 text-rose-700",
};

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ");

  return (
    <Badge
      className={`rounded-full px-3 py-0.5 text-xs font-medium inline-flex ${statusStyles[status] ?? statusStyles.inactive}`}
    >
      {label}
    </Badge>
  );
}
