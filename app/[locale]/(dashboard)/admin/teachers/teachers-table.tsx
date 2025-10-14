"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
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
  Filter,
  Search,
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
import { TeacherDialog } from "@/components/admin/teachers/teacher-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserStatus } from "@/convex/types";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Tipo para los datos de profesores
export type Teacher = {
  _id: Id<"users">;
  fullName: string;
  email: string;
  campus?: string;
  campusId?: Id<"campuses">;
  avatarStorageId?: Id<"_storage">;
  firstName?: string;
  lastName?: string;
  progressAvg: number;
  status: UserStatus;
};

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

export const columns: ColumnDef<Teacher>[] = [
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
            <div className="font-medium text-sm lg:text-base">{row.getValue("fullName")}</div>
            <div className="flex lg:hidden flex-col gap-1.5 text-xs lg:text-sm text-muted-foreground">
              <span className="truncate">{teacher.email}</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {teacher.campus && (
                  <Badge className="bg-sky-500/15 text-sky-700 border border-sky-200 text-xs px-2 py-0.5">
                    {teacher.campus}
                  </Badge>
                )}
                <TeacherStatusBadge status={teacher.status} />
              </div>
            </div>
          </div>
        </div>
      );
    },

    filterFn: (row, id, value) => {
      const fullName = row.getValue("fullName") as string;
      const campus = row.getValue("campus") as string;
      const searchValue = value.toLowerCase();
      return (
        fullName.toLowerCase().includes(searchValue) ||
        campus.toLowerCase().includes(searchValue)
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
        {row.getValue("email")}
      </div>
    ),
    meta: {
      className: "hidden lg:table-cell",
    },
  },
  {
    accessorKey: "campus",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hidden lg:flex items-center h-10 px-4 text-white hover:bg-white/10 hover:text-white"
        >
          Campus
          <ArrowUpDown className="h-4 w-4 text-white" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="hidden lg:block py-1">{row.getValue("campus")}</div>
    ),
    meta: {
      className: "hidden lg:table-cell",
    },
    filterFn: (row, id, value) => {
      if (value === "all") return true;
      const campusId = row.original.campusId;
      return campusId === value;
    },
  },
  {
    accessorKey: "progressAvg",
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
      const progress = parseFloat(row.getValue("progressAvg"));
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

  // {
  //   id: "actions",
  //   header: ({ column }) => {
  //     return (
  //       <Button
  //         variant="ghost"
  //         className="hidden lg:flex items-center h-10 px-3"
  //       >
  //         Actions
  //       </Button>
  //     );
  //   },
  //   enableHiding: false,
  //   cell: ({ row }) => {
  //     const teacher = row.original;

  //     return (
  //       <div className="flex items-center justify-left py-1">
  //         {/* Desktop (lg+): Iconos directos */}
  //         <div className="hidden lg:flex items-center">
  //           <Button
  //             variant="ghost"
  //             className="h-8 w-8 p-0 hover:bg-accent"
  //             onClick={() => {
  //               // TODO: Implementar vista de progreso
  //               console.log("View progress:", teacher.id);
  //             }}
  //           >
  //             <span className="sr-only">View progress</span>
  //             <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
  //           </Button>
  //           {/* <Button
  //             variant="ghost"
  //             className="h-8 w-8 p-0 hover:bg-accent"
  //             onClick={() => {
  //               // TODO: Implementar edición
  //               console.log("Edit teacher:", teacher.id);
  //             }}
  //           >
  //             <span className="sr-only">Edit teacher</span>
  //             <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
  //           </Button> */}
  //           <Button
  //             variant="ghost"
  //             className="h-8 w-8 p-0 hover:bg-accent hover:text-destructive"
  //             onClick={() => {
  //               // TODO: Implementar eliminación
  //               console.log("Delete teacher:", teacher.id);
  //             }}
  //           >
  //             <span className="sr-only">Delete teacher</span>
  //             <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
  //           </Button>
  //         </div>

  //         {/* Mobile y Tablet (md): Menú desplegable */}
  //         <div className="lg:hidden">
  //           <DropdownMenu>
  //             <DropdownMenuTrigger asChild>
  //               <Button variant="ghost" className="h-8 w-8 p-0">
  //                 <span className="sr-only">Open menu</span>
  //                 <MoreHorizontal className="h-4 w-4" />
  //               </Button>
  //             </DropdownMenuTrigger>
  //             <DropdownMenuContent align="end">
  //               <DropdownMenuLabel>Actions</DropdownMenuLabel>
  //               <DropdownMenuItem
  //                 onClick={() => {
  //                   // TODO: Implementar vista de progreso
  //                   console.log("View progress:", teacher.id);
  //                 }}
  //               >
  //                 <Eye className="h-4 w-4" />
  //                 View Teacher
  //               </DropdownMenuItem>
  //               {/* <DropdownMenuItem
  //                 onClick={() => {
  //                   // TODO: Implementar edición
  //                   console.log("Edit teacher:", teacher.id);
  //                 }}
  //               >
  //                 <Edit className="h-4 w-4" />
  //                 Edit Teacher
  //               </DropdownMenuItem> */}
  //               <DropdownMenuSeparator />
  //               <DropdownMenuItem
  //                 className="text-red-600"
  //                 onClick={() => {
  //                   // TODO: Implementar eliminación
  //                   console.log("Delete teacher:", teacher.id);
  //                 }}
  //               >
  //                 <Trash2 className="h-4 w-4" />
  //                 Delete Teacher
  //               </DropdownMenuItem>
  //             </DropdownMenuContent>
  //           </DropdownMenu>
  //         </div>
  //       </div>
  //     );
  //   },
  // },
];

const statusOptions = [
  { label: "Active", value: "active", color: "bg-green-600" },
  { label: "Inactive", value: "inactive", color: "bg-gray-600" },
  { label: "On Leave", value: "on_leave", color: "bg-amber-600" },
  { label: "Terminated", value: "terminated", color: "bg-rose-600" },
];

export function TeachersTable() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  // Fetch teachers from Convex
  const users = useQuery(api.users.getUsers, { role: "teacher" });
  const campuses = useQuery(api.campuses.getCampuses, {});

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [statusFilter, setStatusFilter] = React.useState<UserStatus | "all">(
    "all",
  );
  const [campusFilter, setCampusFilter] = React.useState<string>("all");

  // Transform Convex data to table format
  const data: Teacher[] = React.useMemo(() => {
    if (!users || !campuses) return [];

    return users.map(user => {
      const campus = campuses.find(c => c._id === user.campusId);
      // Use progressPercentage directly from progressMetrics (already calculated with multi-grade support)
      const progressAvg = user.progressMetrics?.progressPercentage ?? 0;

      return {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        campus: campus?.name,
        campusId: user.campusId,
        avatarStorageId: user.avatarStorageId,
        firstName: user.firstName,
        lastName: user.lastName,
        progressAvg,
        status: user.status,
      };
    });
  }, [users, campuses]);

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
  });

  // Apply status filter to the table
  React.useEffect(() => {
    if (statusFilter === "all") {
      table.getColumn("status")?.setFilterValue(undefined);
    } else {
      table.getColumn("status")?.setFilterValue([statusFilter]);
    }
  }, [statusFilter, table]);

  // Apply campus filter to the table
  React.useEffect(() => {
    if (campusFilter === "all") {
      table.getColumn("campus")?.setFilterValue(undefined);
    } else {
      table.getColumn("campus")?.setFilterValue(campusFilter);
    }
  }, [campusFilter, table]);

  // Loading state
  if (!users || !campuses) {
    return (
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between gap-4 ">
        <div className="flex flex-1 items-center gap-4">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={
                (table.getColumn("fullName")?.getFilterValue() as string) ?? ""
              }
              onChange={(event) =>
                table.getColumn("fullName")?.setFilterValue(event.target.value)
              }
              placeholder="Search teachers by name or campus"
              aria-label="Search teachers"
              className="pl-10 pr-3 rounded-l bg-card h-9"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Botón Clear all - visible solo cuando hay filtros activos */}
          {(statusFilter !== "all" ||
            campusFilter !== "all" ||
            (table.getColumn("fullName")?.getFilterValue() as string)?.length > 0) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusFilter("all");
                  setCampusFilter("all");
                  table.getColumn("fullName")?.setFilterValue("");
                }}
                className="px-3"
              >
                Clear all
              </Button>
            )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="lg" className="px-3 h-9 bg-card">
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
                    Campus
                  </label>
                  <Select
                    value={campusFilter}
                    onValueChange={(value) => setCampusFilter(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select campus" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Campuses</SelectItem>
                      {campuses
                        .filter((campus) => campus.status === "active")
                        .map((campus) => (
                          <SelectItem key={campus._id} value={campus._id}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-sky-600"></div>
                              {campus.name}
                              {campus.code && (
                                <span className="text-xs text-muted-foreground">
                                  ({campus.code})
                                </span>
                              )}
                            </div>
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
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <TeacherDialog />
        </div>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader className="bg-deep-koamaru text-white">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b hover:bg-deep-koamaru">
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as { className?: string } | undefined;
                  return (
                    <TableHead
                      key={header.id}
                      className={`py-3 px-0 lg:px-5 ${meta?.className || ''}`}
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
                  data-state={row.getIsSelected() && "selected"}
                  className="border-b last:border-0 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => {
                    const teacherId = row.original._id;
                    router.push(`/${locale}/admin/teachers/${teacherId}`);
                  }}
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as { className?: string } | undefined;
                    return (
                      <TableCell
                        key={cell.id}
                        className={`py-4 px-2 lg:px-5 ${meta?.className || ''}`}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center py-8"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          Showing {table.getRowModel().rows.length} of {data.length} teacher(s)
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-9 px-4"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="h-9 px-4"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
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
