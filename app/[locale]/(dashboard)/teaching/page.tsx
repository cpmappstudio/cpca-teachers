"use client"

import * as React from "react"
import { useRouter, useParams } from "next/navigation"
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
} from "@tanstack/react-table"
import { ArrowUpDown, Filter, Search, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { TeacherDialog } from "@/components/teaching/upload-lesson-dialog"

// Tipos
export type Curriculum = {
    id: string
    name: string
    grade: "Pre-K" | "K" | "1st" | "2nd" | "3rd" | "4th" | "5th" | "6th" | "7th" | "8th" | "9th" | "10th" | "11th" | "12th"
    lessonsCount: number
    status: "active" | "inactive" | "draft" | "archived"
    quarters: number
}

export type Lesson = {
    id: string
    curriculumID: string
    title: string
    quarter: 1 | 2 | 3 | 4
    orderInQuarter: number
    isActive: boolean
    isMandatory: boolean
}

// Datos de ejemplo (luego se reemplazará con datos de Convex)
const curriculums: Curriculum[] = [
    {
        id: "MATH-10-001",
        name: "Mathematics Grade 10",
        grade: "10th",
        lessonsCount: 45,
        status: "active",
        quarters: 4,
    },
    {
        id: "SCI-09-001",
        name: "General Science",
        grade: "9th",
        lessonsCount: 38,
        status: "active",
        quarters: 4,
    },
    {
        id: "ENG-11-001",
        name: "English Literature",
        grade: "11th",
        lessonsCount: 52,
        status: "active",
        quarters: 4,
    },
    {
        id: "CHEM-11-001",
        name: "Chemistry Advanced",
        grade: "11th",
        lessonsCount: 48,
        status: "active",
        quarters: 4,
    },
]

const lessons: Lesson[] = [
    {
        id: "LESSON-001",
        curriculumID: "MATH-10-001",
        title: "Introduction to Algebra",
        quarter: 1,
        orderInQuarter: 1,
        isActive: true,
        isMandatory: true,
    },
    {
        id: "LESSON-002",
        curriculumID: "MATH-10-001",
        title: "Linear Equations",
        quarter: 1,
        orderInQuarter: 2,
        isActive: true,
        isMandatory: true,
    },
    {
        id: "LESSON-003",
        curriculumID: "MATH-10-001",
        title: "Quadratic Functions",
        quarter: 1,
        orderInQuarter: 3,
        isActive: true,
        isMandatory: false,
    },
    {
        id: "LESSON-004",
        curriculumID: "SCI-09-001",
        title: "Scientific Method",
        quarter: 1,
        orderInQuarter: 1,
        isActive: true,
        isMandatory: true,
    },
    {
        id: "LESSON-005",
        curriculumID: "SCI-09-001",
        title: "Cell Biology",
        quarter: 1,
        orderInQuarter: 2,
        isActive: true,
        isMandatory: true,
    },
    {
        id: "LESSON-006",
        curriculumID: "ENG-11-001",
        title: "Shakespeare's Sonnets",
        quarter: 2,
        orderInQuarter: 1,
        isActive: true,
        isMandatory: false,
    },
    {
        id: "LESSON-008",
        curriculumID: "MATH-10-001",
        title: "Geometry Fundamentals",
        quarter: 2,
        orderInQuarter: 1,
        isActive: true,
        isMandatory: true,
    },
    {
        id: "LESSON-009",
        curriculumID: "CHEM-11-001",
        title: "Atomic Structure",
        quarter: 1,
        orderInQuarter: 1,
        isActive: true,
        isMandatory: true,
    },
    {
        id: "LESSON-010",
        curriculumID: "CHEM-11-001",
        title: "Chemical Bonding",
        quarter: 1,
        orderInQuarter: 2,
        isActive: true,
        isMandatory: false,
    },
]

const quarterOptions = [
    { label: "Quarter 1", value: "1" },
    { label: "Quarter 2", value: "2" },
    { label: "Quarter 3", value: "3" },
    { label: "Quarter 4", value: "4" },
]

// Columnas para la tabla de lecciones
const lessonColumns: ColumnDef<Lesson>[] = [
    {
        accessorKey: "title",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-10 px-2 lg:px-4 text-white hover:bg-white/10 hover:text-white"
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
                    <div className="font-medium text-sm lg:text-base">{row.getValue("title")}</div>
                    <div className="flex lg:hidden flex-col gap-1.5 text-xs lg:text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge className="bg-blue-500/15 text-blue-700 border border-blue-200 text-xs px-2 py-0.5">
                                Q{lesson.quarter} (#{lesson.orderInQuarter})
                            </Badge>
                            <LessonStatusBadge isActive={lesson.isActive} />
                            {lesson.isMandatory ? (
                                <Badge className="bg-orange-500/15 text-orange-700 border border-orange-200 text-xs px-2 py-0.5">
                                    Required
                                </Badge>
                            ) : (
                                <Badge className="bg-gray-500/15 text-gray-700 border border-gray-200 text-xs px-2 py-0.5">
                                    Optional
                                </Badge>
                            )}
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
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
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
        accessorKey: "isActive",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="hidden lg:flex items-center h-10 px-5 text-white hover:bg-white/10 hover:text-white"
                >
                    Status
                    <ArrowUpDown className="h-4 w-4 text-white" />
                </Button>
            )
        },
        cell: ({ row }) => (
            <div className="hidden lg:block py-1">
                <LessonStatusBadge isActive={row.original.isActive} />
            </div>
        ),
        meta: {
            className: "hidden lg:table-cell",
        },
        filterFn: (row, id, value) => {
            if (value === "all") return true
            const isActive = row.getValue(id) as boolean
            return value === "active" ? isActive : !isActive
        },
    },
    {
        accessorKey: "isMandatory",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="hidden lg:flex items-center h-10 px-2 lg:px-5 text-white hover:bg-white/10 hover:text-white"
                >
                    Mandatory
                    <ArrowUpDown className="h-4 w-4 text-white" />
                </Button>
            )
        },
        cell: ({ row }) => {
            const isMandatory = row.getValue("isMandatory") as boolean
            return (
                <div className="hidden lg:flex items-center justify-center py-1">
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
        meta: {
            className: "hidden lg:table-cell",
        },
        filterFn: (row, id, value) => {
            if (value === "all") return true
            const isMandatory = row.getValue(id) as boolean
            return value === "mandatory" ? isMandatory : !isMandatory
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const lesson = row.original
            return (
                <div 
                    className="flex items-center justify-center gap-2 py-1"
                    onClick={(e) => e.stopPropagation()}
                >
                    <TeacherDialog
                        lesson={{
                            id: lesson.id,
                            title: lesson.title,
                        }}
                        trigger={
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-primary/10"
                                title="Upload lesson proof"
                            >
                                <Upload className="h-4 w-4" />
                            </Button>
                        }
                    />
                </div>
            )
        },
    },
]

// Componente de tabla de lecciones para cada curriculum
function LessonsTable({ curriculumId }: { curriculumId: string }) {
    const router = useRouter()
    const params = useParams()
    const locale = params.locale as string
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [statusFilter, setStatusFilter] = React.useState<"active" | "inactive" | "all">("all")
    const [quarterFilter, setQuarterFilter] = React.useState<"1" | "2" | "3" | "4" | "all">("all")
    const [mandatoryFilter, setMandatoryFilter] = React.useState<"mandatory" | "optional" | "all">("all")

    // Filtrar lecciones por curriculum
    const curriculumLessons = React.useMemo(
        () => lessons.filter((lesson) => lesson.curriculumID === curriculumId),
        [curriculumId]
    )

    const table = useReactTable({
        data: curriculumLessons,
        columns: lessonColumns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
        },
    })

    // Apply status filter to the table
    React.useEffect(() => {
        if (statusFilter === "all") {
            table.getColumn("isActive")?.setFilterValue(undefined)
        } else {
            table.getColumn("isActive")?.setFilterValue(statusFilter)
        }
    }, [statusFilter, table])

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

    return (
        <div className="w-full mt-4">
            {/* Filters */}
            <div className="flex items-center justify-between gap-4 py-5">
                <div className="flex flex-1 items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
                            onChange={(event) =>
                                table.getColumn("title")?.setFilterValue(event.target.value)
                            }
                            placeholder="Search by lesson title"
                            aria-label="Search lessons"
                            className="pl-10 pr-4 rounded-l bg-card h-10"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Botón Clear all - visible solo cuando hay filtros activos */}
                    {(statusFilter !== "all" ||
                        quarterFilter !== "all" ||
                        mandatoryFilter !== "all" ||
                        (table.getColumn("title")?.getFilterValue() as string)?.length > 0) && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setStatusFilter("all")
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
                            <Button variant="outline" size="lg" className="h-10 px-3 bg-card">
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
                                            setQuarterFilter(value as "1" | "2" | "3" | "4" | "all")
                                        }
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="All Quarters" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Quarters</SelectItem>
                                            {quarterOptions.map((quarter) => (
                                                <SelectItem key={quarter.value} value={quarter.value}>
                                                    {quarter.label}
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
                                            setStatusFilter(value as "active" | "inactive" | "all")
                                        }
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Lessons</SelectItem>
                                            <SelectItem value="active">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-green-600"></div>
                                                    Active
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="inactive">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                                                    Inactive
                                                </div>
                                            </SelectItem>
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
                                            setMandatoryFilter(value as "mandatory" | "optional" | "all")
                                        }
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Types</SelectItem>
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
                </div>
            </div>
            <div className="overflow-hidden rounded-md border">
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
                                            className={`py-3 px-0 lg:px-5 ${header.column.columnDef.meta?.className || ""
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
                                    className="border-b last:border-0 cursor-pointer hover:bg-accent/50 transition-colors"
                                    onClick={() => {
                                        const lessonId = row.original.id
                                        router.push(`/${locale}/lessons/${lessonId}`)
                                    }}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell
                                            key={cell.id}
                                            className={`py-4 px-2 lg:px-5 ${cell.column.columnDef.meta?.className || ""
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
                                    colSpan={lessonColumns.length}
                                    className="h-24 text-center"
                                >
                                    No lessons found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-between gap-4 py-4">
                <div className="text-sm text-muted-foreground">
                    Showing {table.getRowModel().rows.length} of {curriculumLessons.length}{" "}
                    lesson(s)
                </div>
                <div className="space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    )
}

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

function CurriculumStatusBadge({
    status,
}: {
    status: "active" | "inactive" | "draft" | "archived"
}) {
    const styles: Record<string, string> = {
        active: "bg-emerald-500/10 text-emerald-700",
        inactive: "bg-gray-500/15 text-gray-700",
        draft: "bg-amber-500/15 text-amber-700",
        archived: "bg-rose-500/20 text-rose-700",
    }

    const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)

    return (
        <Badge
            className={`rounded-full px-3 py-0.5 text-xs font-medium inline-flex ${styles[status] ?? styles.inactive
                }`}
        >
            {capitalize(status)}
        </Badge>
    )
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

            <Accordion type="single" collapsible className="w-full space-y-4">
                {curriculums.map((curriculum) => (
                    <AccordionItem
                        key={curriculum.id}
                        value={curriculum.id}
                        className="border rounded-lg px-6 data-[state=open]:bg-accent/20"
                    >
                        <AccordionTrigger className="hover:no-underline py-4">
                            <div className="flex items-center justify-between w-full pr-4">
                                <div className="flex flex-col items-start gap-2">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg font-semibold">
                                            {curriculum.name}
                                        </span>
                                        <Badge className="bg-sky-500/15 text-sky-700 border border-sky-200">
                                            {curriculum.grade}
                                        </Badge>
                                        <CurriculumStatusBadge status={curriculum.status} />
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <span className="font-mono text-xs">
                                            {curriculum.id}
                                        </span>
                                        <span>•</span>
                                        <span>{curriculum.lessonsCount} lessons</span>
                                        <span>•</span>
                                        <span>{curriculum.quarters} quarters</span>
                                    </div>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-6">
                            <LessonsTable curriculumId={curriculum.id} />
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    )
}
