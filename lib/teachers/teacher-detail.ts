import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id, Doc } from "@/convex/_generated/dataModel";

export function createConvexClient() {
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
        throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
    }
    return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
}

export async function fetchTeacher(convex: ConvexHttpClient, teacherId: string): Promise<Doc<"users"> | null> {
    try {
        // TODO: Create query to get teacher by ID
        // For now, return null until we create the query
        return null;
    } catch (error) {
        console.error("Error fetching teacher:", error);
        return null;
    }
}

export async function fetchTeacherAssignments(convex: ConvexHttpClient, teacherId: string): Promise<any[]> {
    try {
        // TODO: Create query to get teacher assignments/curriculums
        // For now, return empty array until we create the query
        return [];
    } catch (error) {
        console.error("Error fetching teacher assignments:", error);
        return [];
    }
}

export function formatTeacherStatus(status: string): string {
    switch (status) {
        case "active":
            return "Active";
        case "inactive":
            return "Inactive";
        case "on_leave":
            return "On Leave";
        case "terminated":
            return "Terminated";
        default:
            return status;
    }
}

export function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days} day${days === 1 ? '' : 's'} ago`;
    } else if (hours > 0) {
        return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else if (minutes > 0) {
        return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    } else {
        return 'Just now';
    }
}