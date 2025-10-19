"use client"

import * as React from "react"
import { useRouter, useParams } from "next/navigation"
import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    type ColumnDef,
    type ColumnFiltersState,
    type SortingState,
    type VisibilityState,
} from "@tanstack/react-table"
import { ArrowUpDown, Filter, Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
    PaginationEllipsis,
} from "@/components/ui/pagination"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { AddLessonsDialog } from "./add-lessons-dialog"

// Lesson type definition based on Convex schema
type Lesson = Doc<"curriculum_lessons">

const quarterOptions = [
    { label: "Quarter 1", value: "1" },
    { label: "Quarter 2", value: "2" },
    { label: "Quarter 3", value: "3" },
    { label: "Quarter 4", value: "4" },
]

// Extend the meta type for custom className
declare module "@tanstack/react-table" {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface ColumnMeta<TData = unknown, TValue = unknown> {
        className?: string
    }
}

// Status Badge Component
function LessonStatusBadge({ isActive }: { isActive: boolean }) {
    const styles = isActive
        ? "bg-emerald-500/10 text-emerald-700"
        : "bg-gray-500/15 text-gray-700"

    return (
        <Badge
            className={`rounded-full px-3 py-0.5 text-xs font-medium inline-flex ${styles}`}
        >
            {isActive ? "Active" : "Inactive"}
        </Badge>
    )
}

// Column definitions
export const columns: ColumnDef<Lesson>[] = [
    {
        accessorKey: "title",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === "asc")
                    }
                    className="h-9 px-2 lg:px-4 text-white hover:bg-white/10 hover:text-white"
                >
                    Lesson
                    <ArrowUpDown className="h-4 w-4 text-white" />
                </Button>
            )
        },
        cell: ({ row }) => {
            const lesson = row.original
            return (
                <div className="space-y-2 py-1">
                    <div className="font-medium text-sm lg:text-base">
                        {row.getValue("title")}
                    </div>
                    <div className="flex lg:hidden flex-col gap-1.5 text-xs lg:text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge className="bg-blue-500/15 text-blue-700 border border-blue-200 text-xs px-2 py-0.5">
                                Q{lesson.quarter} (#{lesson.orderInQuarter})
                            </Badge>
                            <LessonStatusBadge isActive={lesson.isActive} />
                        </div>
                    </div>
                </div>
            )
        },
        filterFn: (row, id, value) => {
            const title = row.getValue("title") as string
            const searchValue = value.toLowerCase()
            return title.toLowerCase().includes(searchValue)
        },
    },
    {
        accessorKey: "quarter",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === "asc")
                    }
                    className="hidden lg:flex items-center h-10 px-4 text-white hover:bg-white/10 hover:text-white"
                >
                    Quarter (Order)
                    <ArrowUpDown className="h-4 w-4 text-white" />
                </Button>
            )
        },
        cell: ({ row }) => {
            const lesson = row.original
            return (
                <div className="text-sm hidden lg:block py-1">
                    Q{lesson.quarter} (#{lesson.orderInQuarter})
                </div>
            )
        },
        meta: {
            className: "hidden lg:table-cell",
        },
        filterFn: (row, id, value) => {
            const quarterValue = row.getValue(id) as number
            return value.includes(quarterValue.toString())
        },
    },
    {
        accessorKey: "description",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === "asc")
                    }
                    className="hidden lg:flex items-center h-10 px-5 text-white hover:bg-white/10 hover:text-white"
                >
                    Description
                    <ArrowUpDown className="h-4 w-4 text-white" />
                </Button>
            )
        },
        cell: ({ row }) => {
            const description = row.getValue("description") as string | undefined
            return (
                <div className="hidden lg:block py-1 text-sm text-muted-foreground max-w-md truncate">
                    {description || <span className="italic">No description</span>}
                </div>
            )
        },
        meta: {
            className: "hidden lg:table-cell",
        },
    },
    {
        accessorKey: "isMandatory",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === "asc")
                    }
                    className="h-10 px-2 lg:px-5 text-white hover:bg-white/10 hover:text-white"
                >
                    Mandatory
                    <ArrowUpDown className="h-4 w-4 text-white" />
                </Button>
            )
        },
        cell: ({ row }) => {
            const isMandatory = row.getValue("isMandatory") as boolean
            return (
                <div className="flex items-center justify-center py-1">
                    {isMandatory ? (
                        <Badge className="bg-orange-500/15 text-orange-700 border border-orange-200 text-xs px-2 py-0.5">
                            Required
                        </Badge>
                    ) : (
                        <Badge className="bg-gray-500/15 text-gray-700 border border-gray-200 text-xs px-2 py-0.5">
                            Optional
                        </Badge>
                    )}
                </div>
            )
        },
        filterFn: (row, id, value) => {
            if (value === "all") return true
            const isMandatory = row.getValue(id) as boolean
            return value === "mandatory" ? isMandatory : !isMandatory
        },
    },
]

interface CurriculumLessonsCardProps {
    curriculumId: string
}

export function CurriculumLessonsCard({
    curriculumId,
}: CurriculumLessonsCardProps) {
    const router = useRouter()
    const params = useParams()
    const locale = params.locale as string

    // Get curriculum to extract grades
    const curriculum = useQuery(
        api.curriculums.getCurriculum,
        { curriculumId: curriculumId as Id<"curriculums"> }
    )

    // Get lessons from Convex - by default only active lessons
    const lessons = useQuery(
        api.curriculums.getLessonsByCurriculum,
        { curriculumId: curriculumId as Id<"curriculums"> }
    )

    // Get campuses to get grade levels for sorting
    const campuses = useQuery(api.campuses.getCampuses, {})

    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})
    const [quarterFilter, setQuarterFilter] = React.useState<
        "1" | "2" | "3" | "4" | "all"
    >("all")
    const [mandatoryFilter, setMandatoryFilter] = React.useState<
        "mandatory" | "optional" | "all"
    >("all")
    const [activeGradeTab, setActiveGradeTab] = React.useState<string>("")

    // Get all unique grades from curriculum assignments, sorted by level
    const allGrades = React.useMemo(() => {
        if (!curriculum?.campusAssignments || !campuses) return []

        // Collect all grade codes
        const gradesSet = new Set<string>()
        curriculum.campusAssignments.forEach((assignment: { campusId: Id<"campuses">, gradeCodes: string[] }) => {
            assignment.gradeCodes.forEach((code: string) => gradesSet.add(code))
        })

        // Create a map of grade code to level
        const gradeToLevel = new Map<string, number>()

        curriculum.campusAssignments.forEach((assignment: { campusId: Id<"campuses">, gradeCodes: string[] }) => {
            const campus = campuses.find(c => c._id === assignment.campusId)
            if (campus?.grades) {
                campus.grades.forEach(grade => {
                    if (assignment.gradeCodes.includes(grade.code)) {
                        gradeToLevel.set(grade.code, grade.level)
                    }
                })
            }
        })

        // Sort grades by level
        return Array.from(gradesSet).sort((a, b) => {
            const levelA = gradeToLevel.get(a) ?? 999
            const levelB = gradeToLevel.get(b) ?? 999
            return levelA - levelB
        })
    }, [curriculum, campuses])

    // Set initial active tab when grades are loaded
    React.useEffect(() => {
        if (allGrades.length > 0 && !activeGradeTab) {
            setActiveGradeTab(allGrades[0])
        }
    }, [allGrades, activeGradeTab])

    // Filter lessons by active grade tab
    const filteredLessonsByGrade = React.useMemo(() => {
        if (!lessons || !activeGradeTab) return []

        return lessons.filter(lesson => {
            // Check if lesson has gradeCodes array (new format)
            if (lesson.gradeCodes && lesson.gradeCodes.length > 0) {
                return lesson.gradeCodes.includes(activeGradeTab)
            }
            // Fallback to gradeCode (legacy format)
            if (lesson.gradeCode) {
                return lesson.gradeCode === activeGradeTab
            }
            // If no grade specified, don't show in any tab
            return false
        })
    }, [lessons, activeGradeTab])

    const table = useReactTable({
        data: filteredLessonsByGrade,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    })

    // Apply quarter filter to the table
    React.useEffect(() => {
        if (quarterFilter === "all") {
            table.getColumn("quarter")?.setFilterValue(undefined)
        } else {
            table.getColumn("quarter")?.setFilterValue([quarterFilter])
        }
    }, [quarterFilter, table])

    // Apply mandatory filter to the table
    React.useEffect(() => {
        if (mandatoryFilter === "all") {
            table.getColumn("isMandatory")?.setFilterValue(undefined)
        } else {
            table.getColumn("isMandatory")?.setFilterValue(mandatoryFilter)
        }
    }, [mandatoryFilter, table])

    // Loading state
    if (lessons === undefined) {
        return (
            <Card className="border shadow-sm overflow-hidden">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold tracking-tight">
                        Curriculum Lessons
                    </CardTitle>
                    <CardDescription className="text-sm">
                        All lessons assigned to this curriculum
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <div className="text-muted-foreground">Loading lessons...</div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border shadow-sm overflow-hidden">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold tracking-tight">Curriculum Lessons</CardTitle>
                <CardDescription className="text-sm">All lessons assigned to this curriculum</CardDescription>
            </CardHeader>
            <CardContent className="px-0 pt-0">
                {allGrades.length === 0 ? (
                    <div className="flex items-center justify-center py-8 px-4">
                        <div className="text-muted-foreground text-center">
                            <p>No grades assigned to this curriculum yet.</p>
                            <p className="text-sm mt-2">Assign grades to the curriculum to create lessons.</p>
                        </div>
                    </div>
                ) : (
                    <Tabs value={activeGradeTab} onValueChange={setActiveGradeTab}>
                        <div className="mx-4 md:mx-6 mt-4">
                            <TabsList>
                                {allGrades.map((gradeCode) => {
                                    const gradeLessons = lessons?.filter(l =>
                                        (l.gradeCodes?.includes(gradeCode)) || l.gradeCode === gradeCode
                                    ) || []
                                    return (
                                        <TabsTrigger
                                            key={gradeCode}
                                            value={gradeCode}
                                        >
                                            <span className="font-medium">{gradeCode}</span>
                                            <Badge variant="secondary" className="ml-2 text-xs">
                                                {gradeLessons.length}
                                            </Badge>
                                        </TabsTrigger>
                                    )
                                })}
                            </TabsList>
                        </div>

                        {allGrades.map((gradeCode) => (
                            <TabsContent key={gradeCode} value={gradeCode}>
                                <div className="w-full">
                                    {/* Filters */}
                                    <div className="flex items-center justify-between gap-4 px-4 md:px-6 py-4 border-t">
                                        <div className="flex flex-1 items-center gap-4">
                                            <div className="relative flex-1">
                                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    value={
                                                        (table
                                                            .getColumn("title")
                                                            ?.getFilterValue() as string) ?? ""
                                                    }
                                                    onChange={(event) =>
                                                        table
                                                            .getColumn("title")
                                                            ?.setFilterValue(event.target.value)
                                                    }
                                                    placeholder="Search by lesson title"
                                                    aria-label="Search lessons"
                                                    className="pl-10 pr-4 rounded-l bg-card"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {/* Botón Clear all - visible solo cuando hay filtros activos */}
                                            {(quarterFilter !== "all" ||
                                                mandatoryFilter !== "all" ||
                                                ((table
                                                    .getColumn("title")
                                                    ?.getFilterValue() as string)?.length ?? 0) > 0) && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setQuarterFilter("all")
                                                            setMandatoryFilter("all")
                                                            table.getColumn("title")?.setFilterValue("")
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
                                                                Quarter
                                                            </label>
                                                            <Select
                                                                value={quarterFilter}
                                                                onValueChange={(value) =>
                                                                    setQuarterFilter(
                                                                        value as "1" | "2" | "3" | "4" | "all"
                                                                    )
                                                                }
                                                            >
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue placeholder="All Quarters" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="all">
                                                                        All Quarters
                                                                    </SelectItem>
                                                                    {quarterOptions.map((quarter) => (
                                                                        <SelectItem
                                                                            key={quarter.value}
                                                                            value={quarter.value}
                                                                        >
                                                                            {quarter.label}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium text-foreground">
                                                                Type
                                                            </label>
                                                            <Select
                                                                value={mandatoryFilter}
                                                                onValueChange={(value) =>
                                                                    setMandatoryFilter(
                                                                        value as
                                                                        | "mandatory"
                                                                        | "optional"
                                                                        | "all"
                                                                    )
                                                                }
                                                            >
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue placeholder="Select type" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="all">
                                                                        All Types
                                                                    </SelectItem>
                                                                    <SelectItem value="mandatory">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-2 h-2 rounded-full bg-orange-600"></div>
                                                                            Mandatory
                                                                        </div>
                                                                    </SelectItem>
                                                                    <SelectItem value="optional">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                                                                            Optional
                                                                        </div>
                                                                    </SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                </DropdownMenuContent>
                                            </DropdownMenu>

                                            <AddLessonsDialog curriculumId={curriculumId as Id<"curriculums">} />
                                        </div>
                                    </div>
                                    <div className="overflow-hidden  border">
                                        <Table>
                                            <TableHeader className="bg-deep-koamaru text-white">
                                                {table.getHeaderGroups().map((headerGroup) => (
                                                    <TableRow
                                                        key={headerGroup.id}
                                                        className="border-b hover:bg-deep-koamaru"
                                                    >
                                                        {headerGroup.headers.map((header) => {
                                                            return (
                                                                <TableHead
                                                                    key={header.id}
                                                                    className={`py-3 px-0 lg:px-5 ${header.column.columnDef.meta
                                                                        ?.className || ""
                                                                        }`}
                                                                >
                                                                    {header.isPlaceholder
                                                                        ? null
                                                                        : flexRender(
                                                                            header.column.columnDef.header,
                                                                            header.getContext()
                                                                        )}
                                                                </TableHead>
                                                            )
                                                        })}
                                                    </TableRow>
                                                ))}
                                            </TableHeader>
                                            <TableBody>
                                                {table.getRowModel().rows?.length ? (
                                                    table.getRowModel().rows.map((row) => (
                                                        <TableRow
                                                            key={row.id}
                                                            data-state={row.getIsSelected() && "selected"}
                                                            className="border-b last:border-0 cursor-pointer hover:bg-accent/50 transition-colors"
                                                            onClick={() => {
                                                                const lessonId = row.original._id
                                                                router.push(`/${locale}/lessons/${lessonId}`)
                                                            }}
                                                        >
                                                            {row.getVisibleCells().map((cell) => (
                                                                <TableCell
                                                                    key={cell.id}
                                                                    className={`py-4 px-2 lg:px-5 ${cell.column.columnDef.meta
                                                                        ?.className || ""
                                                                        }`}
                                                                >
                                                                    {flexRender(
                                                                        cell.column.columnDef.cell,
                                                                        cell.getContext()
                                                                    )}
                                                                </TableCell>
                                                            ))}
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell
                                                            colSpan={columns.length}
                                                            className="h-24 text-center"
                                                        >
                                                            No results.
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <div className="flex items-center justify-between gap-4 px-4 md:px-6 py-4">
                                        {/* Left: count text */}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm text-muted-foreground truncate">
                                                Showing {table.getRowModel().rows.length} of {filteredLessonsByGrade.length}{" "}
                                                lesson(s) in {activeGradeTab}
                                            </div>
                                        </div>

                                        {/* Right: pagination (shadcn/ui demo style) */}
                                        <Pagination>
                                            <PaginationContent>
                                                <PaginationItem>
                                                    <PaginationPrevious
                                                        href="#"
                                                        onClick={e => {
                                                            e.preventDefault();
                                                            table.previousPage();
                                                        }}
                                                        className={!table.getCanPreviousPage() ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                                    />
                                                </PaginationItem>
                                                {Array.from({ length: table.getPageCount() }, (_, i) => (
                                                    <PaginationItem key={i}>
                                                        <PaginationLink
                                                            href="#"
                                                            isActive={table.getState().pagination.pageIndex === i}
                                                            onClick={e => {
                                                                e.preventDefault();
                                                                table.setPageIndex(i);
                                                            }}
                                                        >
                                                            {i + 1}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                ))}
                                                {table.getPageCount() > 5 && (
                                                    <PaginationItem>
                                                        <PaginationEllipsis />
                                                    </PaginationItem>
                                                )}
                                                <PaginationItem>
                                                    <PaginationNext
                                                        href="#"
                                                        onClick={e => {
                                                            e.preventDefault();
                                                            table.nextPage();
                                                        }}
                                                        className={!table.getCanNextPage() ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                                    />
                                                </PaginationItem>
                                            </PaginationContent>
                                        </Pagination>
                                    </div>
                                </div>
                            </TabsContent>
                        ))}
                    </Tabs>
                )}
            </CardContent>
        </Card>
    )
}
