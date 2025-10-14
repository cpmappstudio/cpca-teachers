"use client";

import * as React from "react";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  FileText,
  Upload,

} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TeacherDialog } from "@/components/teaching/upload-lesson-dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Componente de tabla de lecciones para cada curriculum
function LessonsTable({ teacherId }: { teacherId: string }) {
  const [expandedCurriculum, setExpandedCurriculum] = useState<string | null>(null);
  const [expandedQuarter, setExpandedQuarter] = useState<string | null>(null);

  // Obtener progreso detallado del profesor
  const assignmentsWithProgress = useQuery(
    api.progress.getTeacherAssignmentsWithProgress,
    { teacherId: teacherId as Id<"users">, isActive: true }
  );

  // Obtener lecciones detalladas cuando se expande un currículum
  const selectedAssignment = assignmentsWithProgress?.find(a => a._id === expandedCurriculum);
  const assignmentLessonProgress = useQuery(
    api.progress.getAssignmentLessonProgress,
    selectedAssignment ? { assignmentId: selectedAssignment._id } : "skip"
  );

  if (!assignmentsWithProgress) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">Loading your courses...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (assignmentsWithProgress.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              No courses assigned yet. Please contact your administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
    <div className="space-y-6">
      {assignmentsWithProgress.map((assignment) => {
        const progressByQuarter = assignment.progressByQuarter || {};
        const totalProgress = assignment.progressSummary?.progressPercentage || 0;
        const isExpanded = expandedCurriculum === assignment._id;
        const lessons = isExpanded && assignmentLessonProgress ? assignmentLessonProgress.lessons : [];

        return (
          <Card key={assignment._id} className="border-border/60 bg-card shadow-sm hover:shadow-md transition-shadow">
            <Collapsible
              open={isExpanded}
              onOpenChange={() =>
                setExpandedCurriculum(
                  isExpanded ? null : assignment._id,
                )
              }
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors py-5 px-2 sm:px-6">
                  <div className="flex items-center justify-between gap-2 sm:gap-4">
                    <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                      <div className="bg-blue-100 p-2 sm:p-3 rounded-lg flex-shrink-0">
                        <BookOpen className="w-4 h-4 sm:w-6 sm:h-6 text-blue-900" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-2">
                          <CardTitle className="text-base sm:text-lg font-semibold text-foreground truncate">
                            {assignment.curriculumName}
                          </CardTitle>
                          {assignment.curriculumCode && (
                            <Badge variant="secondary" className="text-xs w-fit">{assignment.curriculumCode}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4">
                          <Progress
                            value={totalProgress}
                            className="bg-gray-200 [&>div]:bg-deep-koamaru flex-1"
                          />
                          <span className="text-xs sm:text-sm font-medium whitespace-nowrap text-muted-foreground">
                            {totalProgress}%
                          </span>
                        </div>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="py-5 px-2 sm:px-6">
                  <div className="border-t border-border/60 pt-4 sm:pt-6">
                    {/* Quarters Timeline */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-6">
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
                        const quarterKey = `${assignment._id}-Q${quarterNum}`;
                        const isQuarterExpanded = expandedQuarter === quarterKey;

                        return (
                          <Card
                            key={quarterNum}
                            className="cursor-pointer border-border/60 bg-card shadow-sm hover:shadow-md transition-all"
                            onClick={() =>
                              setExpandedQuarter(
                                isQuarterExpanded ? null : quarterKey,
                              )
                            }
                          >
                            <CardHeader className="py-3 px-2 sm:p-4">
                              <div className="text-center mb-1 sm:mb-2">
                                <CardTitle className="text-sm sm:text-base font-semibold">
                                  Q{quarterNum}
                                </CardTitle>
                              </div>
                              <Progress
                                value={quarterProgress}
                                className={`bg-gray-200 [&>div]:bg-deep-koamaru mb-1 sm:mb-2 ${quarterProgress === 100 ? "[&>div]:bg-green-700" : ""}`}
                              />
                              <CardDescription className="text-center text-[10px] sm:text-xs text-muted-foreground">
                                {quarterData.total} lessons
                              </CardDescription>
                            </CardHeader>
                          </Card>
                        );
                      })}
                    </div>

                    {/* Lessons List */}
                    {!assignmentLessonProgress && isExpanded && (
                      <p className="text-center text-muted-foreground py-4">Loading lessons...</p>
                    )}

                    {[1, 2, 3, 4].slice(0, assignment.numberOfQuarters).map((quarterNum) => {
                      const quarterKey = `${assignment._id}-Q${quarterNum}`;
                      if (expandedQuarter !== quarterKey) return null;

                      const lessonsByQuarter = lessons.filter(l => l.quarter === quarterNum);

                      return (
                        <Card key={quarterNum} className="bg-accent/20 border-border/60 shadow-sm">
                          <CardHeader className="py-4 px-3 sm:px-6">
                            <CardTitle className="text-base sm:text-lg font-semibold flex items-center flex-wrap gap-2">
                              <Badge className="bg-deep-koamaru">Q{quarterNum}</Badge>
                              <span className="text-sm sm:text-base">Lessons</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="py-0 px-3 sm:px-6 pb-4 sm:pb-6">
                            {lessonsByQuarter.length === 0 ? (
                              <p className="text-center text-muted-foreground py-8">
                                No lessons in this quarter
                              </p>
                            ) : (
                              <div className="space-y-3">
                                {lessonsByQuarter.map((lessonData) => (
                                  <Card
                                    key={lessonData.lessonId}
                                    className="border-border/60 bg-card shadow-sm"
                                  >
                                    <CardContent className="py-4 px-3 sm:px-4">
                                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <div
                                          className="flex items-start sm:items-center gap-2 sm:gap-4 flex-1 min-w-0"
                                        >
                                          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                                            <Badge
                                              variant="secondary"
                                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm"
                                            >
                                              {lessonData.orderInQuarter}
                                            </Badge>
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <h4 className="font-medium text-sm sm:text-base text-foreground truncate">
                                                {lessonData.title}
                                              </h4>
                                              {lessonData.totalGrades > 1 && (
                                                <Badge
                                                  variant={lessonData.completionPercentage === 100 ? "default" : lessonData.completionPercentage > 0 ? "secondary" : "outline"}
                                                  className="text-xs"
                                                >
                                                  {lessonData.completionPercentage}%
                                                </Badge>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                              <p className="text-xs sm:text-sm text-muted-foreground">
                                                {getStatusText(lessonData.overallStatus || lessonData.progress?.status || "not_started")}
                                              </p>
                                              {lessonData.totalGrades > 1 && assignmentLessonProgress?.grades && assignmentLessonProgress.grades.length > 0 && (
                                                <div className="flex items-center gap-1 flex-wrap">
                                                  {assignmentLessonProgress.grades.map((grade: { code: string; name: string }) => {
                                                    const hasEvidence = lessonData.progressByGrade?.find((p: { gradeCode?: string; evidenceDocumentStorageId?: Id<"_storage">; evidencePhotoStorageId?: Id<"_storage"> }) =>
                                                      p.gradeCode === grade.code && (p.evidenceDocumentStorageId || p.evidencePhotoStorageId)
                                                    );
                                                    return (
                                                      <Badge
                                                        key={grade.code}
                                                        variant={hasEvidence ? "default" : "outline"}
                                                        className="text-xs h-5 px-1.5"
                                                      >
                                                        {grade.name}
                                                        {hasEvidence && " ✓"}
                                                      </Badge>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 pl-9 sm:pl-0">
                                          <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground">
                                            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                                            <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
                                              {lessonData.progressByGrade && lessonData.progressByGrade.length > 0
                                                ? `${lessonData.progressByGrade.filter((p: { evidenceDocumentStorageId?: Id<"_storage">; evidencePhotoStorageId?: Id<"_storage"> }) => p.evidenceDocumentStorageId || p.evidencePhotoStorageId).length} evidence`
                                                : lessonData.progress?.evidencePhotoStorageId || lessonData.progress?.evidenceDocumentStorageId
                                                  ? 'Evidence uploaded'
                                                  : 'No evidence'}
                                            </span>
                                          </div>
                                          <TeacherDialog
                                            lesson={{
                                              id: lessonData.lessonId,
                                              title: lessonData.title
                                            }}
                                            assignmentId={assignment._id}
                                            trigger={
                                              <Button size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
                                                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1" />
                                                <span className="hidden sm:inline">Attach</span>
                                              </Button>
                                            }
                                          />
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
}


export default function TeachingPage() {
  const { user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">My Courses</h2>
            <p className="text-muted-foreground mt-1">
              View your assigned curriculums and lessons
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">My Courses</h2>
            <p className="text-muted-foreground mt-1">
              View your assigned curriculums and lessons
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Please sign in to view your courses.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">My Courses</h2>
          <p className="text-muted-foreground mt-1">
            View your assigned curriculums and lessons
          </p>
        </div>
      </div>

      <LessonsTable teacherId={user._id} />
    </div>
  );
}

