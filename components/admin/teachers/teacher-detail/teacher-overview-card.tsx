"use client"

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { OverviewCard } from "@/components/ui/overview-card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, Building2, Calendar, UserCheck } from "lucide-react";

interface TeacherOverviewCardProps {
    teacherId: string;
}

export function TeacherOverviewCard({ teacherId }: TeacherOverviewCardProps) {
    // Get real teacher data from Convex
    const teacher = useQuery(api.users.getUser, { userId: teacherId as Id<"users"> });

    if (!teacher) {
        return null; // or a loading skeleton
    }

    const statusStyles: Record<string, string> = {
        active: "bg-emerald-500/10 text-emerald-700",
        inactive: "bg-gray-500/15 text-gray-700",
        on_leave: "bg-amber-500/15 text-amber-700",
        terminated: "bg-rose-500/20 text-rose-700",
    };

    const statusStyle = statusStyles[teacher.status] ?? statusStyles.inactive;
    const joinedDate = teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString() : "-";

    const rows = [
        {
            icon: <User className="h-4 w-4 text-primary" />,
            label: "Full name",
            value: teacher.fullName
        },
        {
            icon: <Mail className="h-4 w-4 text-primary" />,
            label: "Email",
            value: teacher.email
        },
        {
            icon: <Phone className="h-4 w-4 text-primary" />,
            label: "Phone",
            value: teacher.phone ?? "Not provided"
        },
        {
            icon: <UserCheck className="h-4 w-4 text-primary" />,
            label: "Status",
            value: (
                <Badge className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyle}`}>
                    {teacher.status.replace("_", " ")}
                </Badge>
            )
        },
        {
            icon: <Building2 className="h-4 w-4 text-primary" />,
            label: "Campus",
            value: teacher.campusId ? "Assigned to campus" : "Not assigned"
        },
        {
            icon: <Calendar className="h-4 w-4 text-primary" />,
            label: "Joined",
            value: joinedDate
        }
    ];

    return (
        <OverviewCard
            title="Teacher profile"
            description="Personal information and contact details."
            imageStorageId={teacher.avatarStorageId}
            imageAlt={`${teacher.fullName} profile picture`}
            fallbackIcon={<User className="h-8 w-8 text-muted-foreground" />}
            rows={rows}
            className="gap-2"
        />
    );
}