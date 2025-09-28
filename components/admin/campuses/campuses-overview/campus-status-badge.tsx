import { Badge } from "@/components/ui/badge";
import type { CampusStatus } from "@/convex/types";

const STATUS_LABELS: Record<CampusStatus, string> = {
    active: "Active",
    inactive: "Inactive",
    maintenance: "Maintenance",
};

const STATUS_BADGE_VARIANT: Record<CampusStatus, "default" | "outline" | "secondary"> = {
    active: "default",
    inactive: "outline",
    maintenance: "secondary",
};

interface CampusStatusBadgeProps {
    status: CampusStatus;
}

export function CampusStatusBadge({ status }: CampusStatusBadgeProps) {
    const STATUS_STYLES: Record<CampusStatus, string> = {
        // lighter, more subtle backgrounds and softer text
        active: "bg-green-100/60 text-green-700 backdrop-blur-sm backdrop-saturate-105",
        inactive: "bg-gray-100/55 text-gray-600 backdrop-blur-sm backdrop-saturate-105",
        maintenance: "bg-amber-100/60 text-amber-700 backdrop-blur-sm backdrop-saturate-105",
    };

    const STATUS_RING: Record<CampusStatus, string> = {
        // lighter rings that accent the badge color without being heavy
        active: "ring-1 ring-offset-0 ring-green-200/45",
        inactive: "ring-1 ring-offset-0 ring-gray-200/35",
        maintenance: "ring-1 ring-offset-0 ring-amber-200/45",
    };

    return (
        <Badge
            className={`h-5 min-w-5 rounded-full px-1 font-mono tabular-nums border-0 ${STATUS_STYLES[status]} ${STATUS_RING[status]} ring-offset-transparent`}
            variant={STATUS_BADGE_VARIANT[status]}
        >
            {STATUS_LABELS[status]}
        </Badge>
    );
}