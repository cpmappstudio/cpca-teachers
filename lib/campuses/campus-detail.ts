import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { FALLBACK_CAMPUSES } from "./campus-overview";

export const CONVEX_URL_ERROR = "[CampusDetailPage] NEXT_PUBLIC_CONVEX_URL environment variable is not set.";

const FALLBACK_BASE_TIMESTAMP = Date.UTC(2024, 0, 1);
const FALLBACK_AUTHOR_ID = "fallback-user" as Id<"users">;

type CampusDoc = Doc<"campuses">;
type CampusMetrics = NonNullable<CampusDoc["metrics"]>;
type UserDoc = Doc<"users">;

type CampusStatusValue = CampusDoc["status"];
type TeacherStatusValue = UserDoc["status"];

export function createConvexClient() {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

    if (!convexUrl) {
        throw new Error(CONVEX_URL_ERROR);
    }

    return new ConvexHttpClient(convexUrl);
}

export async function fetchCampus(client: ConvexHttpClient, campusId: string) {
    if (isFallbackCampusId(campusId)) {
        return mapFallbackCampusToDoc(campusId);
    }

    try {
        return await client.query(api.campuses.getCampus, { campusId: campusId as Id<"campuses"> });
    } catch (error) {
        console.error("[CampusDetailPage] Failed to load campus:", error);
        return null;
    }
}

export async function fetchCampusTeachers(client: ConvexHttpClient, campusId: string) {
    if (isFallbackCampusId(campusId)) {
        return createFallbackTeachers(campusId);
    }

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

export function getCampusHeroImage(campusId: string): string | null {
    if (!isFallbackCampusId(campusId)) {
        return null;
    }

    const fallbackCampus = FALLBACK_CAMPUSES.find((campusOverview) => campusOverview.id === campusId);
    if (fallbackCampus?.hero?.type === "image") {
        return fallbackCampus.hero.imageUrl;
    }

    return null;
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

function isFallbackCampusId(campusId: string) {
    return campusId.startsWith("fallback-");
}

function mapFallbackCampusToDoc(campusId: string) {
    const fallbackCampus = FALLBACK_CAMPUSES.find((campusOverview) => campusOverview.id === campusId);
    if (!fallbackCampus) {
        return null;
    }

    const teacherCount = fallbackCampus.teacherCount ?? 0;
    const metrics = deriveFallbackMetrics(campusId, teacherCount);
    const status = (fallbackCampus.status ?? "active") as CampusStatusValue;

    const campusDoc: CampusDoc = {
        _id: campusId as Id<"campuses">,
        _creationTime: FALLBACK_BASE_TIMESTAMP,
        name: fallbackCampus.name,
        code: campusId.replace("fallback-", "").toUpperCase(),
        campusImageStorageId: undefined,
        directorId: undefined,
        directorName: "Sample Director",
        directorEmail: "director@example.com",
        directorPhone: "+1 (555) 123-4567",
        address: fallbackCampus.description
            ? {
                  street: "",
                  city: fallbackCampus.description,
                  state: "",
                  zipCode: "",
                  country: "",
              }
            : undefined,
        metrics,
        isActive: status === "active",
        status,
        createdAt: FALLBACK_BASE_TIMESTAMP,
        createdBy: FALLBACK_AUTHOR_ID,
        updatedAt: metrics.lastUpdated,
        updatedBy: FALLBACK_AUTHOR_ID,
    };

    return campusDoc;
}

function createFallbackTeachers(campusId: string) {
    const fallbackCampus = FALLBACK_CAMPUSES.find((campusOverview) => campusOverview.id === campusId);
    const teacherCount = fallbackCampus?.teacherCount ?? 0;
    const hashBase = hashString(campusId);

    const teachers: UserDoc[] = [];

    for (let index = 0; index < teacherCount; index++) {
        const lessons = 20 + ((hashBase + index * 7) % 30);
        const completedLessons = Math.min(lessons, 10 + ((hashBase + index * 11) % lessons));
        const progressPercentage = lessons ? Math.round((completedLessons / lessons) * 100) : 0;
        const lastUpdated = FALLBACK_BASE_TIMESTAMP + ((hashBase + index * 13) % 14) * 24 * 60 * 60 * 1000;

        const teacher: UserDoc = {
            _id: `sample-teacher-${campusId}-${index}` as Id<"users">,
            _creationTime: lastUpdated,
            clerkId: `sample_clerk_${index}`,
            email: `teacher${index + 1}@${campusId.replace("fallback-", "")}.edu`,
            firstName: `Teacher ${index + 1}`,
            lastName: "Last Name",
            fullName: `Teacher ${index + 1} Last Name`,
            avatarStorageId: undefined,
            phone: undefined,
            role: "teacher",
            campusId: campusId as Id<"campuses">,
            isActive: true,
            status: deriveFallbackTeacherStatus(hashBase + index),
            progressMetrics: {
                totalLessons: lessons,
                completedLessons,
                progressPercentage,
                lastUpdated,
            },
            createdAt: FALLBACK_BASE_TIMESTAMP,
            createdBy: FALLBACK_AUTHOR_ID,
            updatedAt: lastUpdated,
            lastLoginAt: undefined,
            hashedPassword: undefined,
        };

        teachers.push(teacher);
    }

    return teachers;
}

function deriveFallbackMetrics(campusId: string, teacherCount: number): CampusMetrics {
    const hash = hashString(campusId);
    const averageProgress = 60 + (hash % 41);
    const lastUpdated = FALLBACK_BASE_TIMESTAMP + (hash % 30) * 24 * 60 * 60 * 1000;

    return {
        totalTeachers: teacherCount,
        activeTeachers: teacherCount,
        averageProgress,
        lastUpdated,
    };
}

function deriveFallbackTeacherStatus(value: number): TeacherStatusValue {
    const statuses: TeacherStatusValue[] = ["active", "inactive", "on_leave"];
    return statuses[value % statuses.length] ?? "active";
}

function hashString(value: string) {
    let hash = 0;
    for (let index = 0; index < value.length; index++) {
        hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
    }
    return hash;
}
