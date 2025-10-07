"use client"

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useParams } from "next/navigation";
import { TeacherDialog } from "../teacher-dialog";

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
        _creationTime: Date.now(),
        clerkId: "clerk_2abc123def456",
        email: "maria.garcia@alefuniversity.edu",
        firstName: "María",
        lastName: "García López",
        fullName: "María García López",
        avatarStorageId: undefined,
        phone: "+1 (555) 123-4567",
        role: "teacher" as const,
        campusId: undefined,
        isActive: true,
        status: "active" as const,
        progressMetrics: {
            totalLessons: 120,
            completedLessons: 96,
            progressPercentage: 80,
            lastUpdated: Date.now(),
        },
        createdAt: Date.now(),
        createdBy: undefined,
        updatedAt: undefined,
        lastLoginAt: Date.now(),
        hashedPassword: undefined,
    };

    const subtitle = `${mockTeacher.role} profile and progress overview`;

    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between px-2 md:px-0">
            <div className="space-y-1.5">
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                    {mockTeacher.fullName}
                </h1>
                <p className="text-sm text-muted-foreground capitalize leading-relaxed">
                    {subtitle}
                </p>
            </div>
            <div className="flex items-center gap-3 pt-1">
                <Button variant="outline" className="gap-2" asChild>
                    <Link href={`/${locale}/admin/teachers`}>
                        <ArrowLeft className="h-4 w-4" />
                        Back to teachers
                    </Link>
                </Button>
                <TeacherDialog teacher={mockTeacher} />
            </div>
        </div>
    );
}