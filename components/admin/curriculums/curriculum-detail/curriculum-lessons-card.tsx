"use client"

import * as React from "react"
import { useParams } from "next/navigation"
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
import { ArrowUpDown, Filter, Plus, Search } from "lucide-react"

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
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"

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
    interface ColumnMeta<TData, TValue> {
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
        accessorKey: "isActive",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === "asc")
                    }
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
    const params = useParams()
    const locale = params.locale as string

    // Get lessons from Convex - by default only active lessons
    const lessons = useQuery(
        api.curriculums.getLessonsByCurriculum,
        { curriculumId: curriculumId as Id<"curriculums"> }
    )

    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})
    const [statusFilter, setStatusFilter] = React.useState<
        "active" | "inactive" | "all"
    >("all")
    const [quarterFilter, setQuarterFilter] = React.useState<
        "1" | "2" | "3" | "4" | "all"
    >("all")
    const [mandatoryFilter, setMandatoryFilter] = React.useState<
        "mandatory" | "optional" | "all"
    >("all")

    const table = useReactTable({
        data: lessons ?? [],
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

    // Empty state
    if (lessons.length === 0) {
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
                        <div className="text-muted-foreground">
                            No lessons found for this curriculum
                        </div>
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
                            {(statusFilter !== "all" ||
                                quarterFilter !== "all" ||
                                mandatoryFilter !== "all" ||
                                ((table
                                    .getColumn("title")
                                    ?.getFilterValue() as string)?.length ?? 0) > 0) && (
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
                                                Status
                                            </label>
                                            <Select
                                                value={statusFilter}
                                                onValueChange={(value) =>
                                                    setStatusFilter(
                                                        value as "active" | "inactive" | "all"
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">
                                                        All Lessons
                                                    </SelectItem>
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
                        </div>
                        <Button className="bg-sidebar-accent h-10 dark:text-white gap-2">
                            <Plus className="h-4 w-4" />
                            <span className="hidden md:inline">Add Lesson</span>
                        </Button>
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
                                                // TODO: Navigate to lesson detail when page is created
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
                        {/* Left: count text — allow truncation on small screens */}
                        <div className="flex-1 min-w-0">
                            <div className="text-sm text-muted-foreground truncate">
                                Showing {table.getRowModel().rows.length} of {lessons?.length ?? 0}{" "}
                                lesson(s)
                            </div>
                        </div>

                        {/* Right: pagination buttons — never wrap */}
                        <div className="flex items-center gap-2 flex-shrink-0">
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
            </CardContent>
        </Card>
    )
}
