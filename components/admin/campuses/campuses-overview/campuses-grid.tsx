import Link from "next/link";
import { useLocale } from "next-intl";
import { Users } from "lucide-react";
import {
    Card,
    CardDescription,
    CardTitle,
} from "@/components/ui/card";
import type { CampusOverview } from "@/lib/campuses/campus-overview";
import { CampusCard } from "./campus-card";
import { CampusHeroSmall } from "./campus-hero";
import { CampusStatusBadge } from "./campus-status-badge";
import { CampusesEmptyState } from "./campuses-empty-state";
import { formatTeacherCount } from "./utils";

interface CampusesGridProps {
    campuses: CampusOverview[];
    isGridView: boolean;
}

interface CampusListItemProps {
    campus: CampusOverview;
}

function CampusListItem({ campus }: CampusListItemProps) {
    const locale = useLocale();
    return (
        <Link href={`/${locale}/admin/campuses/${campus.id}`}>
            <Card className="group relative overflow-hidden border-border/60 bg-card shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.01]">
                <div className="flex items-center p-5">
                    {/* Small hero thumbnail */}
                    <div className="mr-4 h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg">
                        <CampusHeroSmall 
                            hero={campus.hero} 
                            name={campus.name}
                            campusImageStorageId={campus.campusImageStorageId}
                        />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <CardTitle className="text-lg font-serif font-semibold text-foreground">
                                    {campus.name}
                                </CardTitle>
                                {campus.description ? (
                                    <CardDescription className="text-sm text-muted-foreground">
                                        {campus.description}
                                    </CardDescription>
                                ) : null}
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Users className="h-4 w-4" aria-hidden />
                                    {formatTeacherCount(campus.teacherCount)}
                                </div>
                            </div>

                            {/* Badge positioned on the right */}
                            {campus.status ? (
                                <div className="ml-4">
                                    <CampusStatusBadge status={campus.status} />
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </Card>
        </Link>
    );
}

export function CampusesGrid({ campuses, isGridView }: CampusesGridProps) {
    if (!campuses.length) {
        return <CampusesEmptyState />;
    }

    if (isGridView) {
        return (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {campuses.map((campus) => (
                    <CampusCard key={campus.id} campus={campus} />
                ))}
            </div>
        );
    }

    // Lista view
    return (
        <div className="space-y-3">
            {campuses.map((campus) => (
                <CampusListItem key={campus.id} campus={campus} />
            ))}
        </div>
    );
}