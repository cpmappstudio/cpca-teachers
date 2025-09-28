import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { CampusesOverview } from "@/components/admin/campuses/campuses-overview";
import {
    FALLBACK_CAMPUSES,
    mapCampusDocToOverview,
    type CampusOverview,
} from "@/lib/campuses/campus-overview";

const CONVEX_URL_ERROR = "[CampusesPage] NEXT_PUBLIC_CONVEX_URL environment variable is not set.";

export default async function CampusesPage() {
    const convex = createConvexClient();
    const campuses = await loadCampuses(convex);

    return <CampusesOverview campuses={campuses} />;
}

async function loadCampuses(client: ConvexHttpClient): Promise<CampusOverview[]> {
    try {
        const campuses = await client.query(api.campuses.getCampuses, { isActive: true });

        if (!campuses.length) {
            return FALLBACK_CAMPUSES;
        }

        return campuses.map(mapCampusDocToOverview);
    } catch (error) {
        console.error("[CampusesPage] Failed to load campuses:", error);
        return FALLBACK_CAMPUSES;
    }
}

function createConvexClient() {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

    if (!convexUrl) {
        throw new Error(CONVEX_URL_ERROR);
    }

    return new ConvexHttpClient(convexUrl);
}
