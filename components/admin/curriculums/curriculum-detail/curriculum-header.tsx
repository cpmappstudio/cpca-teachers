"use client"

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useParams } from "next/navigation";
import { CurriculumDialog } from "../curriculum-dialog";

interface CurriculumHeaderProps {
    curriculumId: string;
}

export function CurriculumHeader({ curriculumId }: CurriculumHeaderProps) {
    const params = useParams();
    const locale = params.locale as string;

    // TODO: Create query to get curriculum by ID
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
    };

    const hasHero = false;
    const textColor = hasHero ? "text-white" : "text-foreground";
    const descriptionColor = hasHero ? "text-sm text-white/90" : "text-sm text-muted-foreground";
    const subtitle = `${mockCurriculum.code} • ${mockCurriculum.grade} Grade`;

    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between px-2 md:px-0">
            <div className="space-y-1.5">
                <h1 className={`text-2xl md:text-3xl font-semibold tracking-tight ${textColor}`}>
                    {mockCurriculum.name}
                </h1>
                <p className={`${descriptionColor} leading-relaxed`}>{subtitle}</p>
            </div>
            <div className="flex items-center gap-3 pt-1">
                <Button variant="outline" className="gap-2" asChild>
                    <Link href={`/${locale}/admin/curriculums`}>
                        <ArrowLeft className="h-4 w-4" />
                        Back to curriculums
                    </Link>
                </Button>
                <CurriculumDialog curriculum={mockCurriculum} />
            </div>
        </div>
    );
}
