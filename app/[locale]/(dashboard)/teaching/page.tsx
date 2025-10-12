"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  FileText,
  Filter,
  Search,
  Upload,
  CheckCircle,
  Clock,
  Circle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

// Tipos
export type Curriculum = {
  id: string;
  name: string;
  grade:
    | "Pre-K"
    | "K"
    | "1st"
    | "2nd"
    | "3rd"
    | "4th"
    | "5th"
    | "6th"
    | "7th"
    | "8th"
    | "9th"
    | "10th"
    | "11th"
    | "12th";
  lessonsCount: number;
  status: "active" | "inactive" | "draft" | "archived";
  quarters: number;
};

export type Lesson = {
  id: string;
  curriculumID: string;
  title: string;
  quarter: 1 | 2 | 3 | 4;
  orderInQuarter: number;
  isActive: boolean;
  isMandatory: boolean;
};

// Componente de tabla de lecciones para cada curriculum
function LessonsTable({ curriculumId }: { curriculumId: string }) {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [statusFilter, setStatusFilter] = React.useState<
    "active" | "inactive" | "all"
  >("all");
  const [quarterFilter, setQuarterFilter] = React.useState<
    "1" | "2" | "3" | "4" | "all"
  >("all");
  const [mandatoryFilter, setMandatoryFilter] = React.useState<
    "mandatory" | "optional" | "all"
  >("all");

  const [expandedCurriculum, setExpandedCurriculum] = useState<number | null>(
    null,
  );
  const [expandedQuarter, setExpandedQuarter] = useState<number | null>(null);

  // Datos de ejemplo
  const curricula = [
    {
      id: 1,
      name: "Matemáticas Avanzadas",
      code: "MAT-301",
      currentQuarter: 2,
      totalProgress: 45,
      quarters: [
        {
          id: 1,
          name: "Q1",
          progress: 100,
          lessons: [
            {
              id: "L1Q1",
              title: "Introducción al Cálculo",
              order: 1,
              status: "completed",
              evidences: 3,
            },
            {
              id: "L2Q1",
              title: "Límites y Continuidad",
              order: 2,
              status: "completed",
              evidences: 2,
            },
            {
              id: "L3Q1",
              title: "Derivadas Básicas",
              order: 3,
              status: "completed",
              evidences: 4,
            },
          ],
        },
        {
          id: 2,
          name: "Q2",
          progress: 60,
          lessons: [
            {
              id: "L4Q2",
              title: "Regla de la Cadena",
              order: 1,
              status: "completed",
              evidences: 2,
            },
            {
              id: "L5Q2",
              title: "Aplicaciones de Derivadas",
              order: 2,
              status: "in-progress",
              evidences: 1,
            },
            {
              id: "L6Q2",
              title: "Integrales Indefinidas",
              order: 3,
              status: "pending",
              evidences: 0,
            },
            {
              id: "L7Q2",
              title: "Técnicas de Integración",
              order: 4,
              status: "pending",
              evidences: 0,
            },
          ],
        },
        {
          id: 3,
          name: "Q3",
          progress: 0,
          lessons: [
            {
              id: "L8Q3",
              title: "Integrales Definidas",
              order: 1,
              status: "pending",
              evidences: 0,
            },
            {
              id: "L9Q3",
              title: "Teorema Fundamental",
              order: 2,
              status: "pending",
              evidences: 0,
            },
          ],
        },
        {
          id: 4,
          name: "Q4",
          progress: 0,
          lessons: [
            {
              id: "L10Q4",
              title: "Series y Sucesiones",
              order: 1,
              status: "pending",
              evidences: 0,
            },
          ],
        },
      ],
    },
    {
      id: 2,
      name: "Física Moderna",
      code: "FIS-202",
      currentQuarter: 1,
      totalProgress: 25,
      quarters: [
        {
          id: 1,
          name: "Q1",
          progress: 100,
          lessons: [
            {
              id: "L11Q1",
              title: "Mecánica Cuántica Intro",
              order: 1,
              status: "completed",
              evidences: 2,
            },
            {
              id: "L12Q1",
              title: "Ondas y Partículas",
              order: 2,
              status: "completed",
              evidences: 3,
            },
          ],
        },
        {
          id: 2,
          name: "Q2",
          progress: 0,
          lessons: [
            {
              id: "L13Q2",
              title: "Relatividad Especial",
              order: 1,
              status: "pending",
              evidences: 0,
            },
          ],
        },
        {
          id: 3,
          name: "Q3",
          progress: 0,
          lessons: [],
        },
        {
          id: 4,
          name: "Q4",
          progress: 0,
          lessons: [],
        },
      ],
    },
  ];

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "in-progress":
        return "secondary";
      case "pending":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "in-progress":
        return <Clock className="w-4 h-4" />;
      case "pending":
        return <Circle className="w-4 h-4" />;
      default:
        return <Circle className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Completada";
      case "in-progress":
        return "En Progreso";
      case "pending":
        return "Pendiente";
      default:
        return "Pendiente";
    }
  };

  return (
    <div className="space-y-6">
      {curricula.map((curriculum) => (
        <Card key={curriculum.id} className="border-border/60 bg-card shadow-sm hover:shadow-md transition-shadow">
          <Collapsible
            open={expandedCurriculum === curriculum.id}
            onOpenChange={() =>
              setExpandedCurriculum(
                expandedCurriculum === curriculum.id ? null : curriculum.id,
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
                          {curriculum.name}
                        </CardTitle>
                        <Badge variant="secondary" className="text-xs w-fit">{curriculum.code}</Badge>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4">
                        <Progress
                          value={curriculum.totalProgress}
                          className="bg-gray-200 [&>div]:bg-deep-koamaru flex-1"
                        />
                        <span className="text-xs sm:text-sm font-medium whitespace-nowrap text-muted-foreground">
                          {curriculum.totalProgress}%
                        </span>
                      </div>
                    </div>
                  </div>
                  {expandedCurriculum === curriculum.id ? (
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
                    {curriculum.quarters.map((quarter) => (
                      <Card
                        key={quarter.id}
                        className="cursor-pointer border-border/60 bg-card shadow-sm hover:shadow-md transition-all"
                        onClick={() =>
                          setExpandedQuarter(
                            expandedQuarter === quarter.id ? null : quarter.id,
                          )
                        }
                      >
                        <CardHeader className="py-3 px-2 sm:p-4">
                          <div className="text-center mb-1 sm:mb-2">
                            <CardTitle className="text-sm sm:text-base font-semibold">
                              {quarter.name}
                            </CardTitle>
                          </div>
                          <Progress
                            value={quarter.progress}
                            className={`bg-gray-200 [&>div]:bg-deep-koamaru mb-1 sm:mb-2 ${quarter.progress === 100 ? "[&>div]:bg-green-700" : ""}`}
                          />
                          <CardDescription className="text-center text-[10px] sm:text-xs text-muted-foreground">
                            {quarter.lessons.length} lecciones
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>

                  {/* Lessons List */}
                  {curriculum.quarters.map(
                    (quarter) =>
                      expandedQuarter === quarter.id && (
                        <Card key={quarter.id} className="bg-accent/20 border-border/60 shadow-sm">
                          <CardHeader className="py-4 px-3 sm:px-6">
                            <CardTitle className="text-base sm:text-lg font-semibold flex items-center flex-wrap gap-2">
                              <Badge className="bg-deep-koamaru">{quarter.name}</Badge>
                              <span className="text-sm sm:text-base">Lecciones</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="py-0 px-3 sm:px-6 pb-4 sm:pb-6">
                            <div className="space-y-3">
                              {quarter.lessons.map((lesson) => (
                                <Card
                                  key={lesson.id}
                                  className="border-border/60 bg-card shadow-sm hover:shadow-md hover:border-blue-400/60 transition-all"
                                >
                                  <CardContent className="py-4 px-3 sm:px-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                      <div 
                                        className="flex items-start sm:items-center gap-2 sm:gap-4 flex-1 cursor-pointer min-w-0"
                                        onClick={() => router.push(`/${locale}/teaching/lessons/${lesson.id}`)}
                                      >
                                        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                                          <Badge
                                            variant="secondary"
                                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm"
                                          >
                                            {lesson.order}
                                          </Badge>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <h4 className="font-medium text-sm sm:text-base text-foreground hover:text-blue-600 transition-colors truncate">
                                            {lesson.title}
                                          </h4>
                                          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                                            {getStatusText(lesson.status)}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 pl-9 sm:pl-0">
                                        <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground">
                                          <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                                          <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
                                            {lesson.evidences} evidencias
                                          </span>
                                        </div>
                                        <TeacherDialog 
                                          lesson={{ id: lesson.id, title: lesson.title }}
                                          trigger={
                                            <Button size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
                                              <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1" />
                                              <span className="hidden sm:inline">Adjuntar</span>
                                            </Button>
                                          }
                                        />
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ),
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}
    </div>
  );
}

function LessonStatusBadge({ isActive }: { isActive: boolean }) {
  const styles = isActive
    ? "bg-emerald-500/10 text-emerald-700"
    : "bg-gray-500/15 text-gray-700";

  return (
    <Badge
      className={`rounded-full px-3 py-0.5 text-xs font-medium inline-flex ${styles}`}
    >
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );
}

function CurriculumStatusBadge({
  status,
}: {
  status: "active" | "inactive" | "draft" | "archived";
}) {
  const styles: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-700",
    inactive: "bg-gray-500/15 text-gray-700",
    draft: "bg-amber-500/15 text-amber-700",
    archived: "bg-rose-500/20 text-rose-700",
  };

  const capitalize = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  return (
    <Badge
      className={`rounded-full px-3 py-0.5 text-xs font-medium inline-flex ${
        styles[status] ?? styles.inactive
      }`}
    >
      {capitalize(status)}
    </Badge>
  );
}

export default function TeachingPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">My Courses</h2>
          <p className="text-muted-foreground">
            View your assigned curriculums and lessons
          </p>
        </div>
      </div>

      <LessonsTable curriculumId="1" />
    </div>
  );
}
