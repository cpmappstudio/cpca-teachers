"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Filter, Pencil, Search } from "lucide-react";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { PrincipalDialog } from "@/components/admin/principals/principal-dialog";
import { UserAvatar } from "@/components/admin/users/user-avatar";
import { UserStatusBadge } from "@/components/admin/users/user-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UserStatus } from "@/convex/types";

type Principal = {
  user: Doc<"users">;
  _id: Id<"users">;
  fullName: string;
  email: string;
  campus: string;
  campusIds: Id<"campuses">[];
  avatarStorageId?: Id<"_storage">;
  firstName?: string;
  lastName?: string;
  status: UserStatus;
};

const statusOptions = [
  { label: "Active", value: "active", color: "bg-green-600" },
  { label: "Inactive", value: "inactive", color: "bg-gray-600" },
  { label: "On Leave", value: "on_leave", color: "bg-amber-600" },
  { label: "Terminated", value: "terminated", color: "bg-rose-600" },
];

const columns: ColumnDef<Principal>[] = [
  {
    accessorKey: "fullName",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-10 px-2 lg:px-4 text-white hover:bg-white/10 hover:text-white"
      >
        Principal
        <ArrowUpDown className="h-4 w-4 text-white" />
      </Button>
    ),
    cell: ({ row }) => {
      const principal = row.original;

      return (
        <div className="flex items-center gap-3 py-1">
          <UserAvatar
            fullName={principal.fullName}
            avatarStorageId={principal.avatarStorageId}
            firstName={principal.firstName}
            lastName={principal.lastName}
          />
          <div className="space-y-2">
            <div className="font-medium text-sm lg:text-base">
              {principal.fullName}
            </div>
            <div className="flex lg:hidden flex-col gap-1.5 text-xs lg:text-sm text-muted-foreground">
              <span className="truncate">{principal.email}</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {principal.campus && (
                  <Badge className="bg-sky-500/15 text-sky-700 border border-sky-200 text-xs px-2 py-0.5">
                    {principal.campus}
                  </Badge>
                )}
                <UserStatusBadge status={principal.status} />
              </div>
            </div>
          </div>
        </div>
      );
    },
    filterFn: (row, _id, value) => {
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
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="hidden lg:flex lg:items-center lg:justify-start h-10 px-4 text-white hover:bg-white/10 hover:text-white"
      >
        Email
        <ArrowUpDown className="h-4 w-4 text-white" />
      </Button>
    ),
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
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="hidden lg:flex items-center h-10 px-4 text-white hover:bg-white/10 hover:text-white"
      >
        Campus
        <ArrowUpDown className="h-4 w-4 text-white" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="hidden lg:block py-1">
        {row.getValue("campus") || "Not assigned"}
      </div>
    ),
    meta: {
      className: "hidden lg:table-cell",
    },
    filterFn: (row, _id, value) => {
      if (value === "all") return true;
      return row.original.campusIds.includes(value);
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="hidden lg:flex items-center h-10 px-5 text-white hover:bg-white/10 hover:text-white"
      >
        Status
        <ArrowUpDown className="h-4 w-4 text-white" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="hidden lg:block py-1">
        <UserStatusBadge status={row.original.status} />
      </div>
    ),
    meta: {
      className: "hidden lg:table-cell",
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    id: "actions",
    header: () => <div className="text-right pr-5">Actions</div>,
    cell: ({ row }) => (
      <div className="flex justify-end py-1">
        <PrincipalDialog
          principal={row.original.user}
          trigger={
            <Button variant="ghost" size="sm" className="gap-2">
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          }
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    enableColumnFilter: false,
    meta: {
      className: "w-[120px]",
    },
  },
];

export function PrincipalsTable() {
  const users = useQuery(api.users.getUsers, { role: "principal" });
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

  const data = React.useMemo<Principal[]>(() => {
    if (!users || !campuses) return [];

    return users.map((user) => {
      const assignedCampuses = campuses.filter(
        (campus) => campus.directorId === user._id,
      );
      const campusNames = assignedCampuses.map((campus) => campus.name);

      return {
        user,
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        campus: campusNames.join(", "),
        campusIds: assignedCampuses.map((campus) => campus._id),
        avatarStorageId: user.avatarStorageId,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
      };
    });
  }, [campuses, users]);

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

  React.useEffect(() => {
    if (statusFilter === "all") {
      table.getColumn("status")?.setFilterValue(undefined);
      return;
    }

    table.getColumn("status")?.setFilterValue([statusFilter]);
  }, [statusFilter, table]);

  React.useEffect(() => {
    if (campusFilter === "all") {
      table.getColumn("campus")?.setFilterValue(undefined);
      return;
    }

    table.getColumn("campus")?.setFilterValue(campusFilter);
  }, [campusFilter, table]);

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
      <div className="flex items-center justify-between gap-4">
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
              placeholder="Search principals by name or campus"
              aria-label="Search principals"
              className="pl-10 pr-3 rounded-l bg-card h-9"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {(statusFilter !== "all" ||
            campusFilter !== "all" ||
            (table.getColumn("fullName")?.getFilterValue() as string)?.length >
              0) && (
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
                  <Select value={campusFilter} onValueChange={setCampusFilter}>
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
                              <div className="w-2 h-2 rounded-full bg-sky-600" />
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
                      <SelectItem value="all">All Principals</SelectItem>
                      {statusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${status.color}`}
                            />
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

          <PrincipalDialog />
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
                  const meta = header.column.columnDef.meta as
                    | { className?: string }
                    | undefined;

                  return (
                    <TableHead
                      key={header.id}
                      className={`py-3 px-0 lg:px-5 ${meta?.className || ""}`}
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
                  className="border-b last:border-0 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as
                      | { className?: string }
                      | undefined;

                    return (
                      <TableCell
                        key={cell.id}
                        className={`py-4 px-2 lg:px-5 ${meta?.className || ""}`}
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
          Showing {table.getRowModel().rows.length} of {data.length}{" "}
          principal(s)
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
