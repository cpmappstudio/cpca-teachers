"use client"

import type { Id } from "@/convex/_generated/dataModel";
import { OverviewCard } from "@/components/ui/overview-card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Hash, GraduationCap, Calendar, FileText, Layers } from "lucide-react";
import { CurriculumLessonsCard } from "./curriculum-lessons-card";

interface CurriculumOverviewCardProps {
    curriculumId: string;
}

export function CurriculumOverviewCard({ curriculumId }: CurriculumOverviewCardProps) {
    // TODO: Get real curriculum data from Convex
    // For now, using mock data
    const mockCurriculum = {
        id: curriculumId,
        name: "Mathematics Grade 10",
        code: "MATH-10-001",
        description: "Advanced mathematics curriculum for 10th grade students, covering algebra, geometry, and trigonometry.",
        grade: "10th" as const,
        status: "active" as const,
        numberOfQuarters: 4,
        syllabus: "Complete syllabus covering all essential topics for grade 10 mathematics",
        lessonsCount: 45,
        createdAt: Date.now() - 180 * 24 * 60 * 60 * 1000, // 6 months ago
    };

    const statusStyles: Record<string, string> = {
        active: "bg-emerald-500/10 text-emerald-700",
        inactive: "bg-gray-500/15 text-gray-700",
        draft: "bg-amber-500/15 text-amber-700",
        archived: "bg-rose-500/20 text-rose-700",
    };

    const statusStyle = statusStyles[mockCurriculum.status] ?? statusStyles.draft;
    const createdDate = new Date(mockCurriculum.createdAt).toLocaleDateString();

    const rows = [
        {
            icon: <BookOpen className="h-4 w-4 text-primary" />,
            label: "Curriculum name",
            value: mockCurriculum.name
        },
        {
            icon: <Hash className="h-4 w-4 text-primary" />,
            label: "Code",
            value: mockCurriculum.code ?? "Not assigned"
        },
        {
            icon: <GraduationCap className="h-4 w-4 text-primary" />,
            label: "Grade level",
            value: `${mockCurriculum.grade} Grade`
        },
        {
            icon: <Layers className="h-4 w-4 text-primary" />,
            label: "Status",
            value: (
                <Badge className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyle}`}>
                    {mockCurriculum.status.charAt(0).toUpperCase() + mockCurriculum.status.slice(1)}
                </Badge>
            )
        },
        {
            icon: <Calendar className="h-4 w-4 text-primary" />,
            label: "Number of quarters",
            value: mockCurriculum.numberOfQuarters ?? "Not specified"
        },
        {
            icon: <FileText className="h-4 w-4 text-primary" />,
            label: "Description",
            value: mockCurriculum.description ?? "No description provided"
        }
    ];

    return (
        <div className="flex flex-col gap-6 w-full">
        <div className="w-full">
        <OverviewCard
            title="Curriculum overview"
            description="General information and curriculum details."
            imageStorageId={undefined}
            imageAlt={`${mockCurriculum.name} curriculum`}
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
