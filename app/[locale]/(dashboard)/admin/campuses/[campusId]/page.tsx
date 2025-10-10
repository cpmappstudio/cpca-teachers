import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageTransition } from "@/components/ui/page-transition";
import {
    CampusHeader,
    CampusMetricsCard,
    CampusOverviewCard,
    CampusTeachersCard,
} from "@/components/admin/campuses/campus-detail";
import {
    createConvexClient,
    fetchCampus,
    fetchCampusTeachers,
    formatAddress,
    formatRelativeTime,
} from "@/lib/campuses/campus-detail";

interface CampusDetailPageProps {
    params: { locale: string; campusId: string };
}

export const metadata: Metadata = {
    title: "Campus Overview",
};

export default async function CampusDetailPage({ params }: CampusDetailPageProps) {
    const { locale, campusId } = params;

    const convex = createConvexClient();
    const [campus, teachers] = await Promise.all([
        fetchCampus(convex, campusId),
        fetchCampusTeachers(convex, campusId),
    ]);

    if (!campus) {
        notFound();
    }

    const addressLabel = formatAddress(campus);
    const lastUpdatedLabel = campus.metrics?.lastUpdated
        ? formatRelativeTime(campus.metrics.lastUpdated)
        : "-";
        

    return (
        <PageTransition>
            <div className="relative flex flex-1 flex-col">
                <div className="relative z-10 flex flex-1 flex-col gap-6 px-2 md:px-4 pb-8">
                    <CampusHeader
                        campus={campus}
                        locale={locale}
                        hasHero={false}
                        addressLabel={addressLabel}
                    />
                    <div className="grid gap-6 lg:grid-cols-1">
                        <CampusOverviewCard campus={campus} addressLabel={addressLabel} />
                        {/* <CampusMetricsCard
                            metrics={campus.metrics}
                            status={campus.status}
                            lastUpdatedLabel={lastUpdatedLabel}
                            className="lg:col-span-2"
                        /> */}
                    </div>
                    <CampusTeachersCard teachers={teachers} campusId={campusId} />
                </div>
            </div>
        </PageTransition>
    );
}
