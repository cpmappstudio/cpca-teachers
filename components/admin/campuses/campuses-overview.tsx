"use client";

import { useMemo, useState } from "react";
import { Search, Plus, Users, Building2, Filter, Grid3X3, List } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import type {
    CampusOverview,
    CampusHero,
    CampusIconKey,
} from "@/lib/campuses/campus-overview";
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

const HERO_ICON_COMPONENTS: Record<CampusIconKey, LucideIcon> = {
    building: Building2,
};

interface CampusesOverviewProps {
    campuses: CampusOverview[];
}

export function CampusesOverview({ campuses }: CampusesOverviewProps) {
    const [query, setQuery] = useState("");
    const [isGridView, setIsGridView] = useState(true);
    const [statusFilter, setStatusFilter] = useState<CampusStatus | "all">("all");

    const filteredCampuses = useMemo(() => {
        let filtered = campuses;

        // Filter by status
        if (statusFilter !== "all") {
            filtered = filtered.filter((campus) => campus.status === statusFilter);
        }

        // Filter by search query
        const normalized = query.trim().toLowerCase();
        if (normalized) {
            filtered = filtered.filter(({ name }) =>
                (name ?? "").toLowerCase().includes(normalized)
            );
        }

        return filtered;
    }, [campuses, query, statusFilter]);

    return (
        <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
            <PageHeader
                query={query}
                setQuery={setQuery}
                isGridView={isGridView}
                setIsGridView={setIsGridView}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
            />
            <CampusesGrid campuses={filteredCampuses} isGridView={isGridView} />
        </div>
    );
}

function PageHeader({
    query,
    setQuery,
    isGridView,
    setIsGridView,
    statusFilter,
    setStatusFilter,
}: {
    query: string;
    setQuery: (value: string) => void;
    isGridView: boolean;
    setIsGridView: (value: boolean) => void;
    statusFilter: CampusStatus | "all";
    setStatusFilter: (value: CampusStatus | "all") => void;
}) {
    const getFilterLabel = () => {
        switch (statusFilter) {
            case "active":
                return "Active";
            case "inactive":
                return "Inactive";
            case "maintenance":
                return "Maintenance";
            default:
                return "All";
        }
    };

    return (
        <div className="flex items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-3">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search campuses by name"
                        aria-label="Search campuses"
                        className="pl-10 pr-3 rounded-l h-9"
                    />
                </div>
            </div>
            <div className="flex items-center gap-3">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="lg" className="h-9">
                            <Filter className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-48" align="end">
                        <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => setStatusFilter("all")}
                            className={statusFilter === "all" ? "bg-accent" : ""}
                        >
                            All Campuses
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => setStatusFilter("active")}
                            className={statusFilter === "active" ? "bg-accent" : ""}
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                                Active
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => setStatusFilter("inactive")}
                            className={statusFilter === "inactive" ? "bg-accent" : ""}
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                                Inactive
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => setStatusFilter("maintenance")}
                            className={statusFilter === "maintenance" ? "bg-accent" : ""}
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-amber-600 rounded-full"></div>
                                Maintenance
                            </div>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <div className="hidden md:inline-flex h-9 items-center rounded-lg bg-muted p-1">
                    <button
                        type="button"
                        onClick={() => setIsGridView(true)}
                        className={`inline-flex h-7 items-center justify-center rounded-md px-3 text-sm font-medium transition-all ${isGridView
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                        aria-pressed={isGridView}
                    >
                        <Grid3X3 className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsGridView(false)}
                        className={`inline-flex h-7 items-center justify-center rounded-md px-3 text-sm font-medium transition-all ${!isGridView
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                        aria-pressed={!isGridView}
                    >
                        <List className="h-4 w-4" />
                    </button>
                </div>
                <Button className="bg-sidebar-accent h-9">
                    <span className="hidden md:inline">Add Campus</span>
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

function CampusesGrid({ campuses, isGridView }: { campuses: CampusOverview[]; isGridView: boolean }) {
    if (!campuses.length) {
        return <EmptyState />;
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

function CampusListItem({ campus }: { campus: CampusOverview }) {
    return (
        <Card className="group relative overflow-hidden border-border/60 bg-card/80 shadow-sm">
            <div className="flex items-center p-5">
                {/* Small hero thumbnail */}
                <div className="mr-4 h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg">
                    <CardHeroSmall hero={campus.hero} name={campus.name} />
                </div>

                {/* Content */}
                <div className="flex-1">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-lg font-semibold text-foreground">
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
                                <StatusBadge status={campus.status} />
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </Card>
    );
}

function CardHeroSmall({ hero, name }: { hero?: CampusHero; name: string }) {
    if (!hero) {
        return (
            <div className="relative h-full w-full bg-gradient-to-br from-primary/10 via-primary/5 to-primary/20">
                <div className="flex h-full items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary" aria-hidden />
                </div>
            </div>
        );
    }

    switch (hero.type) {
        case "icon": {
            const Icon = HERO_ICON_COMPONENTS[hero.iconName] ?? Building2;
            return (
                <div className={`relative h-full w-full ${hero.backgroundClass ?? "bg-primary/10"}`}>
                    <div className="flex h-full items-center justify-center">
                        <Icon className={`h-6 w-6 ${hero.iconClass ?? "text-primary"}`} aria-hidden />
                    </div>
                </div>
            );
        }
        case "image": {
            return (
                <div
                    className="h-full w-full bg-cover bg-center"
                    style={{ backgroundImage: `url('${hero.imageUrl}')` }}
                    role="img"
                    aria-label={hero.alt ?? name}
                />
            );
        }
        case "initials": {
            return (
                <div className={`relative h-full w-full ${hero.backgroundClass ?? "bg-primary"}`}>
                    <div className="flex h-full flex-col items-center justify-center gap-1">
                        <span className={`text-lg font-semibold tracking-[0.1em] ${hero.textClass ?? "text-white"}`}>
                            {hero.label}
                        </span>
                    </div>
                </div>
            );
        }
        default:
            return null;
    }
}

function CampusCard({ campus }: { campus: CampusOverview }) {
    return (
        <Card className="group pt-0 relative overflow-hidden border-border/60 bg-card/80 shadow-sm ">
            <CardHero hero={campus.hero} name={campus.name} />

            {campus.status ? (
                <div className="absolute top-3 right-3 z-10">
                    <StatusBadge status={campus.status} />
                </div>
            ) : null}

            <CardHeader className="flex flex-col gap-4 px-5 ">
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                        <CardTitle className="text-lg font-semibold text-foreground">
                            {campus.name}
                        </CardTitle>
                        {campus.description ? (
                            <CardDescription className="text-sm text-muted-foreground">
                                {campus.description}
                            </CardDescription>
                        ) : null}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-5 pt-0">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" aria-hidden />
                        {formatTeacherCount(campus.teacherCount)}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function CardHero({ hero, name }: { hero?: CampusHero; name: string }) {
    if (!hero) {
        return (
            <div className="relative aspect-[16/9] w-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-primary/20" />
                <div className="relative flex h-full items-center justify-center">
                    <Building2 className="h-12 w-12 text-primary" aria-hidden />
                </div>
            </div>
        );
    }

    switch (hero.type) {
        case "icon": {
            const Icon = HERO_ICON_COMPONENTS[hero.iconName] ?? Building2;
            return (
                <div className={`relative aspect-[16/9] w-full overflow-hidden ${hero.backgroundClass ?? "bg-primary/10"}`}>
                    <div className="absolute inset-0 opacity-40 transition group-hover:opacity-60" />
                    <div className="relative flex h-full items-center justify-center">
                        <Icon className={`h-12 w-12 ${hero.iconClass ?? "text-primary"}`} aria-hidden />
                    </div>
                </div>
            );
        }
        case "image": {
            return (
                <div className="relative aspect-[16/9] w-full overflow-hidden">
                    <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                        style={{ backgroundImage: `url('${hero.imageUrl}')` }}
                        role="img"
                        aria-label={hero.alt ?? name}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-transparent" />
                </div>
            );
        }
        case "initials": {
            return (
                <div className={`relative aspect-[16/9] w-full overflow-hidden ${hero.backgroundClass ?? "bg-primary"}`}>
                    <div className="absolute inset-0 bg-black/5" />
                    <div className="relative flex h-full flex-col items-center justify-center gap-1">
                        <span className={`text-3xl font-semibold tracking-[0.2em] ${hero.textClass ?? "text-white"}`}>
                            {hero.label}
                        </span>
                        {hero.helperText ? (
                            <span className="text-xs uppercase tracking-wide text-white/80">
                                {hero.helperText}
                            </span>
                        ) : null}
                    </div>
                </div>
            );
        }
        default:
            return null;
    }
}

function EmptyState() {
    return (
        <Card className="border-dashed bg-muted/30">
            <CardHeader className="items-center text-center">
                <CardTitle className="text-lg">No campuses yet</CardTitle>
                <CardDescription>
                    Create a campus to start assigning teachers and tracking progress.
                </CardDescription>
            </CardHeader>
        </Card>
    );
}

function StatusBadge({ status }: { status: CampusStatus }) {
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

function formatTeacherCount(count?: number) {
    if (typeof count !== "number") {
        return "Teacher metrics unavailable";
    }

    if (count === 0) {
        return "No teachers assigned yet";
    }

    if (count === 1) {
        return "1 teacher";
    }

    return `${count} teachers`;
}
