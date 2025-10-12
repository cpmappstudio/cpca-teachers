import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

export const CONVEX_URL_ERROR = "[CampusDetailPage] NEXT_PUBLIC_CONVEX_URL environment variable is not set.";

type CampusDoc = Doc<"campuses">;

export function createConvexClient() {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

    if (!convexUrl) {
        throw new Error(CONVEX_URL_ERROR);
    }

    return new ConvexHttpClient(convexUrl);
}

export async function fetchCampus(client: ConvexHttpClient, campusId: string) {
    try {
        return await client.query(api.campuses.getCampus, { campusId: campusId as Id<"campuses"> });
    } catch (error) {
        console.error("[CampusDetailPage] Failed to load campus:", error);
        return null;
    }
}

export async function fetchCampusTeachers(client: ConvexHttpClient, campusId: string) {
    try {
        return await client.query(api.campuses.getTeachersByCampus, {
            campusId: campusId as Id<"campuses">,
            isActive: true,
        });
    } catch (error) {
        console.error("[CampusDetailPage] Failed to load teachers:", error);
        return [];
    }
}

export function formatAddress(campus: CampusDoc) {
    const { address } = campus;
    if (!address) return null;

    const parts = [address.street, address.city, address.state, address.country].filter(Boolean);
    return parts.length ? parts.join(", ") : null;
}

export function formatRelativeTime(timestamp: number) {
    try {
        const diff = Date.now() - timestamp;
        if (diff < 60 * 1000) return "just now";
        if (diff < 60 * 60 * 1000) {
            const mins = Math.round(diff / (60 * 1000));
            return `${mins} min${mins === 1 ? "" : "s"} ago`;
        }
        const date = new Date(timestamp);
        return date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    } catch {
        return "-";
    }
}
