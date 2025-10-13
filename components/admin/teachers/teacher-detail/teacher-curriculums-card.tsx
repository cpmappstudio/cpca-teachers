"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import {
    ArrowUpDown,
    ChevronDown,
    Filter,
    Search,
    BookOpen,
    ExternalLink,
    FileText,
    ChevronRight,
    Image as ImageIcon,
    X,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";
import { AddCurriculumDialog } from "./add-curriculum-dialog";

// Tipo para los datos de asignaciones de curriculum con progreso real del profesor
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

    // Real progress summary (from lesson_progress table)
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

const statusOptions = [
    { label: "Active", value: "active", color: "bg-green-600" },
    { label: "Draft", value: "draft", color: "bg-amber-600" },
    { label: "Archived", value: "archived", color: "bg-rose-600" },
    { label: "Deprecated", value: "deprecated", color: "bg-gray-600" },
];

interface TeacherCurriculumsCardProps {
    teacherId: string;
}

export function TeacherCurriculumsCard({
    teacherId,
}: TeacherCurriculumsCardProps) {
    const router = useRouter();
    const params = useParams();
    const locale = params.locale as string;
    const [expandedCurriculum, setExpandedCurriculum] = React.useState<string | null>(null);
    const [expandedQuarter, setExpandedQuarter] = React.useState<string | null>(null);
    const [evidenceModal, setEvidenceModal] = React.useState<{
        open: boolean;
        url: string | null;
        type: "image" | "pdf" | null;
        title: string;
    }>({
        open: false,
        url: null,
        type: null,
        title: "",
    });

    const handleViewEvidence = (storageId: Id<"_storage">, title: string, type: "image" | "pdf") => {
        // Set the modal to open with storageId, URL will be loaded by query
        setEvidenceModal({
            open: true,
            url: storageId as any, // Store storageId temporarily
            type,
            title,
        });
    };

    // Query teacher assignments with real progress from database
    const assignments = useQuery(api.progress.getTeacherAssignmentsWithProgress, {
        teacherId: teacherId as Id<"users">,
        isActive: true,
    }) as TeacherAssignmentWithProgress[] | undefined;

    // Get detailed lesson progress when curriculum is expanded
    const selectedAssignment = assignments?.find(a => a._id === expandedCurriculum);
    const assignmentLessonProgress = useQuery(
        api.progress.getAssignmentLessonProgress,
        selectedAssignment ? { assignmentId: selectedAssignment._id } : "skip"
    );

    const allData = assignments || [];

    // Filter state
    const [statusFilter, setStatusFilter] = React.useState<
        "active" | "draft" | "archived" | "deprecated" | "all"
    >("all");
    const [gradeFilter, setGradeFilter] = React.useState<string>("all");
    const [searchQuery, setSearchQuery] = React.useState("");

    // Apply filters
    const data = React.useMemo(() => {
        return allData.filter((assignment) => {
            // Status filter
            if (statusFilter !== "all" && assignment.status !== statusFilter) {
                return false;
            }

            // Grade filter
            if (gradeFilter !== "all" && assignment.grade?.name !== gradeFilter) {
                return false;
            }

            // Search filter
            if (searchQuery) {
                const search = searchQuery.toLowerCase();
                const nameMatch = assignment.name.toLowerCase().includes(search);
                const codeMatch = assignment.code?.toLowerCase().includes(search);
                if (!nameMatch && !codeMatch) {
                    return false;
                }
            }

            return true;
        });
    }, [allData, statusFilter, gradeFilter, searchQuery]);

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
        <Card className="overflow-hidden">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold tracking-tight">Teaching Assignments & Progress</CardTitle>
                <CardDescription className="text-sm">
                    Individual progress tracking for each assigned curriculum. View completion status, uploaded evidence, and lesson details.
                </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pt-0">
                <div className="flex items-center justify-between gap-4 px-4 md:px-6 py-4 border-t">
                    <div className="flex flex-1 items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Search by course name or code"
                                aria-label="Search curriculums"
                                className="pl-10 pr-3 rounded-l bg-card h-9"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Botón Clear all - visible solo cuando hay filtros activos */}
                        {(statusFilter !== "all" ||
                            gradeFilter !== "all" ||
                            searchQuery.length > 0) && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setStatusFilter("all");
                                        setGradeFilter("all");
                                        setSearchQuery("");
                                    }}
                                    className="h-10 px-3"
                                >
                                    Clear all
                                </Button>
                            )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="h-9 px-3 bg-card"
                                >
                                    <Filter className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end">
                                <DropdownMenuLabel className="px-3 py-2.5">
                                    Filter by:
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <div className="px-3 py-3 space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-foreground">
                                            Grade
                                        </label>
                                        <Select
                                            value={gradeFilter}
                                            onValueChange={(value) => setGradeFilter(value)}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="All Curriculums" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Grades</SelectItem>
                                                {Array.from(new Set(data.map(c => c.grade?.name).filter(Boolean)))
                                                    .sort()
                                                    .map((gradeName) => (
                                                        <SelectItem key={gradeName} value={gradeName!}>
                                                            {gradeName}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-foreground">
                                            Status
                                        </label>
                                        <Select
                                            value={statusFilter}
                                            onValueChange={(value) =>
                                                setStatusFilter(
                                                    value as
                                                    | "active"
                                                    | "draft"
                                                    | "archived"
                                                    | "deprecated"
                                                    | "all"
                                                )
                                            }
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Curriculums</SelectItem>
                                                {statusOptions.map((status) => (
                                                    <SelectItem key={status.value} value={status.value}>
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className={`w-2 h-2 rounded-full ${status.color}`}
                                                            ></div>
                                                            {status.label}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <AddCurriculumDialog teacherId={teacherId} />
                </div>

                {/* Accordion with assignments and their lessons */}
                {data.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                        No curriculum assignments found
                    </div>
                ) : (
                    <div className="space-y-6 rounded-none-4">
                        {data.map((assignment) => {
                            const isExpanded = expandedCurriculum === assignment._id;
                            const progressByQuarter = assignment.progressByQuarter || {};
                            const lessons = isExpanded && assignmentLessonProgress
                                ? assignmentLessonProgress.lessons
                                : [];

                            return (
                                <Collapsible
                                    key={assignment._id}
                                    open={isExpanded}
                                    onOpenChange={(open) => {
                                        setExpandedCurriculum(open ? assignment._id : null);
                                        setExpandedQuarter(null);
                                    }}
                                    className="border bg-card shadow-sm"
                                >
                                    <CollapsibleTrigger asChild>
                                        <div className="flex items-start justify-between w-full p-4 hover:bg-muted/50 transition-colors cursor-pointer rounded-lg">
                                            <div className="flex flex-col items-start gap-2 flex-1 min-w-0">
                                                {/* Title row */}
                                                <div className="flex items-center gap-2 flex-wrap w-full">
                                                    <ChevronRight
                                                        className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""
                                                            }`}
                                                    />
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

                                                {/* Grade badge - moved stats to right side */}
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
                                    </CollapsibleTrigger>

                                    <CollapsibleContent className="border-t">
                                        <div className="p-4">
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
                                                                                                onClick={() => handleViewEvidence(
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
                                                                                                onClick={() => handleViewEvidence(
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
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>
                            );
                        })}
                    </div>
                )}
            </CardContent>

            {/* Evidence Modal */}
            <Dialog open={evidenceModal.open} onOpenChange={(open) => setEvidenceModal(prev => ({ ...prev, open }))}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {evidenceModal.type === "image" ? (
                                <ImageIcon className="h-5 w-5" />
                            ) : (
                                <FileText className="h-5 w-5" />
                            )}
                            {evidenceModal.title}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="mt-4">
                        {evidenceModal.url && evidenceModal.type && (
                            <EvidenceModalContent
                                storageId={evidenceModal.url as any as Id<"_storage">}
                                type={evidenceModal.type}
                                title={evidenceModal.title}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
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

// Component to show evidence in modal
function EvidenceModalContent({ storageId, type, title }: { storageId: Id<"_storage">, type: "image" | "pdf", title: string }) {
    const url = useQuery(api.progress.getStorageUrl, { storageId });

    if (!url) {
        return <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>;
    }

    if (type === "image") {
        return (
            <div className="relative w-full">
                <Image
                    src={url}
                    alt={title}
                    width={1200}
                    height={800}
                    className="w-full h-auto rounded-lg"
                    unoptimized
                />
            </div>
        );
    }

    return (
        <iframe
            src={url}
            className="w-full h-[70vh] rounded-lg border"
            title={title}
        />
    );
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
