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
import { ArrowUpDown, ChevronDown, Filter, Search } from "lucide-react"

import type { Doc } from "@/convex/_generated/dataModel";
import type { UserStatus } from "@/convex/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Progress } from "@/components/ui/progress"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { AddTeachersDialog } from "./add-teachers-dialog"

type Teacher = Doc<"users">

// Extend the meta type for custom className
declare module '@tanstack/react-table' {
    interface ColumnMeta<TData, TValue> {
        className?: string
    }
}

const teacherColumns: ColumnDef<Teacher>[] = [
    {
        accessorKey: "fullName",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
        cell: ({ row }) => {
            const teacher = row.original
            return (
                <div className="font-medium">
                    {teacher.fullName ?? `${teacher.firstName} ${teacher.lastName}`}
                </div>
            )
        },
    },
    {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
            <div className="text-muted-foreground hidden md:block">
                {row.original.email ?? "-"}
            </div>
        ),
        meta: {
            className: "hidden md:table-cell",
        },
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
            <div className="hidden md:block">
                <TeacherStatusBadge status={row.original.status} />
            </div>
        ),
        meta: {
            className: "hidden md:table-cell",
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: "progressMetrics.progressPercentage",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Progress
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
        cell: ({ row }) => {
            const progress = row.original.progressMetrics?.progressPercentage ?? 0
            return (
                <div className="flex items-center gap-2 min-w-[120px]">
                    <Progress value={progress} className="flex-1 h-2" indicatorClassName="bg-sidebar-accent" />
                    <span className="text-xs text-muted-foreground w-8 text-right">
                        {Math.round(progress)}%
                    </span>
                </div>
            )
        },
        sortingFn: (rowA, rowB, columnId) => {
            const a = rowA.original.progressMetrics?.progressPercentage ?? 0
            const b = rowB.original.progressMetrics?.progressPercentage ?? 0
            return a - b
        },
    },
]

const statusOptions = [
    { label: "Active", value: "active", color: "bg-green-600" },
    { label: "Inactive", value: "inactive", color: "bg-gray-600" },
    { label: "On Leave", value: "on_leave", color: "bg-amber-600" },
    { label: "Terminated", value: "terminated", color: "bg-rose-600" },
]

interface CampusTeachersCardProps {
    teachers: Doc<"users">[];
    campusId: string;
}

export function CampusTeachersCard({ teachers, campusId }: CampusTeachersCardProps) {
    const router = useRouter()
    const params = useParams()
    const locale = params.locale as string
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [statusFilter, setStatusFilter] = React.useState<UserStatus | "all">("all")

    const table = useReactTable({
        data: teachers,
        columns: teacherColumns,
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
            table.getColumn("status")?.setFilterValue(undefined)
        } else {
            table.getColumn("status")?.setFilterValue([statusFilter])
        }
    }, [statusFilter, table])

    return (
        <Card>
            <CardHeader>
                <CardTitle>Teachers in campus</CardTitle>
                <CardDescription>Overview of active teachers assigned to this campus.</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
                {/* Filters */}
                <div className="flex items-center justify-between gap-3 px-6 py-4">
                    <div className="flex flex-1 items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={(table.getColumn("fullName")?.getFilterValue() as string) ?? ""}
                                onChange={(event) =>
                                    table.getColumn("fullName")?.setFilterValue(event.target.value)
                                }
                                placeholder="Search teachers by name"
                                aria-label="Search teachers"
                                className="pl-10 pr-3 rounded-l bg-card h-9"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="lg" className="h-9 bg-card">
                                    <Filter className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-48" align="end">
                                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => setStatusFilter("all")}
                                    className={statusFilter === "all" ? "bg-accent" : ""}
                                >
                                    All Teachers
                                </DropdownMenuItem>
                                {statusOptions.map((status) => (
                                    <DropdownMenuItem
                                        key={status.value}
                                        onClick={() => setStatusFilter(status.value as UserStatus)}
                                        className={statusFilter === status.value ? "bg-accent" : ""}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${status.color}`}></div>
                                            {status.label}
                                        </div>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <AddTeachersDialog campusId={campusId as any} />
                    </div>
                </div>

                <div className="overflow-hidden rounded-lg border mx-0 md:mx-6">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <TableHead
                                                key={header.id}
                                                className={header.column.columnDef.meta?.className}
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
                                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                                        onClick={() => {
                                            const teacherId = row.original._id;
                                            router.push(`/${locale}/admin/teachers/${teacherId}`);
                                        }}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell
                                                key={cell.id}
                                                className={cell.column.columnDef.meta?.className}
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
                                        colSpan={teacherColumns.length}
                                        className="h-24 text-center text-muted-foreground"
                                    >
                                        No teachers found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-6 py-4 gap-2">
                    <div className="text-sm text-muted-foreground min-w-0 truncate">
                        Showing {table.getRowModel().rows.length} of {teachers.length} teacher(s)
                    </div>
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
            </CardContent>
        </Card>
    )
}

function TeacherStatusBadge({ status }: { status: UserStatus }) {
    const styles: Record<UserStatus, string> = {
        active: "bg-emerald-500/10 text-emerald-700",
        inactive: "bg-gray-500/15 text-gray-700",
        on_leave: "bg-amber-500/15 text-amber-700",
        terminated: "bg-rose-500/20 text-rose-700",
    };

    return (
        <Badge className={`rounded-full px-3 py-1 text-xs font-medium ${styles[status] ?? styles.inactive}`}>
            {status.replace("_", " ")}
        </Badge>
    );
}
