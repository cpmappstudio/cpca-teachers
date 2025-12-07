"use client";

import * as React from "react";
import { Filter, Search } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Accordion } from "@/components/ui/accordion";
import { AddCurriculumDialog } from "./add-curriculum-dialog";
import { CurriculumAssignmentItem } from "./curriculum-assignment-item";

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
  gradeNames: string[]; // Grade names from curriculum campus assignments

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
  progressByQuarter: Record<
    number,
    {
      total: number;
      completed: number;
      inProgress: number;
      notStarted: number;
    }
  >;

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
  const [expandedCurriculum, setExpandedCurriculum] = React.useState<
    string | null
  >(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [expandedQuarter, setExpandedQuarter] = React.useState<string | null>(
    null,
  );
  const hasInitialized = React.useRef(false);
  const handleViewEvidence = (
    _storageId: Id<"_storage">,
    _title: string,
    _type: "image" | "pdf",
  ) => {
    // Evidence viewing is now handled by CurriculumAssignmentItem
  };

  // Query teacher assignments with real progress from database
  const assignments = useQuery(api.progress.getTeacherAssignmentsWithProgress, {
    teacherId: teacherId as Id<"users">,
    isActive: true,
  }) as TeacherAssignmentWithProgress[] | undefined;

  const allData = React.useMemo(() => assignments || [], [assignments]);

  // Set first curriculum as expanded by default (only once)
  React.useEffect(() => {
    if (allData.length > 0 && !hasInitialized.current) {
      setExpandedCurriculum(allData[0]._id);
      hasInitialized.current = true;
    }
  }, [allData]);

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
      if (
        gradeFilter !== "all" &&
        !assignment.gradeNames?.includes(gradeFilter)
      ) {
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
  }, [allData, searchQuery, statusFilter, gradeFilter]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold tracking-tight">
          Teaching Assignments & Progress
        </CardTitle>
        <CardDescription className="text-sm">
          Individual progress tracking for each assigned curriculum. View
          completion status, uploaded evidence, and lesson details.
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
                        {Array.from(
                          new Set(data.flatMap((c) => c.gradeNames || [])),
                        )
                          .filter(Boolean)
                          .sort()
                          .map((gradeName) => (
                            <SelectItem key={gradeName} value={gradeName}>
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
                            | "all",
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
          <Accordion
            type="single"
            collapsible
            value={expandedCurriculum || undefined}
            onValueChange={(value) => {
              setExpandedCurriculum(value || null);
              setExpandedQuarter(null);
            }}
            className="space-y-6"
          >
            {data.map((assignment) => (
              <CurriculumAssignmentItem
                key={assignment._id}
                assignment={assignment}
                onViewEvidence={handleViewEvidence}
              />
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

// Component to show evidence in modal
