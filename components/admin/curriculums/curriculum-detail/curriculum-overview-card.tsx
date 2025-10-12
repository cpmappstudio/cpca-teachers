"use client"

import type { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { OverviewCard } from "@/components/ui/overview-card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Hash, GraduationCap, Calendar, FileText, Layers } from "lucide-react";
import { CurriculumLessonsCard } from "./curriculum-lessons-card";

interface CurriculumOverviewCardProps {
    curriculumId: string;
}

export function CurriculumOverviewCard({ curriculumId }: CurriculumOverviewCardProps) {
    // Get curriculum data from Convex
    const curriculum = useQuery(
        api.curriculums.getCurriculum,
        { curriculumId: curriculumId as Id<"curriculums"> }
    );

    // Show loading state while fetching data
    if (!curriculum) {
        return (
            <div className="flex flex-col gap-6 w-full">
                <div className="w-full">
                    <div className="h-96 w-full bg-muted animate-pulse rounded-lg" />
                </div>
            </div>
        );
    }

    const statusStyles: Record<string, string> = {
        active: "bg-emerald-500/10 text-emerald-700",
        draft: "bg-amber-500/15 text-amber-700",
        archived: "bg-rose-500/20 text-rose-700",
        deprecated: "bg-gray-500/15 text-gray-700",
    };

    const statusStyle = statusStyles[curriculum.status] ?? statusStyles.draft;
    const createdDate = new Date(curriculum.createdAt).toLocaleDateString();

    const rows = [
        {
            icon: <BookOpen className="h-4 w-4 text-primary" />,
            label: "Curriculum name",
            value: curriculum.name
        },
        {
            icon: <Hash className="h-4 w-4 text-primary" />,
            label: "Code",
            value: curriculum.code ?? "Not assigned"
        },
        {
            icon: <Layers className="h-4 w-4 text-primary" />,
            label: "Status",
            value: (
                <Badge className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyle}`}>
                    {curriculum.status.charAt(0).toUpperCase() + curriculum.status.slice(1)}
                </Badge>
            )
        },
        {
            icon: <Calendar className="h-4 w-4 text-primary" />,
            label: "Number of quarters",
            value: curriculum.numberOfQuarters ?? "Not specified"
        },
        {
            icon: <FileText className="h-4 w-4 text-primary" />,
            label: "Description",
            value: curriculum.description ?? "No description provided"
        },
        {
            icon: <Calendar className="h-4 w-4 text-primary" />,
            label: "Created on",
            value: createdDate
        }
    ];

    return (
        <div className="flex flex-col gap-6 w-full">
        <div className="w-full">
        <OverviewCard
            title="Curriculum overview"
            description="General information and curriculum details."
            imageStorageId={undefined}
            imageAlt={`${curriculum.name} curriculum`}
            fallbackIcon={<BookOpen className="h-8 w-8 text-muted-foreground" />}
            rows={rows}
            className="gap-2"
        />
        </div>
        <div className="w-full">
          <CurriculumLessonsCard curriculumId={curriculumId} />
        </div>
        </div>
        
    );
}
