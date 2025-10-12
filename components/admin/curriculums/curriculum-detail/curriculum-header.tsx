"use client"

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { CurriculumDialog } from "../curriculum-dialog";
import type { UserRole } from "@/convex/types";

interface CurriculumHeaderProps {
    curriculumId: string;
}

// Helper function to extract role from user object (client-safe)
function getUserRole(user: any): UserRole | null {
    if (!user) return null

    const publicMeta = user.publicMetadata
    const privateMeta = user.privateMetadata
    const unsafeMeta = user.unsafeMetadata

    const role = publicMeta?.role ?? privateMeta?.role ?? unsafeMeta?.role

    return (role as UserRole) ?? null
}

export function CurriculumHeader({ curriculumId }: CurriculumHeaderProps) {
    const params = useParams();
    const locale = params.locale as string;
    const { user } = useUser();

    const userRole = getUserRole(user);

    // Get curriculum data from Convex
    const curriculum = useQuery(
        api.curriculums.getCurriculum,
        { curriculumId: curriculumId as Id<"curriculums"> }
    );

    // Show loading state while fetching data
    if (!curriculum) {
        return (
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between px-2 md:px-0">
                <div className="space-y-1.5">
                    <div className="h-8 w-64 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                </div>
            </div>
        );
    }

    const hasHero = false;
    const textColor = hasHero ? "text-white" : "text-foreground";
    const descriptionColor = hasHero ? "text-sm text-white/90" : "text-sm text-muted-foreground";
    const subtitle = curriculum.code ? `${curriculum.code} • ${curriculum.numberOfQuarters} Quarters` : `${curriculum.numberOfQuarters} Quarters`;

    // Determine back URL based on user role
    const backUrl = userRole === 'teacher'
        ? `/${locale}/teaching`
        : `/${locale}/admin/curriculums`;

    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between px-2 md:px-0">
            <div className="space-y-1.5">
                <h1 className={`text-2xl md:text-3xl font-semibold tracking-tight ${textColor}`}>
                    {curriculum.name}
                </h1>
            </div>
            <div className="flex items-center gap-3 pt-1">
                <Button variant="outline" className="gap-2" asChild>
                    <Link href={backUrl}>
                        <ArrowLeft className="h-4 w-4" />
                        Back to curriculums
                    </Link>
                </Button>
                <CurriculumDialog curriculum={curriculum} />
            </div>
        </div>
    );
}
