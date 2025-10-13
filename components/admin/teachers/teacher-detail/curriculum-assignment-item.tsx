"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import {
    ExternalLink,
    FileText,
    Image as ImageIcon,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import {
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
} from "@/components/ui/accordion";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { RadialBar, RadialBarChart } from "recharts";
import {
    ChartConfig,
    ChartContainer,
} from "@/components/ui/chart";
import Image from "next/image";

// Type for assignment with progress
type TeacherAssignmentWithProgress = {
    _id: Id<"teacher_assignments">;
    assignmentId: Id<"teacher_assignments">;
    assignmentType: "primary" | "substitute" | "assistant" | "co_teacher";
    assignmentStatus: "active" | "pending" | "completed" | "cancelled";
    academicYear: string;
    startDate: number;
    endDate?: number;

    // Curriculum info
    curriculumId: Id<"curriculums">;
    curriculumName: string;
    curriculumCode?: string;
    curriculumStatus: "draft" | "active" | "archived" | "deprecated";
    numberOfQuarters: number;

    // Campus info
    campusId: Id<"campuses">;
    campusName: string;

    // Grade info
    grade: {
        id: Id<"grades">;
        name: string;
        level: number;
        code: string;
    } | null;

    // Real progress summary
    progressSummary: {
        totalLessons: number;
        completedLessons: number;
        inProgressLessons: number;
        notStartedLessons: number;
        progressPercentage: number;
        lastLessonDate?: number;
        lastUpdated: number;
    };

    // Progress by quarter
    progressByQuarter: Record<number, {
        total: number;
        completed: number;
        inProgress: number;
        notStarted: number;
    }>;

    // For compatibility
    name: string;
    code?: string;
    status: "draft" | "active" | "archived" | "deprecated";
    lessonsCount: number;
    quarters: number;
};

interface CurriculumAssignmentItemProps {
    assignment: TeacherAssignmentWithProgress;
    onViewEvidence: (storageId: Id<"_storage">, title: string, type: "image" | "pdf") => void;
}

export function CurriculumAssignmentItem({
    assignment,
    onViewEvidence,
}: CurriculumAssignmentItemProps) {
    const router = useRouter();
    const params = useParams();
    const locale = params.locale as string;

    // Get detailed lesson progress when curriculum is expanded
    const assignmentLessonProgress = useQuery(
        api.progress.getAssignmentLessonProgress,
        { assignmentId: assignment._id }
    );

    const progressByQuarter = assignment.progressByQuarter || {};
    const lessons = assignmentLessonProgress
        ? assignmentLessonProgress.lessons
        : [];

    const getStatusText = (status: string) => {
        switch (status) {
            case "completed":
                return "Completed";
            case "in_progress":
                return "In Progress";
            case "not_started":
                return "Pending";
            default:
                return "Pending";
        }
    };

    return (
        <AccordionItem value={assignment._id} className="border bg-card shadow-sm">
            <AccordionTrigger className="hover:no-underline px-4 py-4 hover:bg-muted/50">
                <div className="flex items-start justify-between w-full">
                    <div className="flex flex-col items-start gap-2 flex-1 min-w-0">
                        {/* Title row */}
                        <div className="flex items-center gap-2 flex-wrap w-full">
                            <span className="font-semibold text-sm md:text-base">
                                {assignment.name}
                            </span>
                            {assignment.code && (
                                <Badge variant="outline" className="text-xs shrink-0">
                                    {assignment.code}
                                </Badge>
                            )}
                            <CurriculumStatusBadge status={assignment.status} />
                        </div>

                        {/* View Details button */}
                        <span
                            className="inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-7 px-2 md:px-3 cursor-pointer shrink-0"
                            onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/${locale}/admin/curriculums/${assignment.curriculumId}`);
                            }}
                        >
                            <ExternalLink className="h-3 w-3" />
                            <span className="hidden sm:inline">View Details</span>
                            <span className="sm:hidden">Details</span>
                        </span>

                        {/* Grade badge */}
                        {assignment.grade && (
                            <Badge className="bg-sky-500/15 text-sky-700 border border-sky-200 text-xs px-2 py-0.5 shrink-0">
                                {assignment.grade.name}
                            </Badge>
                        )}
                    </div>

                    {/* Progress Stats - Right side */}
                    <div className="flex flex-col items-end gap-1 text-xs text-right shrink-0 ml-4">
                        <span className="text-muted-foreground whitespace-nowrap">
                            {assignment.progressSummary.completedLessons}/{assignment.progressSummary.totalLessons} lessons
                        </span>
                        <span className="font-semibold text-primary whitespace-nowrap">
                            {assignment.progressSummary.progressPercentage}% complete
                        </span>
                    </div>
                </div>
            </AccordionTrigger>

            <AccordionContent className="border-t px-4 pb-4">
                {/* Simple Tabs for Quarters */}
                <Tabs defaultValue="1" className="w-full">
                    <div className="w-full overflow-x-auto">
                        <TabsList className="inline-flex w-auto min-w-full">
                            {[1, 2, 3, 4].slice(0, assignment.numberOfQuarters).map((quarterNum) => {
                                const quarterData = progressByQuarter[quarterNum] || {
                                    total: 0,
                                    completed: 0,
                                    inProgress: 0,
                                    notStarted: 0,
                                };
                                const quarterProgress = quarterData.total > 0
                                    ? Math.round((quarterData.completed / quarterData.total) * 100)
                                    : 0;

                                const chartData = [{
                                    progress: quarterProgress,
                                    fill: "var(--sidebar-accent)"
                                }];

                                const chartConfig = {
                                    progress: {
                                        label: "Progress",
                                        color: "var(--sidebar-accent)",
                                    },
                                } satisfies ChartConfig;

                                return (
                                    <TabsTrigger
                                        key={quarterNum}
                                        value={quarterNum.toString()}
                                        className="flex items-center gap-0"
                                    >
                                        <div className="w-8 h-8">
                                            <ChartContainer config={chartConfig} className="w-full h-full">
                                                <RadialBarChart
                                                    data={chartData}
                                                    innerRadius="60%"
                                                    outerRadius="100%"
                                                >
                                                    <RadialBar
                                                        dataKey="progress"
                                                        background
                                                        cornerRadius={3}
                                                    />
                                                </RadialBarChart>
                                            </ChartContainer>
                                        </div>
                                        <span className="font-semibold text-sm">Quarter {quarterNum}</span>
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>
                    </div>

                    {/* Tab Content: Lessons by Quarter */}
                    {[1, 2, 3, 4].slice(0, assignment.numberOfQuarters).map((quarterNum) => {
                        const quarterLessons = lessons.filter(
                            (lesson) => lesson.quarter === quarterNum
                        );

                        return (
                            <TabsContent key={quarterNum} value={quarterNum.toString()} className="">
                                <div className="space-y-2">
                                    {quarterLessons.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground text-sm">
                                            No lessons in this quarter
                                        </div>
                                    ) : (
                                        quarterLessons.map((lesson) => {
                                            const hasEvidence = !!lesson.progress?.evidencePhotoStorageId || !!lesson.progress?.evidenceDocumentStorageId;
                                            const evidenceStorageId = lesson.progress?.evidencePhotoStorageId || lesson.progress?.evidenceDocumentStorageId;
                                            const evidenceType = lesson.progress?.evidencePhotoStorageId ? "image" : "pdf";

                                            return (
                                                <Card
                                                    key={lesson.lessonId}
                                                    className={`transition-all bg-popover py-0 ${hasEvidence
                                                        ? "border-green-200 bg-green-50/50"
                                                        : "border-gray-200"
                                                        }`}
                                                >
                                                    <CardContent className="p-3 sm:p-4">
                                                        {/* Mobile Layout */}
                                                        <div className="flex gap-3 sm:hidden">
                                                            {/* Left: Evidence Preview */}
                                                            {hasEvidence && evidenceStorageId ? (
                                                                <button
                                                                    onClick={() => onViewEvidence(
                                                                        evidenceStorageId,
                                                                        lesson.title,
                                                                        evidenceType
                                                                    )}
                                                                    className="shrink-0 w-16 h-16 rounded-md border-2 border-green-300 overflow-hidden bg-green-50 hover:border-green-500 transition-colors flex items-center justify-center"
                                                                >
                                                                    {evidenceType === "image" ? (
                                                                        <EvidencePreview storageId={evidenceStorageId} type="image" />
                                                                    ) : (
                                                                        <div className="flex flex-col items-center justify-center gap-1">
                                                                            <FileText className="h-6 w-6 text-green-700" />
                                                                            <span className="text-[10px] text-green-700 font-medium">PDF</span>
                                                                        </div>
                                                                    )}
                                                                </button>
                                                            ) : (
                                                                <div className="shrink-0 w-16 h-16 rounded-md border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                                                                    <div className="flex flex-col items-center justify-center gap-0.5">
                                                                        <ImageIcon className="h-5 w-5 text-gray-400" />
                                                                        <span className="text-[9px] text-gray-400 font-medium">No file</span>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Right: Content with title top, details bottom right */}
                                                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                                                                {/* Top: Title and Status */}
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <span className="font-medium text-sm break-words flex-1">
                                                                        {lesson.orderInQuarter}. {lesson.title}
                                                                    </span>
                                                                    <Badge
                                                                        variant={hasEvidence ? "default" : "secondary"}
                                                                        className="text-xs shrink-0"
                                                                    >
                                                                        {lesson.progress?.status
                                                                            ? getStatusText(lesson.progress.status)
                                                                            : "Pending"}
                                                                    </Badge>
                                                                </div>

                                                                {/* Bottom: Details button aligned right */}
                                                                <div className="flex justify-end">
                                                                    <span
                                                                        className="inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-7 px-3 cursor-pointer border"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            router.push(`/${locale}/admin/lessons/${lesson.lessonId}`);
                                                                        }}
                                                                    >
                                                                        <ExternalLink className="h-3 w-3" />
                                                                        <span>Details</span>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Desktop Layout (unchanged) */}
                                                        <div className="hidden sm:flex items-start gap-3">
                                                            {/* Evidence Preview Thumbnail */}
                                                            {hasEvidence && evidenceStorageId ? (
                                                                <button
                                                                    onClick={() => onViewEvidence(
                                                                        evidenceStorageId,
                                                                        lesson.title,
                                                                        evidenceType
                                                                    )}
                                                                    className="shrink-0 w-16 h-16 rounded-md border-2 border-green-300 overflow-hidden bg-green-50 hover:border-green-500 transition-colors flex items-center justify-center group"
                                                                >
                                                                    {evidenceType === "image" ? (
                                                                        <EvidencePreview storageId={evidenceStorageId} type="image" />
                                                                    ) : (
                                                                        <div className="flex flex-col items-center justify-center gap-1">
                                                                            <FileText className="h-6 w-6 text-green-700" />
                                                                            <span className="text-[10px] text-green-700 font-medium">PDF</span>
                                                                        </div>
                                                                    )}
                                                                </button>
                                                            ) : (
                                                                <div className="shrink-0 w-16 h-16 rounded-md border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                                                                    <div className="flex flex-col items-center justify-center gap-0.5">
                                                                        <ImageIcon className="h-5 w-5 text-gray-400" />
                                                                        <span className="text-[9px] text-gray-400 font-medium">No file</span>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Lesson Content */}
                                                            <div className="flex-1 min-w-0 space-y-2">
                                                                <div className="flex items-start gap-2">
                                                                    <span className="font-medium text-sm break-words">
                                                                        {lesson.orderInQuarter}. {lesson.title}
                                                                    </span>
                                                                </div>

                                                                {/* View Details Button */}
                                                                <span
                                                                    className="inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-7 px-2 cursor-pointer shrink-0"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        router.push(`/${locale}/admin/lessons/${lesson.lessonId}`);
                                                                    }}
                                                                >
                                                                    <ExternalLink className="h-3 w-3" />
                                                                    <span>View Details</span>
                                                                </span>

                                                                {lesson.description && (
                                                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                                                        {lesson.description}
                                                                    </p>
                                                                )}
                                                            </div>

                                                            {/* Status Badge */}
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <Badge
                                                                    variant={hasEvidence ? "default" : "secondary"}
                                                                    className="text-xs"
                                                                >
                                                                    {lesson.progress?.status
                                                                        ? getStatusText(lesson.progress.status)
                                                                        : "Pending"}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })
                                    )}
                                </div>
                            </TabsContent>
                        );
                    })}
                </Tabs>
            </AccordionContent>
        </AccordionItem>
    );
}

// Component to preview evidence thumbnail
function EvidencePreview({ storageId, type }: { storageId: Id<"_storage">, type: "image" | "pdf" }) {
    const url = useQuery(api.progress.getStorageUrl, { storageId });

    if (!url) {
        return <div className="w-full h-full bg-muted animate-pulse" />;
    }

    if (type === "image") {
        return (
            <Image
                src={url}
                alt="Evidence"
                fill
                className="object-cover"
                sizes="64px"
                unoptimized
            />
        );
    }

    return null;
}

function CurriculumStatusBadge({
    status,
}: {
    status: "draft" | "active" | "archived" | "deprecated";
}) {
    const styles: Record<string, string> = {
        active: "bg-emerald-500/10 text-emerald-700",
        draft: "bg-amber-500/15 text-amber-700",
        archived: "bg-rose-500/20 text-rose-700",
        deprecated: "bg-gray-500/15 text-gray-700",
    };

    const capitalize = (str: string) =>
        str.charAt(0).toUpperCase() + str.slice(1);

    return (
        <Badge
            className={`rounded-full px-3 py-0.5 text-xs font-medium inline-flex ${styles[status] ?? styles.draft}`}
        >
            {capitalize(status)}
        </Badge>
    );
}
