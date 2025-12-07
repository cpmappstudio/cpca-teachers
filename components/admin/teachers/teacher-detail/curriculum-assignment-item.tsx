"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { ExternalLink, FileText, Image as ImageIcon } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadialBar, RadialBarChart } from "recharts";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import Image from "next/image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

// ============================================================================
// Types
// ============================================================================

interface ProgressByGrade {
  gradeCode?: string;
  groupCode?: string;
  evidenceDocumentStorageId?: Id<"_storage">;
  evidencePhotoStorageId?: Id<"_storage">;
  completedAt?: number;
}

interface LessonWithProgress {
  lessonId: Id<"curriculum_lessons">;
  title: string;
  description?: string;
  quarter: number;
  orderInQuarter: number;
  completionPercentage?: number;
  progressByGrade?: ProgressByGrade[];
  progress?: {
    evidencePhotoStorageId?: Id<"_storage">;
    evidenceDocumentStorageId?: Id<"_storage">;
  } | null;
}

interface TeacherAssignmentWithProgress {
  _id: Id<"teacher_assignments">;
  curriculumId: Id<"curriculums">;
  numberOfQuarters: number;
  gradeNames: string[];
  name: string;
  code?: string;
  status: "draft" | "active" | "archived" | "deprecated";
}

interface CurriculumAssignmentItemProps {
  assignment: TeacherAssignmentWithProgress;
  onViewEvidence: (
    storageId: Id<"_storage">,
    title: string,
    type: "image" | "pdf",
  ) => void;
}

// ============================================================================
// Helpers
// ============================================================================

function getEvidenceInfo(
  lesson: LessonWithProgress,
  progressByGrade: ProgressByGrade[],
) {
  const gradesWithEvidence = new Set(
    progressByGrade
      .filter((p) => p.evidenceDocumentStorageId || p.evidencePhotoStorageId)
      .map((p) => p.gradeCode),
  );

  const hasEvidence =
    gradesWithEvidence.size > 0 ||
    !!lesson.progress?.evidencePhotoStorageId ||
    !!lesson.progress?.evidenceDocumentStorageId;

  const evidenceStorageId =
    lesson.progress?.evidencePhotoStorageId ||
    lesson.progress?.evidenceDocumentStorageId;

  const evidenceType: "image" | "pdf" = lesson.progress?.evidencePhotoStorageId
    ? "image"
    : "pdf";

  return { hasEvidence, evidenceStorageId, evidenceType };
}

function computeCompletionForGrade(
  lesson: LessonWithProgress,
  selectedGrade: string | null,
  assignedGroupCodes: string[],
  hasMultipleGrades: boolean,
): number {
  if (!hasMultipleGrades || !selectedGrade) {
    return lesson.completionPercentage || 0;
  }

  const progressByGrade = lesson.progressByGrade || [];
  const groupsForGrade = assignedGroupCodes.filter((gc) =>
    gc.startsWith(selectedGrade + "-"),
  );

  if (groupsForGrade.length === 0) return lesson.completionPercentage || 0;

  const completedGroups = progressByGrade.filter(
    (p) =>
      groupsForGrade.includes(p.groupCode || "") &&
      (p.evidenceDocumentStorageId || p.evidencePhotoStorageId),
  ).length;

  return Math.round((completedGroups / groupsForGrade.length) * 100);
}

function computeQuarterProgress(
  lessons: LessonWithProgress[],
  quarterNum: number,
  selectedGrade: string | null,
  assignedGroupCodes: string[],
  hasMultipleGrades: boolean,
): number {
  const quarterLessons = filterLessonsByQuarterAndGrade(
    lessons,
    quarterNum,
    selectedGrade,
    hasMultipleGrades,
  );

  if (quarterLessons.length === 0) return 0;

  const totalScore = quarterLessons.reduce((acc, lesson) => {
    return (
      acc +
      computeCompletionForGrade(
        lesson,
        selectedGrade,
        assignedGroupCodes,
        hasMultipleGrades,
      )
    );
  }, 0);

  return Math.round(totalScore / quarterLessons.length);
}

function filterLessonsByQuarterAndGrade(
  lessons: LessonWithProgress[],
  quarterNum: number,
  selectedGrade: string | null,
  hasMultipleGrades: boolean,
): LessonWithProgress[] {
  return lessons.filter((lesson) => {
    if (lesson.quarter !== quarterNum) return false;

    if (hasMultipleGrades && selectedGrade) {
      const lessonWithGrades = lesson as LessonWithProgress & {
        gradeCodes?: string[];
        gradeCode?: string;
      };
      if (lessonWithGrades.gradeCodes?.length) {
        return lessonWithGrades.gradeCodes.includes(selectedGrade);
      }
      if (lessonWithGrades.gradeCode) {
        return lessonWithGrades.gradeCode === selectedGrade;
      }
    }

    return true;
  });
}

function getCompletionBadgeClasses(percentage: number): string {
  if (percentage === 100) return "bg-green-700 text-white border-green-700";
  if (percentage >= 75) return "bg-green-500 text-white border-green-500";
  if (percentage >= 50) return "bg-yellow-500 text-white border-yellow-500";
  if (percentage > 0) return "bg-orange-500 text-white border-orange-500";
  return "bg-red-200 text-red-900 border-red-300";
}

// ============================================================================
// Sub-components
// ============================================================================

function QuarterProgressChart({ progress }: { progress: number }) {
  const startAngle = 90;
  const endAngle = 90 - progress * 3.6;

  const chartData = [{ progress: 100, fill: "hsl(var(--primary))" }];
  const chartConfig: ChartConfig = {
    progress: { label: "Progress", color: "hsl(var(--primary))" },
  };

  return (
    <div className="w-8 h-8">
      <ChartContainer config={chartConfig} className="w-full h-full">
        <RadialBarChart
          data={chartData}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius="60%"
          outerRadius="100%"
        >
          <RadialBar dataKey="progress" background cornerRadius={3} />
        </RadialBarChart>
      </ChartContainer>
    </div>
  );
}

function GroupBadges({
  assignedGroupCodes,
  selectedGrade,
  progressByGrade,
  size = "normal",
}: {
  assignedGroupCodes: string[];
  selectedGrade: string;
  progressByGrade: ProgressByGrade[];
  size?: "small" | "normal";
}) {
  const groupsForGrade = assignedGroupCodes.filter((gc) =>
    gc.startsWith(selectedGrade + "-"),
  );

  if (groupsForGrade.length === 0) return null;

  const sizeClasses =
    size === "small" ? "text-[10px] h-4 px-1" : "text-xs h-5 px-2";

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {groupsForGrade.map((groupCode) => {
        const groupNumber = groupCode.split("-")[1];
        const hasEvidence = progressByGrade.find(
          (p) =>
            p.groupCode === groupCode &&
            (p.evidenceDocumentStorageId || p.evidencePhotoStorageId),
        );

        return (
          <Badge
            key={groupCode}
            variant={hasEvidence ? "default" : "outline"}
            className={`${sizeClasses} ${
              hasEvidence
                ? "bg-green-700 hover:bg-green-700 text-white border-green-700"
                : "bg-red-200 hover:bg-red-200 text-red-900 border-red-300"
            }`}
          >
            Group {groupNumber}
            {hasEvidence && " ✓"}
          </Badge>
        );
      })}
    </div>
  );
}

function EvidenceThumbnail({
  hasEvidence,
  evidenceStorageId,
  evidenceType,
  isFullyComplete,
  onClick,
}: {
  hasEvidence: boolean;
  evidenceStorageId?: Id<"_storage">;
  evidenceType: "image" | "pdf";
  isFullyComplete: boolean;
  onClick: () => void;
}) {
  if (!hasEvidence) {
    return (
      <div className="shrink-0 w-16 h-16 rounded-md border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-0.5">
          <ImageIcon className="h-5 w-5 text-gray-400" />
          <span className="text-[9px] text-gray-400 font-medium">No file</span>
        </div>
      </div>
    );
  }

  const colorClass = isFullyComplete ? "text-green-700" : "text-yellow-700";
  const borderClass = isFullyComplete
    ? "border-green-300 bg-green-50 hover:border-green-500"
    : "border-yellow-300 bg-yellow-50 hover:border-yellow-500";

  return (
    <button
      onClick={onClick}
      className={`shrink-0 w-16 h-16 rounded-md border-2 overflow-hidden transition-colors flex items-center justify-center ${borderClass}`}
    >
      {evidenceStorageId && evidenceType === "image" ? (
        <EvidencePreview storageId={evidenceStorageId} type="image" />
      ) : (
        <div className="flex flex-col items-center justify-center gap-1">
          <FileText className={`h-6 w-6 ${colorClass}`} />
          <span className={`text-[10px] font-medium ${colorClass}`}>
            {evidenceType === "pdf" ? "PDF" : "View"}
          </span>
        </div>
      )}
    </button>
  );
}

function LessonCard({
  lesson,
  selectedGrade,
  assignedGroupCodes,
  hasMultipleGrades,
  onViewEvidence,
  onViewDetails,
}: {
  lesson: LessonWithProgress;
  selectedGrade: string | null;
  assignedGroupCodes: string[];
  hasMultipleGrades: boolean;
  onViewEvidence: () => void;
  onViewDetails: () => void;
}) {
  const progressByGrade = lesson.progressByGrade || [];
  const displayCompletion = computeCompletionForGrade(
    lesson,
    selectedGrade,
    assignedGroupCodes,
    hasMultipleGrades,
  );

  const { hasEvidence, evidenceStorageId, evidenceType } = getEvidenceInfo(
    lesson,
    progressByGrade,
  );

  const isFullyComplete = displayCompletion === 100;
  const isPartiallyComplete = hasEvidence && !isFullyComplete;

  const cardBorderClass = isFullyComplete
    ? "border-green-200 bg-green-50/50"
    : isPartiallyComplete
      ? "border-yellow-200 bg-yellow-50/50"
      : "border-gray-200";

  return (
    <Card className={`transition-all bg-popover py-0 ${cardBorderClass}`}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex gap-3">
          {/* Evidence Thumbnail */}
          <EvidenceThumbnail
            hasEvidence={hasEvidence}
            evidenceStorageId={evidenceStorageId}
            evidenceType={evidenceType}
            isFullyComplete={isFullyComplete}
            onClick={onViewEvidence}
          />

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm break-words">
                    {lesson.orderInQuarter}. {lesson.title}
                  </span>
                  {assignedGroupCodes.length > 0 && (
                    <Badge
                      variant="outline"
                      className={`text-xs h-5 ${getCompletionBadgeClasses(displayCompletion)}`}
                    >
                      {displayCompletion}%
                    </Badge>
                  )}
                </div>

                {/* Group badges */}
                {assignedGroupCodes.length > 0 && selectedGrade && (
                  <div className="mt-1 sm:mt-2">
                    <GroupBadges
                      assignedGroupCodes={assignedGroupCodes}
                      selectedGrade={selectedGrade}
                      progressByGrade={progressByGrade}
                      size="small"
                    />
                  </div>
                )}

                {/* Description (desktop only) */}
                {lesson.description && (
                  <p className="hidden sm:block text-xs text-muted-foreground line-clamp-2 mt-1">
                    {lesson.description}
                  </p>
                )}
              </div>

              {/* View Details Button */}
              <span
                className="inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-7 px-2 cursor-pointer border shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails();
                }}
              >
                <ExternalLink className="h-3 w-3" />
                <span className="hidden sm:inline">View Details</span>
                <span className="sm:hidden">Details</span>
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EvidenceViewer({
  storageId,
  title,
  uploadedAt,
}: {
  storageId: Id<"_storage">;
  type: "image" | "pdf";
  title: string;
  uploadedAt?: number;
}) {
  const url = useQuery(api.progress.getStorageUrl, { storageId });

  if (!url) {
    return <div className="w-full h-64 bg-muted animate-pulse rounded-lg" />;
  }

  const uploadDateText = uploadedAt
    ? new Date(uploadedAt).toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const isImage =
    url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || !url.match(/\.pdf$/i);

  return (
    <div className="space-y-3 w-full">
      {uploadDateText && (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">Uploaded:</span> {uploadDateText}
        </div>
      )}
      {isImage ? (
        <div className="relative w-full max-w-full aspect-[4/3]">
          <Image
            src={url}
            alt={title}
            fill
            className="rounded-lg object-contain"
            sizes="(max-width: 768px) 100vw, 800px"
            unoptimized
          />
        </div>
      ) : (
        <iframe
          src={url}
          className="border-0 w-full rounded-lg h-[60vh]"
          title={title}
        />
      )}
    </div>
  );
}

function EvidencePreview({
  storageId,
  type,
}: {
  storageId: Id<"_storage">;
  type: "image" | "pdf";
}) {
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

  return (
    <Badge
      className={`rounded-full px-3 py-0.5 text-xs font-medium inline-flex ${styles[status] ?? styles.draft}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CurriculumAssignmentItem({
  assignment,
}: CurriculumAssignmentItemProps) {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [evidenceDialogOpen, setEvidenceDialogOpen] = React.useState(false);
  const [selectedLesson, setSelectedLesson] =
    React.useState<LessonWithProgress | null>(null);
  const [selectedGrade, setSelectedGrade] = React.useState<string | null>(null);

  // Fetch lesson progress from Convex
  const assignmentLessonProgress = useQuery(
    api.progress.getAssignmentLessonProgress,
    {
      assignmentId: assignment._id,
    },
  );

  const lessons = React.useMemo(
    () => assignmentLessonProgress?.lessons || [],
    [assignmentLessonProgress?.lessons],
  );
  const assignedGrades = React.useMemo(
    () => assignmentLessonProgress?.grades || [],
    [assignmentLessonProgress?.grades],
  );
  const assignedGroupCodes = assignmentLessonProgress?.assignedGroupCodes || [];
  const hasMultipleGrades = assignedGrades.length > 1;

  // Calculate overall progress
  const overallProgress = React.useMemo(() => {
    if (lessons.length === 0) return 0;
    const totalScore = lessons.reduce(
      (acc: number, lesson: LessonWithProgress) =>
        acc + (lesson.completionPercentage || 0),
      0,
    );
    return Math.round(totalScore / lessons.length);
  }, [lessons]);

  // Initialize selected grade when data loads
  React.useEffect(() => {
    if (assignedGrades.length > 0 && !selectedGrade) {
      setSelectedGrade(assignedGrades[0].code);
    }
  }, [assignedGrades, selectedGrade]);

  const handleViewEvidence = (lesson: LessonWithProgress) => {
    setSelectedLesson(lesson);
    setEvidenceDialogOpen(true);
  };

  const handleViewLessonDetails = (lessonId: Id<"curriculum_lessons">) => {
    router.push(`/${locale}/admin/lessons/${lessonId}`);
  };

  const handleViewCurriculumDetails = () => {
    router.push(`/${locale}/admin/curriculums/${assignment.curriculumId}`);
  };

  return (
    <AccordionItem
      value={assignment._id}
      className="border bg-card shadow-sm mb-0"
    >
      {/* Header */}
      <AccordionTrigger className="hover:no-underline px-4 py-4 hover:bg-muted/50">
        <div className="flex items-start justify-between w-full">
          <div className="flex flex-col items-start gap-2 flex-1 min-w-0">
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

            {assignment.gradeNames?.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Grades:</span>
                {assignment.gradeNames.map((gradeName, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {gradeName}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
            <span
              className="inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-7 px-2 md:px-3 cursor-pointer shrink-0 border"
              onClick={(e) => {
                e.stopPropagation();
                handleViewCurriculumDetails();
              }}
            >
              <ExternalLink className="h-3 w-3" />
              <span className="hidden sm:inline">View Details</span>
              <span className="sm:hidden">Details</span>
            </span>

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

      {/* Content */}
      <AccordionContent className="border-t px-4 pb-4">
        {/* Grade Selection Tabs */}
        {hasMultipleGrades && (
          <div className="mb-4">
            <Tabs
              value={selectedGrade || assignedGrades[0]?.code}
              onValueChange={setSelectedGrade}
            >
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

        {/* Quarter Tabs */}
        <Tabs defaultValue="1" className="w-full">
          <div className="w-full overflow-x-auto">
            <TabsList className="inline-flex w-auto min-w-full">
              {Array.from(
                { length: assignment.numberOfQuarters },
                (_, i) => i + 1,
              ).map((quarterNum) => {
                const quarterProgress = computeQuarterProgress(
                  lessons,
                  quarterNum,
                  selectedGrade,
                  assignedGroupCodes,
                  hasMultipleGrades,
                );

                return (
                  <TabsTrigger
                    key={quarterNum}
                    value={quarterNum.toString()}
                    className="flex items-center gap-0"
                  >
                    <QuarterProgressChart progress={quarterProgress} />
                    <span className="font-semibold text-sm">
                      Quarter {quarterNum}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* Quarter Content */}
          {Array.from(
            { length: assignment.numberOfQuarters },
            (_, i) => i + 1,
          ).map((quarterNum) => {
            const quarterLessons = filterLessonsByQuarterAndGrade(
              lessons,
              quarterNum,
              selectedGrade,
              hasMultipleGrades,
            );

            return (
              <TabsContent key={quarterNum} value={quarterNum.toString()}>
                <div className="space-y-2">
                  {quarterLessons.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No lessons in this quarter
                    </div>
                  ) : (
                    quarterLessons.map((lesson) => (
                      <LessonCard
                        key={lesson.lessonId}
                        lesson={lesson}
                        selectedGrade={selectedGrade}
                        assignedGroupCodes={assignedGroupCodes}
                        hasMultipleGrades={hasMultipleGrades}
                        onViewEvidence={() => handleViewEvidence(lesson)}
                        onViewDetails={() =>
                          handleViewLessonDetails(lesson.lessonId)
                        }
                      />
                    ))
                  )}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </AccordionContent>

      {/* Evidence Dialog */}
      <Dialog open={evidenceDialogOpen} onOpenChange={setEvidenceDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogTitle>
            {selectedLesson?.title || "Lesson Evidence"}
          </DialogTitle>

          {selectedLesson?.progressByGrade &&
            selectedLesson.progressByGrade.length > 0 && (
              <Tabs
                defaultValue={
                  selectedLesson.progressByGrade.find(
                    (p) =>
                      p.groupCode &&
                      (p.evidenceDocumentStorageId || p.evidencePhotoStorageId),
                  )?.groupCode || ""
                }
                className="w-full"
              >
                <TabsList className="w-full flex-wrap h-auto">
                  {selectedLesson.progressByGrade
                    .filter(
                      (p) =>
                        p.groupCode &&
                        (p.evidenceDocumentStorageId ||
                          p.evidencePhotoStorageId),
                    )
                    .map((groupProgress) => (
                      <TabsTrigger
                        key={groupProgress.groupCode}
                        value={groupProgress.groupCode || ""}
                        className="flex-1"
                      >
                        Group {(groupProgress.groupCode || "").split("-")[1]}
                      </TabsTrigger>
                    ))}
                </TabsList>

                {selectedLesson.progressByGrade
                  .filter(
                    (p) =>
                      p.groupCode &&
                      (p.evidenceDocumentStorageId || p.evidencePhotoStorageId),
                  )
                  .map((groupProgress) => {
                    const evidenceId =
                      groupProgress.evidenceDocumentStorageId ||
                      groupProgress.evidencePhotoStorageId;
                    const evidenceType = groupProgress.evidencePhotoStorageId
                      ? "image"
                      : "pdf";
                    const groupNumber = (groupProgress.groupCode || "").split(
                      "-",
                    )[1];

                    if (!evidenceId || !groupProgress.groupCode) return null;

                    return (
                      <TabsContent
                        key={groupProgress.groupCode}
                        value={groupProgress.groupCode}
                        className="mt-4"
                      >
                        <EvidenceViewer
                          storageId={evidenceId}
                          type={evidenceType}
                          title={`Group ${groupNumber} Evidence`}
                          uploadedAt={groupProgress.completedAt}
                        />
                      </TabsContent>
                    );
                  })}
              </Tabs>
            )}
        </DialogContent>
      </Dialog>
    </AccordionItem>
  );
}
