"use client";

import * as React from "react";
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
import { ArrowUpDown, ChevronDown, Filter, Search } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

import type { Doc, Id } from "@/convex/_generated/dataModel";
import type { UserStatus } from "@/convex/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddTeachersDialog } from "./add-teachers-dialog";
import { Select } from "@radix-ui/react-select";
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Teacher = Doc<"users">;

// Extend the meta type for custom className
declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    className?: string;
  }
}

// Component to display teacher avatar with query
function TeacherAvatar({ teacher }: { teacher: Teacher }) {
  const avatarUrl = useQuery(
    api.users.getAvatarUrl,
    teacher.avatarStorageId ? { storageId: teacher.avatarStorageId } : "skip"
  );

  const initials = `${teacher.firstName?.charAt(0) || ""}${teacher.lastName?.charAt(0) || ""}`.toUpperCase();

  return (
    <Avatar className="h-8 w-8 lg:h-10 lg:w-10">
      {avatarUrl && <AvatarImage src={avatarUrl} alt={teacher.fullName} />}
      <AvatarFallback className="bg-deep-koamaru/10 text-deep-koamaru text-xs lg:text-sm font-medium">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

const teacherColumns: ColumnDef<Teacher>[] = [
  {
    accessorKey: "fullName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-10 px-2 lg:px-4 text-white hover:bg-white/10 hover:text-white"
        >
          Teacher
          <ArrowUpDown className="h-4 w-4 text-white" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const teacher = row.original;
      return (
        <div className="flex items-center gap-3 py-1">
          <TeacherAvatar teacher={teacher} />
          <div className="space-y-2">
            <div className="font-medium text-sm lg:text-base">
              {teacher.fullName ?? `${teacher.firstName} ${teacher.lastName}`}
            </div>
            <div className="flex lg:hidden flex-col gap-1.5 text-xs lg:text-sm text-muted-foreground">
              <span className="truncate">{teacher.email ?? "-"}</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <TeacherStatusBadge status={teacher.status} />
              </div>
            </div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hidden lg:flex lg:items-center lg:justify-start h-10 px-4 text-white hover:bg-white/10 hover:text-white"
        >
          Email
          <ArrowUpDown className="h-4 w-4 text-white" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="lowercase hidden lg:block py-1">
        {row.original.email ?? "-"}
      </div>
    ),
    meta: {
      className: "hidden lg:table-cell",
    },
  },
  {
    accessorKey: "progressMetrics.progressPercentage",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-10 px-2 lg:px-5 text-white hover:bg-white/10 hover:text-white"
        >
          Progress
          <ArrowUpDown className="h-4 w-4 text-white" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const progress = row.original.progressMetrics?.progressPercentage ?? 0;
      return (
        <>
          {/* Desktop y Tablet: Barra de progreso */}
          <div className="hidden lg:flex items-center gap-3 py-1">
            <div className="flex-1 min-w-[100px] bg-gray-200 rounded-full h-2">
              <Progress
                value={progress}
                className="bg-gray-200 [&>div]:bg-deep-koamaru"
              />
            </div>
            <span className="text-sm font-medium whitespace-nowrap">
              {progress}%
            </span>
          </div>
          {/* Mobile: Badge con el valor */}
          <div className="lg:hidden py-1">
            <Badge className="bg-deep-koamaru text-white text-xs px-2 py-0.5">
              {progress}%
            </Badge>
          </div>
        </>
      );
    },
    sortingFn: (rowA, rowB, columnId) => {
      const a = rowA.original.progressMetrics?.progressPercentage ?? 0;
      const b = rowB.original.progressMetrics?.progressPercentage ?? 0;
      return a - b;
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
      );
    },
    cell: ({ row }) => (
      <div className="hidden lg:block py-1">
        <TeacherStatusBadge status={row.original.status} />
      </div>
    ),
    meta: {
      className: "hidden lg:table-cell",
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
];

const statusOptions = [
  { label: "Active", value: "active", color: "bg-green-600" },
  { label: "Inactive", value: "inactive", color: "bg-gray-600" },
  { label: "On Leave", value: "on_leave", color: "bg-amber-600" },
  { label: "Terminated", value: "terminated", color: "bg-rose-600" },
];

interface CampusTeachersCardProps {
  campusId: string;
}

export function CampusTeachersCard({
  campusId,
}: CampusTeachersCardProps) {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  // Query en tiempo real de Convex
  const teachers = useQuery(api.campuses.getTeachersByCampus, {
    campusId: campusId as Id<"campuses">
  }) || [];

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [statusFilter, setStatusFilter] = React.useState<UserStatus | "all">(
    "all",
  );

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
  });

  // Apply status filter to the table
  React.useEffect(() => {
    if (statusFilter === "all") {
      table.getColumn("status")?.setFilterValue(undefined);
    } else {
      table.getColumn("status")?.setFilterValue([statusFilter]);
    }
  }, [statusFilter, table]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold tracking-tight">Teachers in campus</CardTitle>
        <CardDescription className="text-sm">Overview of active teachers assigned to this campus.</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pt-0">
        {/* Filters */}
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-4 border-t">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={
                  (table.getColumn("fullName")?.getFilterValue() as string) ??
                  ""
                }
                onChange={(event) =>
                  table
                    .getColumn("fullName")
                    ?.setFilterValue(event.target.value)
                }
                placeholder="Search teachers by name"
                aria-label="Search teachers"
                className="pl-10 pr-3 rounded-l bg-card h-9"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Botón Clear all - visible solo cuando hay filtros activos */}
            {(statusFilter !== "all" ||
              (table.getColumn("fullName")?.getFilterValue() as string)?.length > 0) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatusFilter("all");
                    table.getColumn("fullName")?.setFilterValue("");
                  }}
                  className="h-9 px-3"
                >
                  Clear all
                </Button>
              )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="lg" className="h-9 bg-card">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>Filter by:</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="px-2 py-2">
                  <label className="text-sm font-medium text-foreground">
                    Status
                  </label>
                  <Select
                    value={statusFilter}
                    onValueChange={(value) =>
                      setStatusFilter(value as UserStatus | "all")
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Teachers</SelectItem>
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
              </DropdownMenuContent>
            </DropdownMenu>

            <AddTeachersDialog campusId={campusId as any} />
          </div>
        </div>

        <div className="overflow-hidden border mx-0">
          <Table>
            <TableHeader className="bg-deep-koamaru text-white">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-deep-koamaru">
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
                            header.getContext(),
                          )}
                      </TableHead>
                    );
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
                        className={`py-4 px-2 lg:px-5 ${cell.column.columnDef.meta?.className || ""}`}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
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
        <div className="flex items-center justify-between px-4 md:px-6 py-4 gap-2">
          <div className="text-sm text-muted-foreground min-w-0 truncate">
            Showing {table.getRowModel().rows.length} of {teachers.length}{" "}
            teacher(s)
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
  );
}

function TeacherStatusBadge({ status }: { status: UserStatus }) {
  const styles: Record<UserStatus, string> = {
    active: "bg-emerald-500/10 text-emerald-700",
    inactive: "bg-gray-500/15 text-gray-700",
    on_leave: "bg-amber-500/15 text-amber-700",
    terminated: "bg-rose-500/20 text-rose-700",
  };

  const capitalize = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  return (
    <Badge
      className={`rounded-full px-3 py-0.5 text-xs font-medium inline-flex ${styles[status] ?? styles.inactive}`}
    >
      {capitalize(status.replace("_", " "))}
    </Badge>
  );
}
