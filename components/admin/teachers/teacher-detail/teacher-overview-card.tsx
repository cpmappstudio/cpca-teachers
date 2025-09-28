"use client"

import type { Id } from "@/convex/_generated/dataModel";
import { OverviewCard } from "@/components/ui/overview-card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, Building2, Calendar, UserCheck } from "lucide-react";

interface TeacherOverviewCardProps {
    teacherId: string;
}

export function TeacherOverviewCard({ teacherId }: TeacherOverviewCardProps) {
    // TODO: Get real teacher data from Convex
    // For now, using mock data
    const mockTeacher = {
        _id: teacherId as Id<"users">,
        fullName: "María García López",
        firstName: "María",
        lastName: "García López",
        email: "maria.garcia@alefuniversity.edu",
        phone: "+34 612 345 678",
        role: "teacher" as const,
        status: "active" as const,
        campusId: undefined,
        createdAt: Date.now() - 365 * 24 * 60 * 60 * 1000, // 1 year ago
        progressMetrics: {
            totalLessons: 45,
            completedLessons: 38,
            progressPercentage: 84,
            lastUpdated: Date.now() - 24 * 60 * 60 * 1000 // 1 day ago
        },
        avatarStorageId: undefined
    };

    const statusStyles: Record<string, string> = {
        active: "bg-emerald-500/10 text-emerald-700",
        inactive: "bg-gray-500/15 text-gray-700",
        on_leave: "bg-amber-500/15 text-amber-700",
        terminated: "bg-rose-500/20 text-rose-700",
    };

    const statusStyle = statusStyles[mockTeacher.status] ?? statusStyles.inactive;
    const joinedDate = new Date(mockTeacher.createdAt).toLocaleDateString();

    const rows = [
        {
            icon: <User className="h-4 w-4 text-primary" />,
            label: "Full name",
            value: mockTeacher.fullName
        },
        {
            icon: <Mail className="h-4 w-4 text-primary" />,
            label: "Email",
            value: mockTeacher.email
        },
        {
            icon: <Phone className="h-4 w-4 text-primary" />,
            label: "Phone",
            value: mockTeacher.phone ?? "Not provided"
        },
        {
            icon: <UserCheck className="h-4 w-4 text-primary" />,
            label: "Status",
            value: (
                <Badge className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyle}`}>
                    {mockTeacher.status.replace("_", " ")}
                </Badge>
            )
        },
        {
            icon: <Building2 className="h-4 w-4 text-primary" />,
            label: "Campus",
            value: mockTeacher.campusId ? "Main Campus" : "Not assigned"
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
            imageStorageId={mockTeacher.avatarStorageId}
            imageAlt={`${mockTeacher.fullName} profile picture`}
            fallbackIcon={<User className="h-8 w-8 text-muted-foreground" />}
            rows={rows}
            className="gap-2"
        />
    );
}