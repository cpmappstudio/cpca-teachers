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
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";

// Type for progress by grade
type ProgressByGrade = {
    gradeCode?: string;
    groupCode?: string;
    evidenceDocumentStorageId?: Id<"_storage">;
    evidencePhotoStorageId?: Id<"_storage">;
    status?: string;
    completedAt?: number;
};

// Type for lesson with progress
type LessonWithProgress = {
    lessonId: Id<"curriculum_lessons">;
    title: string;
    description?: string;
    quarter: number;
    orderInQuarter: number;
    isMandatory: boolean;
    objectives?: string[];
    totalGrades?: number;
    completionPercentage?: number;
    progressByGrade?: ProgressByGrade[];
    progress?: {
        progressId?: Id<"lesson_progress">;
        status?: "completed" | "not_started" | "in_progress" | "skipped" | "rescheduled";
        completedAt?: number;
        scheduledDate?: number;
        evidencePhotoStorageId?: Id<"_storage">;
        evidenceDocumentStorageId?: Id<"_storage">;
    } | null;
    overallStatus?: string;
};

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
    gradeNames: string[]; // Grade names from curriculum campus assignments

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
}: CurriculumAssignmentItemProps) {
    const router = useRouter();
    const params = useParams();
    const locale = params.locale as string;

    // Dialog state for viewing evidence
    const [evidenceDialogOpen, setEvidenceDialogOpen] = React.useState(false);
    const [selectedLesson, setSelectedLesson] = React.useState<LessonWithProgress | null>(null);

    // State for selected grade
    const [selectedGrade, setSelectedGrade] = React.useState<string | null>(null);

    // Get detailed lesson progress when curriculum is expanded
    const assignmentLessonProgress = useQuery(
        api.progress.getAssignmentLessonProgress,
        { assignmentId: assignment._id }
    );

    const lessons = React.useMemo(() => {
        return assignmentLessonProgress
            ? assignmentLessonProgress.lessons
            : [];
    }, [assignmentLessonProgress]);

    // Get assigned grades and groups
    const assignedGrades = React.useMemo(() => {
        return assignmentLessonProgress?.grades || [];
    }, [assignmentLessonProgress]);

    const assignedGroupCodes = assignmentLessonProgress?.assignedGroupCodes || [];
    const hasMultipleGrades = assignedGrades.length > 1;

    // Calculate overall progress from lessons
    const overallProgress = React.useMemo(() => {
        if (lessons.length === 0) return 0;

        let totalCompletionScore = 0;
        lessons.forEach((lesson: Record<string, unknown>) => {
            totalCompletionScore += (typeof lesson.completionPercentage === 'number' ? lesson.completionPercentage : 0);
        });

        return Math.round(totalCompletionScore / lessons.length);
    }, [lessons]);

    // Initialize selected grade when data loads
    React.useEffect(() => {
        if (assignedGrades.length > 0 && !selectedGrade) {
            setSelectedGrade(assignedGrades[0].code);
        }
    }, [assignedGrades, selectedGrade]);



    return (
        <AccordionItem value={assignment._id} className="border bg-card shadow-sm mb-0">
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

                        {/* Grades */}
                        {assignment.gradeNames && assignment.gradeNames.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-muted-foreground">
                                    Grades:
                                </span>
                                {assignment.gradeNames.map((gradeName, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                        {gradeName}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right side - View Details button and Progress Stats */}
                    <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
                        {/* View Details button - Top */}
                        <span
                            className="inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-7 px-2 md:px-3 cursor-pointer shrink-0 border"
                            onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/${locale}/admin/curriculums/${assignment.curriculumId}`);
                            }}
                        >
                            <ExternalLink className="h-3 w-3" />
                            <span className="hidden sm:inline">View Details</span>
                            <span className="sm:hidden">Details</span>
                        </span>

                        {/* Progress Stats - Bottom (horizontal) */}
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground whitespace-nowrap">
                                {lessons.length} lessons
                            </span>
                            <span className="font-semibold text-primary whitespace-nowrap hidden sm:inline">
                                {overallProgress}% complete
                            </span>
                        </div>
                    </div>
                </div>
            </AccordionTrigger>

            <AccordionContent className="border-t px-4 pb-4">
                {/* Grade Selection Tabs (if multiple grades) */}
                {hasMultipleGrades && assignedGrades.length > 0 && (
                    <div className="mb-4">
                        <Tabs value={selectedGrade || assignedGrades[0].code} onValueChange={setSelectedGrade}>
                            <TabsList className="w-full">
                                {assignedGrades.map((grade: { code: string; name: string }) => (
                                    <TabsTrigger
                                        key={grade.code}
                                        value={grade.code}
                                        className="flex-1"
                                    >
                                        {grade.name}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                    </div>
                )}

                {/* Simple Tabs for Quarters */}
                <Tabs defaultValue="1" className="w-full">
                    <div className="w-full overflow-x-auto">
                        <TabsList className="inline-flex w-auto min-w-full">
                            {[1, 2, 3, 4].slice(0, assignment.numberOfQuarters).map((quarterNum) => {
                                // Filter lessons by quarter and selected grade
                                const quarterLessons = lessons.filter((l: Record<string, unknown>) => {
                                    if (l.quarter !== quarterNum) return false;

                                    // If teacher has multiple grades, filter by selected grade
                                    if (hasMultipleGrades && selectedGrade) {
                                        if (l.gradeCodes && Array.isArray(l.gradeCodes) && l.gradeCodes.length > 0) {
                                            return (l.gradeCodes as string[]).includes(selectedGrade);
                                        }
                                        if (l.gradeCode) {
                                            return l.gradeCode === selectedGrade;
                                        }
                                    }

                                    return true;
                                });                                // Calculate quarter progress with incremental completion
                                const total = quarterLessons.length;
                                let totalCompletionScore = 0;

                                quarterLessons.forEach((l: Record<string, unknown>) => {
                                    if (hasMultipleGrades && selectedGrade) {
                                        // Filter groups for selected grade
                                        const groupsForSelectedGrade = assignedGroupCodes.filter(
                                            (groupCode: string) => groupCode.startsWith(selectedGrade + "-")
                                        );

                                        // Count completed groups for this grade
                                        const completedGroupsForGrade = Array.isArray(l.progressByGrade)
                                            ? l.progressByGrade.filter((p: Record<string, unknown>) =>
                                                groupsForSelectedGrade.includes(p.groupCode as string || '') &&
                                                (p.evidenceDocumentStorageId || p.evidencePhotoStorageId)
                                            ).length
                                            : 0;

                                        // Calculate percentage for this lesson
                                        const lessonCompletionPercentage = groupsForSelectedGrade.length > 0
                                            ? (completedGroupsForGrade / groupsForSelectedGrade.length) * 100
                                            : 0;

                                        totalCompletionScore += lessonCompletionPercentage;
                                    } else {
                                        // Use overall completion percentage from backend
                                        totalCompletionScore += (typeof l.completionPercentage === 'number' ? l.completionPercentage : 0);
                                    }
                                });

                                const quarterProgress = total > 0
                                    ? Math.round(totalCompletionScore / total)
                                    : 0;

                                // Calculate end angle based on progress (0% = 90, 100% = -270)
                                // Full circle is 360 degrees, so we need to map 0-100% to that range
                                const startAngle = 90;
                                const endAngle = 90 - (quarterProgress * 3.6); // 360 degrees / 100 = 3.6 degrees per percent

                                const chartData = [{
                                    progress: 100, // Always use 100 as the value
                                    fill: "hsl(var(--primary))"
                                }];

                                const chartConfig = {
                                    progress: {
                                        label: "Progress",
                                        color: "hsl(var(--primary))",
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
                                                    startAngle={startAngle}
                                                    endAngle={endAngle}
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
                        // Filter lessons by quarter and selected grade
                        const quarterLessons = lessons.filter((lesson) => {
                            if (lesson.quarter !== quarterNum) return false;

                            // If teacher has multiple grades, filter by selected grade
                            if (hasMultipleGrades && selectedGrade) {
                                if (lesson.gradeCodes && lesson.gradeCodes.length > 0) {
                                    return lesson.gradeCodes.includes(selectedGrade);
                                }
                                if (lesson.gradeCode) {
                                    return lesson.gradeCode === selectedGrade;
                                }
                            }

                            return true;
                        });

                        return (
                            <TabsContent key={quarterNum} value={quarterNum.toString()} className="">
                                <div className="space-y-2">
                                    {quarterLessons.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground text-sm">
                                            No lessons in this quarter
                                        </div>
                                    ) : (
                                        quarterLessons.map((lesson) => {
                                            // Calculate completion percentage for selected grade
                                            const progressByGrade = lesson.progressByGrade || [];

                                            let displayCompletionPercentage = lesson.completionPercentage || 0;

                                            // If teacher has multiple grades and one is selected, calculate for that grade only
                                            if (hasMultipleGrades && selectedGrade) {
                                                const groupsForSelectedGrade = assignedGroupCodes.filter(
                                                    (groupCode: string) => groupCode.startsWith(selectedGrade + "-")
                                                );

                                                const completedGroupsForGrade = progressByGrade.filter((p: Record<string, unknown>) =>
                                                    groupsForSelectedGrade.includes(p.groupCode as string || '') &&
                                                    (p.evidenceDocumentStorageId || p.evidencePhotoStorageId)
                                                ).length;

                                                displayCompletionPercentage = groupsForSelectedGrade.length > 0
                                                    ? Math.round((completedGroupsForGrade / groupsForSelectedGrade.length) * 100)
                                                    : 0;
                                            }

                                            // Get grades that have evidence (for legacy support)
                                            const gradesWithEvidence = new Set(
                                                progressByGrade
                                                    .filter((p: ProgressByGrade) => p.evidenceDocumentStorageId || p.evidencePhotoStorageId)
                                                    .map((p: ProgressByGrade) => p.gradeCode)
                                            );

                                            // Check if ANY grade has evidence (for multi-grade) or if main progress has evidence (for single-grade)
                                            const hasEvidence = gradesWithEvidence.size > 0 || !!lesson.progress?.evidencePhotoStorageId || !!lesson.progress?.evidenceDocumentStorageId;
                                            const evidenceStorageId = lesson.progress?.evidencePhotoStorageId || lesson.progress?.evidenceDocumentStorageId;
                                            const evidenceType = lesson.progress?.evidencePhotoStorageId ? "image" : "pdf";

                                            // Determine background color based on completion
                                            const isFullyComplete = displayCompletionPercentage === 100;
                                            const isPartiallyComplete = hasEvidence && !isFullyComplete;

                                            return (
                                                <Card
                                                    key={lesson.lessonId}
                                                    className={`transition-all bg-popover py-0 ${isFullyComplete
                                                        ? "border-green-200 bg-green-50/50"
                                                        : isPartiallyComplete
                                                            ? "border-yellow-200 bg-yellow-50/50"
                                                            : "border-gray-200"
                                                        }`}
                                                >
                                                    <CardContent className="p-3 sm:p-4">
                                                        {/* Mobile Layout */}
                                                        <div className="flex gap-3 sm:hidden">
                                                            {/* Left: Evidence Preview */}
                                                            {hasEvidence ? (
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedLesson(lesson);
                                                                        setEvidenceDialogOpen(true);
                                                                    }}
                                                                    className={`shrink-0 w-16 h-16 rounded-md border-2 overflow-hidden transition-colors flex items-center justify-center ${isFullyComplete
                                                                        ? "border-green-300 bg-green-50 hover:border-green-500"
                                                                        : "border-yellow-300 bg-yellow-50 hover:border-yellow-500"
                                                                        }`}
                                                                >
                                                                    {evidenceStorageId && evidenceType === "image" ? (
                                                                        <EvidencePreview storageId={evidenceStorageId} type="image" />
                                                                    ) : evidenceStorageId && evidenceType === "pdf" ? (
                                                                        <div className="flex flex-col items-center justify-center gap-1">
                                                                            <FileText className={`h-6 w-6 ${isFullyComplete ? "text-green-700" : "text-yellow-700"}`} />
                                                                            <span className={`text-[10px] font-medium ${isFullyComplete ? "text-green-700" : "text-yellow-700"}`}>PDF</span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex flex-col items-center justify-center gap-1">
                                                                            <FileText className={`h-6 w-6 ${isFullyComplete ? "text-green-700" : "text-yellow-700"}`} />
                                                                            <span className={`text-[10px] font-medium ${isFullyComplete ? "text-green-700" : "text-yellow-700"}`}>View</span>
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
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <span className="font-medium text-sm break-words">
                                                                                {lesson.orderInQuarter}. {lesson.title}
                                                                            </span>
                                                                            {assignedGroupCodes.length > 0 && (
                                                                                <Badge
                                                                                    variant={displayCompletionPercentage === 100 ? "default" : displayCompletionPercentage > 0 ? "secondary" : "outline"}
                                                                                    className="text-xs h-5"
                                                                                >
                                                                                    {displayCompletionPercentage}%
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                        {/* Group badges for mobile - Show groups for selected grade */}
                                                                        {assignedGroupCodes.length > 0 && selectedGrade && (
                                                                            <div className="flex items-center gap-1 flex-wrap mt-1">
                                                                                {assignedGroupCodes
                                                                                    .filter((groupCode: string) => groupCode.startsWith(selectedGrade + "-"))
                                                                                    .map((groupCode: string) => {
                                                                                        const groupNumber = groupCode.split('-')[1];
                                                                                        const hasEvidence = progressByGrade.find(
                                                                                            (p: Record<string, unknown>) => p.groupCode === groupCode &&
                                                                                                (p.evidenceDocumentStorageId || p.evidencePhotoStorageId)
                                                                                        );
                                                                                        return (
                                                                                            <Badge
                                                                                                key={groupCode}
                                                                                                variant={hasEvidence ? "default" : "outline"}
                                                                                                className="text-[10px] h-4 px-1"
                                                                                            >
                                                                                                Group {groupNumber}
                                                                                                {hasEvidence && " ✓"}
                                                                                            </Badge>
                                                                                        );
                                                                                    })}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <span
                                                                        className="inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-7 px-2 cursor-pointer border shrink-0"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            router.push(`/${locale}/admin/lessons/${lesson.lessonId}`);
                                                                        }}
                                                                    >
                                                                        <ExternalLink className="h-3 w-3" />
                                                                        <span>Details</span>
                                                                    </span>
                                                                </div>

                                                                {/* Bottom row removed - Details button moved up */}
                                                            </div>
                                                        </div>

                                                        {/* Desktop Layout */}
                                                        <div className="hidden sm:flex items-start gap-3">
                                                            {/* Evidence Preview Thumbnail */}
                                                            {hasEvidence ? (
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedLesson(lesson);
                                                                        setEvidenceDialogOpen(true);
                                                                    }}
                                                                    className={`shrink-0 w-16 h-16 rounded-md border-2 overflow-hidden transition-colors flex items-center justify-center group ${isFullyComplete
                                                                        ? "border-green-300 bg-green-50 hover:border-green-500"
                                                                        : "border-yellow-300 bg-yellow-50 hover:border-yellow-500"
                                                                        }`}
                                                                >
                                                                    {evidenceStorageId && evidenceType === "image" ? (
                                                                        <EvidencePreview storageId={evidenceStorageId} type="image" />
                                                                    ) : evidenceStorageId && evidenceType === "pdf" ? (
                                                                        <div className="flex flex-col items-center justify-center gap-1">
                                                                            <FileText className={`h-6 w-6 ${isFullyComplete ? "text-green-700" : "text-yellow-700"}`} />
                                                                            <span className={`text-[10px] font-medium ${isFullyComplete ? "text-green-700" : "text-yellow-700"}`}>PDF</span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex flex-col items-center justify-center gap-1">
                                                                            <FileText className={`h-6 w-6 ${isFullyComplete ? "text-green-700" : "text-yellow-700"}`} />
                                                                            <span className={`text-[10px] font-medium ${isFullyComplete ? "text-green-700" : "text-yellow-700"}`}>View</span>
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
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="font-medium text-sm break-words">
                                                                        {lesson.orderInQuarter}. {lesson.title}
                                                                    </span>
                                                                    {assignedGroupCodes.length > 0 && (
                                                                        <Badge
                                                                            variant={displayCompletionPercentage === 100 ? "default" : displayCompletionPercentage > 0 ? "secondary" : "outline"}
                                                                            className="text-xs"
                                                                        >
                                                                            {displayCompletionPercentage}%
                                                                        </Badge>
                                                                    )}
                                                                </div>

                                                                {/* Group badges for desktop - Show groups for selected grade */}
                                                                {assignedGroupCodes.length > 0 && selectedGrade && (
                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                        {assignedGroupCodes
                                                                            .filter((groupCode: string) => groupCode.startsWith(selectedGrade + "-"))
                                                                            .map((groupCode: string) => {
                                                                                const groupNumber = groupCode.split('-')[1];
                                                                                const hasEvidence = progressByGrade.find(
                                                                                    (p: Record<string, unknown>) => p.groupCode === groupCode &&
                                                                                        (p.evidenceDocumentStorageId || p.evidencePhotoStorageId)
                                                                                );
                                                                                return (
                                                                                    <Badge
                                                                                        key={groupCode}
                                                                                        variant={hasEvidence ? "default" : "outline"}
                                                                                        className="text-xs h-5 px-2"
                                                                                    >
                                                                                        Group {groupNumber}
                                                                                        {hasEvidence && " ✓"}
                                                                                    </Badge>
                                                                                );
                                                                            })}
                                                                    </div>
                                                                )}


                                                                {lesson.description && (
                                                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                                                        {lesson.description}
                                                                    </p>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center gap-2 shrink-0">
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

            {/* Evidence Dialog with Tabs */}
            <Dialog open={evidenceDialogOpen} onOpenChange={setEvidenceDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[95vh] p-0 gap-0 overflow-hidden">
                    <DialogTitle className="sr-only">
                        {selectedLesson?.title || "Lesson Evidence"}
                    </DialogTitle>
                    {selectedLesson?.progressByGrade && selectedLesson.progressByGrade.length > 0 && (
                        <Tabs defaultValue={selectedLesson.progressByGrade[0]?.groupCode || "0"} >
                            <TabsList>
                                {selectedLesson.progressByGrade
                                    .filter((p: ProgressByGrade) =>
                                        p.groupCode &&
                                        (p.evidenceDocumentStorageId || p.evidencePhotoStorageId)
                                    )
                                    .map((groupProgress: ProgressByGrade) => {
                                        const groupNumber = (groupProgress.groupCode || '').split('-')[1];
                                        return (
                                            <TabsTrigger
                                                key={groupProgress.groupCode}
                                                value={groupProgress.groupCode || ""}
                                                className="flex-1"
                                            >
                                                Group {groupNumber}
                                            </TabsTrigger>
                                        );
                                    })
                                }
                            </TabsList>
                            {selectedLesson.progressByGrade
                                .filter((p: ProgressByGrade) =>
                                    p.groupCode &&
                                    (p.evidenceDocumentStorageId || p.evidencePhotoStorageId)
                                )
                                .map((groupProgress: ProgressByGrade) => {
                                    const evidenceId = groupProgress.evidenceDocumentStorageId || groupProgress.evidencePhotoStorageId;
                                    const evidenceType = groupProgress.evidencePhotoStorageId ? "image" : "pdf";
                                    const groupNumber = (groupProgress.groupCode || '').split('-')[1]; if (!evidenceId || !groupProgress.groupCode) return null;

                                    return (
                                        <TabsContent key={groupProgress.groupCode} value={groupProgress.groupCode} className="m-0 p-4">
                                            <EvidenceViewer
                                                storageId={evidenceId}
                                                type={evidenceType}
                                                title={`Group ${groupNumber} Evidence`}
                                                uploadedAt={groupProgress.completedAt}
                                            />
                                        </TabsContent>
                                    );
                                })
                            }
                        </Tabs>
                    )}
                </DialogContent>
            </Dialog>
        </AccordionItem>
    );
}

// Component to view evidence in full size
function EvidenceViewer({
    storageId,
    type,
    title,
    uploadedAt
}: {
    storageId: Id<"_storage">,
    type: "image" | "pdf",
    title: string,
    uploadedAt?: number
}) {
    const url = useQuery(api.progress.getStorageUrl, { storageId });

    if (!url) {
        return <div className="w-full h-96 bg-muted animate-pulse rounded-lg" />;
    }

    // Format the upload date and time
    const uploadDateText = uploadedAt
        ? new Date(uploadedAt).toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
        : null;

    if (type === "image") {
        return (
            <div className="space-y-3">
                {uploadDateText && (
                    <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Uploadedaa:</span> {uploadDateText}
                    </div>
                )}
                <div className="flex justify-center relative" style={{ width: '400px', height: '300px' }}>
                    <Image
                        src={url}
                        alt={title}
                        fill
                        className="rounded-lg object-contain"
                        sizes="400px"
                        unoptimized
                    />
                </div>
            </div>
        );
    }

    // PDF viewer
    return (
        <div className="space-y-3">
            {uploadDateText && (
                <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Uploaded:</span> {uploadDateText}
                </div>
            )}
            <iframe
                src={url}
                className="border-0 w-full rounded-lg"
                style={{ height: 'calc(90vh - 200px)' }}
                title={title}
            />
        </div>
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
