"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import {
    ArrowUpDown,
    ChevronDown,
    Filter,
    Search,
    BookOpen,
    Calendar,
    Plus,
    ExternalLink,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id, Doc } from "@/convex/_generated/dataModel";
import { toast } from "sonner";

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
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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

    // Query teacher assignments with real progress from database
    const assignments = useQuery(api.progress.getTeacherAssignmentsWithProgress, {
        teacherId: teacherId as Id<"users">,
        isActive: true,
    }) as TeacherAssignmentWithProgress[] | undefined;

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
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                        No curriculum assignments found
                    </div>
                ) : (
                    <Accordion type="single" collapsible className="w-full px-2 md:px-6 space-y-3 pb-4">
                        {data.map((assignment, index) => (
                            <AccordionItem
                                key={assignment._id}
                                value={assignment._id}
                                className="border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors px-3 md:px-4 data-[state=open]:bg-muted/60"
                            >
                                <AccordionTrigger className="hover:no-underline py-3 md:py-4">
                                    <div className="flex items-start justify-between w-full pr-2 md:pr-4 gap-2">
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

                                            {/* View Details button - mobile first */}
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

                                            {/* Stats row */}
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs md:text-sm text-muted-foreground w-full">
                                                {assignment.grade && (
                                                    <span className="flex items-center gap-1">
                                                        <Badge className="bg-sky-500/15 text-sky-700 border border-sky-200 text-xs px-2 py-0.5 shrink-0">
                                                            {assignment.grade.name}
                                                        </Badge>
                                                    </span>
                                                )}
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="whitespace-nowrap">
                                                        {assignment.progressSummary.completedLessons}/{assignment.progressSummary.totalLessons} lessons
                                                    </span>
                                                    <span className="font-medium text-primary whitespace-nowrap">
                                                        {assignment.progressSummary.progressPercentage}% complete
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pb-3 md:pb-4 px-0 border-t">
                                    <LessonsList assignmentId={assignment._id} teacherId={teacherId} />
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </CardContent>
        </Card>
    );
}

// Component to display lessons for an assignment with upload functionality
function LessonsList({ assignmentId, teacherId }: { assignmentId: Id<"teacher_assignments">, teacherId: string }) {
    const [uploadingLessonId, setUploadingLessonId] = React.useState<Id<"curriculum_lessons"> | null>(null);

    // Query to get assignment lessons with progress
    const assignmentData = useQuery(api.progress.getAssignmentLessonProgress, {
        assignmentId,
    });

    // Mutation to update lesson progress
    const updateProgress = useMutation(api.progress.updateLessonProgress);

    if (!assignmentData) {
        return <div className="py-4 text-center text-muted-foreground">Loading lessons...</div>;
    }

    const { lessons } = assignmentData;

    // Group lessons by quarter
    const lessonsByQuarter = lessons.reduce((acc, lesson) => {
        const quarter = lesson.quarter;
        if (!acc[quarter]) {
            acc[quarter] = [];
        }
        acc[quarter].push(lesson);
        return acc;
    }, {} as Record<number, typeof lessons>);

    const handleFileUpload = async (lessonId: Id<"curriculum_lessons">, file: File) => {
        try {
            setUploadingLessonId(lessonId);

            // TODO: Upload to Convex Storage
            // For now, we'll just mark as completed without photo
            await updateProgress({
                teacherId: teacherId as Id<"users">,
                lessonId,
                assignmentId,
                status: "completed",
            });

            toast.success("Lesson marked as completed!");
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Failed to upload photo");
        } finally {
            setUploadingLessonId(null);
        }
    };

    const handleStatusChange = async (
        lessonId: Id<"curriculum_lessons">,
        status: "not_started" | "in_progress" | "completed"
    ) => {
        try {
            await updateProgress({
                teacherId: teacherId as Id<"users">,
                lessonId,
                assignmentId,
                status,
            });
            toast.success(`Lesson status updated to ${status}`);
        } catch (error) {
            console.error("Status update error:", error);
            toast.error("Failed to update status");
        }
    };

    return (
        <div className="space-y-6 mt-4 px-2 md:px-4">
            {Object.keys(lessonsByQuarter)
                .sort((a, b) => parseInt(a) - parseInt(b))
                .map((quarter) => (
                    <div key={quarter} className="space-y-3">
                        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                            Quarter {quarter}
                        </h4>
                        <div className="space-y-2">
                            {lessonsByQuarter[parseInt(quarter)].map((lesson) => {
                                const progress = lesson.progress;
                                const status = progress?.status || "not_started";

                                return (
                                    <div
                                        key={lesson.lessonId}
                                        className="border rounded-lg p-3 md:p-4 hover:bg-accent/50 transition-colors"
                                    >
                                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                                            {/* Left side: Title, description, status */}
                                            <div className="flex-1 min-w-0 space-y-3">
                                                {/* Title and badge */}
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                            <span className="font-medium text-sm">
                                                                {lesson.orderInQuarter}. {lesson.title}
                                                            </span>
                                                            {lesson.isMandatory && (
                                                                <Badge className="bg-orange-500/15 text-orange-700 border border-orange-200 text-xs px-2 py-0.5 shrink-0">
                                                                    Required
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        {lesson.description && (
                                                            <p className="text-xs md:text-sm text-muted-foreground mb-3">
                                                                {lesson.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Status and date */}
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                                    <Select
                                                        value={status}
                                                        onValueChange={(value) =>
                                                            handleStatusChange(
                                                                lesson.lessonId,
                                                                value as "not_started" | "in_progress" | "completed"
                                                            )
                                                        }
                                                    >
                                                        <SelectTrigger className="w-full sm:w-[160px] h-8 text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="not_started">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                                                                    Not Started
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="in_progress">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                                                    In Progress
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="completed">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                                    Completed
                                                                </div>
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>

                                                    {progress?.completedAt && (
                                                        <span className="text-xs text-muted-foreground">
                                                            Completed on{" "}
                                                            {new Date(progress.completedAt).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Photo upload section - mobile only */}
                                                <div className="flex flex-col gap-2 md:hidden">
                                                    {progress?.evidencePhotoStorageId ? (
                                                        <>
                                                            <Badge className="bg-green-500/15 text-green-700 border border-green-200 text-xs px-2 py-1 w-fit">
                                                                📷 Evidence uploaded
                                                            </Badge>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 w-full"
                                                                onClick={() => {
                                                                    // TODO: Show photo preview
                                                                    toast.info("Photo preview coming soon");
                                                                }}
                                                            >
                                                                View
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                id={`file-${lesson.lessonId}`}
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) {
                                                                        handleFileUpload(lesson.lessonId, file);
                                                                    }
                                                                }}
                                                                disabled={uploadingLessonId === lesson.lessonId}
                                                            />
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 w-full"
                                                                onClick={() => {
                                                                    document.getElementById(`file-${lesson.lessonId}`)?.click();
                                                                }}
                                                                disabled={uploadingLessonId === lesson.lessonId}
                                                            >
                                                                {uploadingLessonId === lesson.lessonId ? (
                                                                    "Uploading..."
                                                                ) : (
                                                                    <>
                                                                        <Plus className="h-3 w-3 mr-1" />
                                                                        Upload Evidence
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Right side: Photo upload - desktop only */}
                                            <div className="hidden md:flex md:flex-col md:items-end gap-2 shrink-0">
                                                {progress?.evidencePhotoStorageId ? (
                                                    <>
                                                        <Badge className="bg-green-500/15 text-green-700 border border-green-200 text-xs px-2 py-1">
                                                            📷 Evidence uploaded
                                                        </Badge>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8"
                                                            onClick={() => {
                                                                // TODO: Show photo preview
                                                                toast.info("Photo preview coming soon");
                                                            }}
                                                        >
                                                            View
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            id={`file-desktop-${lesson.lessonId}`}
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    handleFileUpload(lesson.lessonId, file);
                                                                }
                                                            }}
                                                            disabled={uploadingLessonId === lesson.lessonId}
                                                        />
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8"
                                                            onClick={() => {
                                                                document.getElementById(`file-desktop-${lesson.lessonId}`)?.click();
                                                            }}
                                                            disabled={uploadingLessonId === lesson.lessonId}
                                                        >
                                                            {uploadingLessonId === lesson.lessonId ? (
                                                                "Uploading..."
                                                            ) : (
                                                                <>
                                                                    <Plus className="h-3 w-3 mr-1" />
                                                                    Upload Evidence
                                                                </>
                                                            )}
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {progress?.notes && (
                                            <div className="mt-3 pt-3 border-t">
                                                <p className="text-xs text-muted-foreground">
                                                    <strong>Notes:</strong> {progress.notes}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
        </div>
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
