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
import { ArrowUpDown, ChevronDown, MoreHorizontal, Eye, Edit, Trash2, BookOpen, Filter, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
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
import { CurriculumDialog } from "@/components/admin/curriculums/curriculum-dialog"

// Tipo para los datos de curriculums
export type Curriculum = {
    id: string
    name: string
    grade: "Pre-K" | "K" | "1st" | "2nd" | "3rd" | "4th" | "5th" | "6th" | "7th" | "8th" | "9th" | "10th" | "11th" | "12th"
    lessonsCount: number
    status: "active" | "inactive" | "draft" | "archived"
    quarters: number
}

// Datos de ejemplo (luego se reemplazará con datos de Convex)
const data: Curriculum[] = [
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
        id: "HIST-12-001",
        name: "World History",
        grade: "12th",
        lessonsCount: 40,
        status: "draft",
        quarters: 4,
    },
    {
        id: "ART-08-001",
        name: "Visual Arts",
        grade: "8th",
        lessonsCount: 30,
        status: "active",
        quarters: 2,
    },
    {
        id: "PE-09-001",
        name: "Physical Education",
        grade: "9th",
        lessonsCount: 25,
        status: "inactive",
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

const statusOptions = [
    { label: "Active", value: "active", color: "bg-green-600" },
    { label: "Inactive", value: "inactive", color: "bg-gray-600" },
    { label: "Draft", value: "draft", color: "bg-amber-600" },
    { label: "Archived", value: "archived", color: "bg-rose-600" },
]



export const columns: ColumnDef<Curriculum>[] = [
    // {
    //     id: "select",
    //     header: ({ table }) => (
    //         <Checkbox
    //             checked={
    //                 table.getIsAllPageRowsSelected() ||
    //                 (table.getIsSomePageRowsSelected() && "indeterminate")
    //             }
    //             onCheckedChange={(value: boolean) => table.toggleAllPageRowsSelected(!!value)}
    //             aria-label="Select all"
    //         />
    //     ),
    //     cell: ({ row }) => (
    //         <Checkbox
    //             checked={row.getIsSelected()}
    //             onCheckedChange={(value: boolean) => row.toggleSelected(!!value)}
    //             aria-label="Select row"
    //         />
    //     ),
    //     enableSorting: false,
    //     enableHiding: false,
    // },
    {
        accessorKey: "id",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="hidden lg:flex lg:items-center h-10 px-4 text-white hover:bg-white/10 hover:text-white"
                >
                    Code
                    <ArrowUpDown className="h-4 w-4 text-white" />
                </Button>
            )
        },
        cell: ({ row }) => (
            <div className="text-sm hidden lg:block py-1">{row.getValue("id")}</div>
        ),
        meta: {
            className: "hidden lg:table-cell",
        },
    },
    {
        accessorKey: "name",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-10 px-2 lg:px-4 text-white hover:bg-white/10 hover:text-white"
                >
                    Course
                    <ArrowUpDown className="h-4 w-4 text-white" />
                </Button>
            )
        },
        cell: ({ row }) => {
            const curriculum = row.original
            return (
                <div className="space-y-2 py-1">
                    <div className="font-medium text-sm lg:text-base">{row.getValue("name")}</div>
                    <div className="flex lg:hidden flex-col gap-1.5 text-xs lg:text-sm text-muted-foreground">
                        <span className="text-xs">{curriculum.id}</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge className="bg-sky-500/15 text-sky-700 border border-sky-200 text-xs px-2 py-0.5">
                                {curriculum.grade}
                            </Badge>
                            <CurriculumStatusBadge status={curriculum.status} />
                        </div>
                    </div>
                </div>
            )
        },
        filterFn: (row, id, value) => {
            const name = row.getValue("name") as string
            const code = row.getValue("id") as string
            const searchValue = value.toLowerCase()
            return (
                name.toLowerCase().includes(searchValue) ||
                code.toLowerCase().includes(searchValue)
            )
        },
    },
    {
        accessorKey: "grade",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="hidden lg:flex items-center h-10 px-4 text-white hover:bg-white/10 hover:text-white"
                >
                    Grade
                    <ArrowUpDown className="h-4 w-4 text-white" />
                </Button>
            )
        },
        cell: ({ row }) => (
            <div className="text-sm hidden lg:block py-1">{row.getValue("grade")}</div>
        ),
        meta: {
            className: "hidden lg:table-cell",
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: "lessonsCount",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-10 px-2 lg:px-5 text-white hover:bg-white/10 hover:text-white"
                >
                    Lessons
                    <ArrowUpDown className="h-4 w-4 text-white" />
                </Button>
            )
        },
        cell: ({ row }) => {
            const lessons = parseInt(row.getValue("lessonsCount"))
            const quarters = row.original.quarters
            return (
                <div className="flex items-center gap-2 py-1">
                    <span>{lessons}</span>
                    <span className="text-xs text-muted-foreground">({quarters}Q)</span>
                </div>
            )
        },
    },
    {
        accessorKey: "status",
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
                <CurriculumStatusBadge status={row.original.status} />
            </div>
        ),
        meta: {
            className: "hidden lg:table-cell",
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    // {
    //     id: "actions",
    //     enableHiding: false,
    //     cell: ({ row }) => {
    //         const curriculum = row.original

    //         return (
    //             <DropdownMenu>
    //                 <DropdownMenuTrigger asChild>
    //                     <Button variant="ghost" className="h-8 w-8 p-0">
    //                         <span className="sr-only">Open menu</span>
    //                         <MoreHorizontal className="h-4 w-4" />
    //                     </Button>
    //                 </DropdownMenuTrigger>
    //                 <DropdownMenuContent align="end">
    //                     <DropdownMenuLabel>Actions</DropdownMenuLabel>
    //                     <DropdownMenuItem>
    //                         <Eye className="mr-2 h-4 w-4" />
    //                         View Details
    //                     </DropdownMenuItem>
    //                     <DropdownMenuItem>
    //                         <Edit className="mr-2 h-4 w-4" />
    //                         Edit Curriculum
    //                     </DropdownMenuItem>
    //                     <DropdownMenuItem>
    //                         <BookOpen className="mr-2 h-4 w-4" />
    //                         Manage Lessons
    //                     </DropdownMenuItem>
    //                     <DropdownMenuSeparator />
    //                     <DropdownMenuItem className="text-red-600">
    //                         <Trash2 className="mr-2 h-4 w-4" />
    //                         Delete Curriculum
    //                     </DropdownMenuItem>
    //                 </DropdownMenuContent>
    //             </DropdownMenu>
    //         )
    //     },
    // },
]

export function CurriculumsTable() {
    const router = useRouter()
    const params = useParams()
    const locale = params.locale as string
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
        []
    )
    const [columnVisibility, setColumnVisibility] =
        React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})
    const [statusFilter, setStatusFilter] = React.useState<"active" | "inactive" | "draft" | "archived" | "all">(
        "all"
    )
    const [gradeFilter, setGradeFilter] = React.useState<Curriculum["grade"] | "all">("all")

    const table = useReactTable({
        data,
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
            table.getColumn("status")?.setFilterValue(undefined)
        } else {
            table.getColumn("status")?.setFilterValue([statusFilter])
        }
    }, [statusFilter, table])

    // Apply grade filter to the table
    React.useEffect(() => {
        if (gradeFilter === "all") {
            table.getColumn("grade")?.setFilterValue(undefined)
        } else {
            table.getColumn("grade")?.setFilterValue([gradeFilter])
        }
    }, [gradeFilter, table])

    return (
        <div className="w-full">
            {/* Filters */}
            <div className="flex items-center justify-between gap-4 py-5">
                <div className="flex flex-1 items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={
                                (table.getColumn("name")?.getFilterValue() as string) ?? ""
                            }
                            onChange={(event) =>
                                table.getColumn("name")?.setFilterValue(event.target.value)
                            }
                            placeholder="Search by course name or code"
                            aria-label="Search curriculums"
                            className="pl-10 pr-4 rounded-l bg-card h-10"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Botón Clear all - visible solo cuando hay filtros activos */}
                    {(statusFilter !== "all" ||
                        gradeFilter !== "all" ||
                        (table.getColumn("name")?.getFilterValue() as string)?.length > 0) && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setStatusFilter("all");
                                    setGradeFilter("all");
                                    table.getColumn("name")?.setFilterValue("");
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
                                        Grade
                                    </label>
                                    <Select
                                        value={gradeFilter}
                                        onValueChange={(value) =>
                                            setGradeFilter(value as Curriculum["grade"] | "all")
                                        }
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="All Curriculums" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Curriculums</SelectItem>
                                            <SelectItem value="Pre-K">Pre-K</SelectItem>
                                            <SelectItem value="K">K</SelectItem>
                                            <SelectItem value="1st">1st</SelectItem>
                                            <SelectItem value="2nd">2nd</SelectItem>
                                            <SelectItem value="3rd">3rd</SelectItem>
                                            <SelectItem value="4th">4th</SelectItem>
                                            <SelectItem value="5th">5th</SelectItem>
                                            <SelectItem value="6th">6th</SelectItem>
                                            <SelectItem value="7th">7th</SelectItem>
                                            <SelectItem value="8th">8th</SelectItem>
                                            <SelectItem value="9th">9th</SelectItem>
                                            <SelectItem value="10th">10th</SelectItem>
                                            <SelectItem value="11th">11th</SelectItem>
                                            <SelectItem value="12th">12th</SelectItem>
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
                                            setStatusFilter(value as "active" | "inactive" | "draft" | "archived" | "all")
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
                <CurriculumDialog />
            </div>
            <div className="overflow-hidden rounded-md border">
                <Table>
                    <TableHeader className="bg-deep-koamaru text-white">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="border-b hover:bg-deep-koamaru">
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead
                                            key={header.id}
                                            className={`py-3 px-0 lg:px-5 ${header.column.columnDef.meta?.className || ""}`}
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
                                        const curriculumId = row.original.id;
                                        router.push(`/${locale}/curriculums/${curriculumId}`);
                                    }}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell
                                            key={cell.id}
                                            className={`py-4 px-2 lg:px-5 ${cell.column.columnDef.meta?.className || ""}`}
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
            <div className="flex items-center justify-between gap-4 py-4">
                <div className="text-sm text-muted-foreground">
                    Showing {table.getRowModel().rows.length} of {data.length} curriculum(s)
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

function CurriculumStatusBadge({ status }: { status: "active" | "inactive" | "draft" | "archived" }) {
    const styles: Record<string, string> = {
        active: "bg-emerald-500/10 text-emerald-700",
        inactive: "bg-gray-500/15 text-gray-700",
        draft: "bg-amber-500/15 text-amber-700",
        archived: "bg-rose-500/20 text-rose-700",
    }

    const capitalize = (str: string) =>
        str.charAt(0).toUpperCase() + str.slice(1)

    return (
        <Badge
            className={`rounded-full px-3 py-0.5 text-xs font-medium inline-flex ${styles[status] ?? styles.inactive}`}
        >
            {capitalize(status)}
        </Badge>
    )
}