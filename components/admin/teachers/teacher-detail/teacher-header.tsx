"use client"

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useParams } from "next/navigation";
// import { TeacherDialog } from "../teacher-dialog"; // TODO: Create teacher dialog

interface TeacherHeaderProps {
    teacherId: string;
}

export function TeacherHeader({ teacherId }: TeacherHeaderProps) {
    const params = useParams();
    const locale = params.locale as string;

    // TODO: Create query to get teacher by ID
    // For now, using mock data
    const mockTeacher = {
        _id: teacherId as Id<"users">,
        fullName: "María García López",
        email: "maria.garcia@alefuniversity.edu",
        role: "teacher" as const,
        status: "active" as const,
        campusId: undefined
    };

    const hasHero = false;
    const textColor = hasHero ? "text-white" : "text-foreground";
    const descriptionColor = hasHero ? "text-sm text-white/90" : "text-sm text-muted-foreground";
    const subtitle = `${mockTeacher.role} profile and progress overview`;

    return (
        <div className="mx-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
                <h1 className={`text-3xl font-semibold tracking-tight ${textColor}`}>
                    {mockTeacher.fullName}
                </h1>
                <p className={`${descriptionColor} font-semibold capitalize`}>
                    {subtitle}
                </p>
            </div>
            <div className="flex items-center gap-3">
                <Button variant="outline" className="gap-2" asChild>
                    <Link href={`/${locale}/admin/teachers`}>
                        <ArrowLeft className="h-4 w-4" />
                        Back to teachers
                    </Link>
                </Button>
                {/* TODO: Add TeacherDialog component */}
                {/* <TeacherDialog teacher={mockTeacher} /> */}
            </div>
        </div>
    );
}