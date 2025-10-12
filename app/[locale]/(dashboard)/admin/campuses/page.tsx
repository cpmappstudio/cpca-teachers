import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { CampusesOverview } from "@/components/admin/campuses/campuses-overview";
import {
    mapCampusDocToOverview,
    type CampusOverview,
} from "@/lib/campuses/campus-overview";
import { PageTransition } from "@/components/ui/page-transition";

const CONVEX_URL_ERROR = "[CampusesPage] NEXT_PUBLIC_CONVEX_URL environment variable is not set.";

export default async function CampusesPage() {
    const convex = createConvexClient();
    const campuses = await loadCampuses(convex);

    return (
        <PageTransition>
            <CampusesOverview campuses={campuses} />
        </PageTransition>
    );
}

async function loadCampuses(client: ConvexHttpClient): Promise<CampusOverview[]> {
    try {
        const campuses = await client.query(api.campuses.getCampuses, { isActive: true });
        return campuses.map(mapCampusDocToOverview);
    } catch (error) {
        console.error("[CampusesPage] Failed to load campuses:", error);
        return [];
    }
}

function createConvexClient() {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

    if (!convexUrl) {
        throw new Error(CONVEX_URL_ERROR);
    }

    return new ConvexHttpClient(convexUrl);
}
