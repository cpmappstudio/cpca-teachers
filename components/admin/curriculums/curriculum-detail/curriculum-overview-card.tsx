"use client"

import type { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { OverviewCard } from "@/components/ui/overview-card";
import { Badge } from "@/components/ui/badge";
import { Book, Hash, Calendar, FileText, Layers, MapPin, Users, GraduationCap } from "lucide-react";
import { CurriculumLessonsCard } from "./curriculum-lessons-card";
import { useRouter, useParams } from "next/navigation";

interface CurriculumOverviewCardProps {
    curriculumId: string;
}

export function CurriculumOverviewCard({ curriculumId }: CurriculumOverviewCardProps) {
    const router = useRouter();
    const params = useParams();
    const locale = params.locale as string;

    // Get curriculum data from Convex
    const curriculum = useQuery(
        api.curriculums.getCurriculum,
        { curriculumId: curriculumId as Id<"curriculums"> }
    );

    // Get campus and teacher details for campus assignments
    const campusAssignmentsDetails = useQuery(
        api.curriculums.getCurriculumCampusAssignments,
        curriculum ? { curriculumId: curriculumId as Id<"curriculums"> } : "skip"
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
            icon: <Book className="h-4 w-4 text-primary" />,
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
        },
        // Campus Assignments
        ...(campusAssignmentsDetails && campusAssignmentsDetails.length > 0 ? [{
            icon: <MapPin className="h-4 w-4 text-primary" />,
            label: "Campus Assignments",
            value: (
                <div className="space-y-3 w-full">
                    {campusAssignmentsDetails.map((assignment, index) => (
                        <div key={assignment.campusId} className="border rounded-lg p-3 bg-muted/30">
                            <div className="flex items-center gap-2 mb-2">
                                <MapPin className="h-4 w-4 text-primary" />
                                <span className="font-medium">{assignment.campusName}</span>
                                {assignment.campusCode && (
                                    <Badge variant="outline" className="text-xs">
                                        {assignment.campusCode}
                                    </Badge>
                                )}
                            </div>

                            {/* Teachers */}
                            {assignment.teachers.length > 0 && (
                                <div className="ml-6 mb-2">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                        <Users className="h-3 w-3" />
                                        <span className="font-medium">Teachers:</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 ml-5">
                                        {assignment.teachers.map((teacher: any) => (
                                            <Badge
                                                key={teacher._id}
                                                variant="secondary"
                                                className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
                                                onClick={() => router.push(`/${locale}/admin/teachers/${teacher._id}`)}
                                            >
                                                {teacher.fullName}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Grades */}
                            {assignment.gradeNames.length > 0 && (
                                <div className="ml-6">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                        <GraduationCap className="h-3 w-3" />
                                        <span className="font-medium">Grades:</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 ml-5">
                                        {assignment.gradeNames.map((gradeName, idx) => (
                                            <Badge key={idx} variant="outline" className="text-xs">
                                                {gradeName}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* No teachers or grades assigned */}
                            {assignment.teachers.length === 0 && assignment.gradeNames.length === 0 && (
                                <div className="ml-6 text-sm text-muted-foreground">
                                    No teachers or grades assigned yet
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )
        }] : [])
    ];

    return (
        <div className="flex flex-col gap-6 w-full">
            <div className="w-full">
                <OverviewCard
                    title="Curriculum overview"
                    description="General information and curriculum details."
                    imageStorageId={undefined}
                    imageAlt={`${curriculum.name} curriculum`}
                    fallbackIcon={<Book className="h-8 w-8 text-muted-foreground" />}
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
