"use client";

import { useMemo, useState } from "react";
import type { CampusOverview } from "@/lib/campuses/campus-overview";
import type { CampusStatus } from "@/convex/types";
import { CampusesHeader } from "./campuses-header";
import { CampusesGrid } from "./campuses-grid";

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
        <div className="flex-1 space-y-6">
            <CampusesHeader
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