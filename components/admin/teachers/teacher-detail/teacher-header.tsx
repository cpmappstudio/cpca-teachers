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

    // Get teacher data from Convex
    const teacher = useQuery(api.users.getUser, { userId: teacherId as Id<"users"> });

    if (!teacher) {
        return null; // or a loading skeleton
    }

    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between px-2 md:px-0">
            <div className="space-y-1.5">
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                    {teacher.fullName}
                </h1>

            </div>
            <div className="flex items-center gap-3 pt-1">
                <Button variant="outline" className="gap-2" asChild>
                    <Link href={`/${locale}/admin/teachers`}>
                        <ArrowLeft className="h-4 w-4" />
                        Back to teachers
                    </Link>
                </Button>
                <TeacherDialog teacher={teacher} />
            </div>
        </div>
    );
}