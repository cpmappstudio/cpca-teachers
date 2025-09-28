import type { Doc } from "@/convex/_generated/dataModel";
import type { CampusStatus } from "@/convex/types";

export type CampusDoc = Doc<"campuses">;

export type CampusIconKey = "building";

export type CampusHero =
    | { type: "icon"; iconName: CampusIconKey; backgroundClass?: string; iconClass?: string }
    | { type: "image"; imageUrl: string; alt?: string }
    | { type: "initials"; label: string; backgroundClass?: string; textClass?: string; helperText?: string };

export interface CampusOverview {
    id: string;
    name: string;
    description?: string;
    teacherCount?: number;
    status?: CampusStatus;
    hero?: CampusHero;
}

export const FALLBACK_CAMPUSES: CampusOverview[] = [
    {
        id: "fallback-downtown",
        name: "DownTown Campus",
        description: "Main campus location",
        teacherCount: 8,
        status: "active",
        hero: {
            type: "icon",
            iconName: "building",
            backgroundClass: "bg-blue-100",
            iconClass: "text-blue-600",
        },
    },
    {
        id: "fallback-neptune",
        name: "Neptune / High School",
        description: "High school campus",
        teacherCount: 21,
        status: "active",
        hero: {
            type: "image",
            imageUrl: "https://images.unsplash.com/photo-1562774053-701939374585?w=1200&h=600&fit=crop&q=80",
            alt: "Neptune campus exterior",
        },
    },
    {
        id: "fallback-learning-centers",
        name: "Learning Centers (LC)",
        description: "Learning center facilities",
        teacherCount: 0,
        status: "maintenance",
        hero: {
            type: "image",
            imageUrl: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200&h=600&fit=crop&q=80",
            alt: "Learning center building",
        },
    },
    {
        id: "fallback-simpson",
        name: "Simpson Campus",
        description: "Secondary campus location",
        teacherCount: 12,
        status: "active",
        hero: {
            type: "image",
            imageUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&h=600&fit=crop&q=80",
            alt: "Simpson campus building",
        },
    },
    {
        id: "fallback-poinciana",
        name: "Poinciana Campus",
        description: "Community campus",
        teacherCount: 24,
        status: "active",
        hero: {
            type: "image",
            imageUrl: "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=1200&h=600&fit=crop&q=80",
            alt: "Poinciana campus building",
        },
    },
    {
        id: "fallback-honduras",
        name: "Honduras Campus",
        description: "International campus",
        teacherCount: 4,
        status: "active",
        hero: {
            type: "initials",
            label: "HN",
            backgroundClass: "bg-blue-600",
            textClass: "text-white",
            helperText: "Honduras",
        },
    },
    {
        id: "fallback-puerto-rico",
        name: "Puerto Rico Campus",
        description: "Caribbean campus",
        teacherCount: 0,
        status: "inactive",
        hero: {
            type: "initials",
            label: "PR",
            backgroundClass: "bg-gradient-to-r from-blue-600 to-red-600",
            textClass: "text-white",
            helperText: "Puerto Rico",
        },
    },
];

export function mapCampusDocToOverview(campus: CampusDoc): CampusOverview {
    const teacherCount = campus.metrics?.activeTeachers ?? campus.metrics?.totalTeachers;
    const location = campus.address
        ? [campus.address.city, campus.address.state, campus.address.country].filter(Boolean).join(", ")
        : undefined;

    return {
        id: String(campus._id),
        name: campus.name,
        description: location ?? campus.directorName ?? undefined,
        teacherCount,
        status: campus.status,
        hero: {
            type: "initials",
            label: extractInitials(campus.name),
            backgroundClass: "bg-primary/90",
            textClass: "text-white",
        },
    };
}

function extractInitials(name: string) {
    const words = name.trim().split(/\s+/);

    if (words.length === 0) {
        return "C";
    }

    if (words.length === 1) {
        return words[0].slice(0, 2).toUpperCase();
    }

    const first = words[0]?.[0] ?? "";
    const last = words[words.length - 1]?.[0] ?? "";

    return `${first}${last}`.toUpperCase();
}
