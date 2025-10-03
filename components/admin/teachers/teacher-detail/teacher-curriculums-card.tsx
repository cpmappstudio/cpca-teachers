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
import { ArrowUpDown, ChevronDown, Filter, Search, BookOpen, Calendar } from "lucide-react"

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    DropdownMenu,
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
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { SelectDropdown } from "@/components/ui/select-dropdown"
import { Check, ChevronsUpDown, Edit, Save, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import type { Id, Doc } from "@/convex/_generated/dataModel";
import { AddCurriculumDialog } from "./add-curriculum-dialog"

type CurriculumStatus = "draft" | "active" | "archived" | "deprecated"

type Curriculum = {
    _id: Id<"curriculums">
    name: string
    code?: string
    status: CurriculumStatus
    metrics?: {
        totalLessons: number
        assignedTeachers: number
        averageProgress: number
        lastUpdated: number
    }
    isActive: boolean
}

// Extend the meta type for custom className
declare module '@tanstack/react-table' {
    interface ColumnMeta<TData, TValue> {
        className?: string
    }
}

const curriculumColumns: ColumnDef<Curriculum>[] = [
    {
        accessorKey: "code",
        header: "Code",
        cell: ({ row }) => (
            <div className="font-medium text-muted-foreground hidden md:block">
                {row.original.code || "-"}
            </div>
        ),
        meta: {
            className: "w-24 hidden md:table-cell",
        },
    },
    {
        accessorKey: "name",
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
        cell: ({ row }) => (
            <div className="font-medium">
                {row.original.name}
            </div>
        ),
        filterFn: "includesString",
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
            <div className="hidden md:block">
                <CurriculumStatusBadge status={row.original.status} />
            </div>
        ),
        meta: {
            className: "hidden md:table-cell",
        },
        filterFn: "arrIncludesSome",
    },
    {
        accessorKey: "metrics.totalLessons",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Lessons
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
        cell: ({ row }) => {
            const totalLessons = row.original.metrics?.totalLessons ?? 0
            return (
                <div className="text-center font-medium">
                    {totalLessons}
                </div>
            )
        },
        sortingFn: (rowA, rowB, columnId) => {
            const a = rowA.original.metrics?.totalLessons ?? 0
            const b = rowB.original.metrics?.totalLessons ?? 0
            return a - b
        },
        meta: {
            className: "text-center w-20",
        },
    },
]

const statusOptions = [
    { label: "Draft", value: "draft", color: "bg-gray-600" },
    { label: "Active", value: "active", color: "bg-green-600" },
    { label: "Archived", value: "archived", color: "bg-amber-600" },
    { label: "Deprecated", value: "deprecated", color: "bg-rose-600" },
]

interface TeacherCurriculumsCardProps {
    teacherId: string;
}

export function TeacherCurriculumsCard({ teacherId }: TeacherCurriculumsCardProps) {
    const router = useRouter()
    const params = useParams()
    const locale = params.locale as string
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})

    const columns = React.useMemo(() => curriculumColumns, [])

    // Mock curriculums data
    const curriculums: Curriculum[] = React.useMemo(() => [
        {
            _id: "curriculum_1" as Id<"curriculums">,
            name: "Mathematics Grade 3",
            code: "MATH-G3",
            status: "active",
            metrics: {
                totalLessons: 48,
                assignedTeachers: 3,
                averageProgress: 75,
                lastUpdated: Date.now(),
            },
            isActive: true,
        },
        {
            _id: "curriculum_2" as Id<"curriculums">,
            name: "Science Grade 3",
            code: "SCI-G3",
            status: "active",
            metrics: {
                totalLessons: 36,
                assignedTeachers: 2,
                averageProgress: 68,
                lastUpdated: Date.now(),
            },
            isActive: true,
        },
        {
            _id: "curriculum_3" as Id<"curriculums">,
            name: "English Language Arts",
            code: "ELA-G3",
            status: "draft",
            metrics: {
                totalLessons: 52,
                assignedTeachers: 1,
                averageProgress: 0,
                lastUpdated: Date.now(),
            },
            isActive: false,
        },
        {
            _id: "curriculum_4" as Id<"curriculums">,
            name: "Social Studies",
            code: "SS-G3",
            status: "archived",
            metrics: {
                totalLessons: 24,
                assignedTeachers: 0,
                averageProgress: 100,
                lastUpdated: Date.now(),
            },
            isActive: false,
        },
    ], [])

    const table = useReactTable({
        data: curriculums,
        columns,
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
        defaultColumn: {
            filterFn: "includesString",
        },
    })

    // Days for the weekly calendar
    const days = ["mon", "tue", "wed", "thu", "fri"]
    const daysFull = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

    // Mock lessons per curriculum (could be fetched)
    const lessonsByCurriculum = React.useMemo(() => {
        const map: Record<string, { value: string; label: string }[]> = {}
        curriculums.forEach((c, idx) => {
            map[c._id] = Array.from({ length: 6 }).map((_, i) => ({
                value: `${c._id}-lesson-${i + 1}`,
                label: `${c.name} - Lesson ${i + 1}`,
            }))
        })
        return map
    }, [curriculums])

    // Selected lesson per curriculum per day
    const [selectedLessons, setSelectedLessons] = React.useState<Record<string, Record<string, string | undefined>>>({})

    // Edit mode per curriculum
    const [editMode, setEditMode] = React.useState<Record<string, boolean>>({})

    // Schedule data per curriculum (standards, objectives, descriptions)
    const [scheduleData, setScheduleData] = React.useState<Record<string, {
        standards: Record<string, string[]>
        objectives: Record<string, string[]>
        descriptions: Record<string, string[]>
    }>>({})

    const handleLessonChange = (curriculumId: string, dayKey: string, lessonId?: string) => {
        setSelectedLessons(prev => ({
            ...prev,
            [curriculumId]: {
                ...(prev[curriculumId] || {}),
                [dayKey]: lessonId,
            },
        }))
    }

    const toggleEditMode = (curriculumId: string) => {
        setEditMode(prev => ({
            ...prev,
            [curriculumId]: !prev[curriculumId]
        }))
    }

    const updateScheduleData = (curriculumId: string, type: 'standards' | 'objectives' | 'descriptions', dayKey: string, value: string[]) => {
        setScheduleData(prev => ({
            ...prev,
            [curriculumId]: {
                ...prev[curriculumId],
                [type]: {
                    ...prev[curriculumId]?.[type],
                    [dayKey]: value
                }
            }
        }))
    }

    const getScheduleValue = (curriculumId: string, type: 'standards' | 'objectives' | 'descriptions', dayKey: string) => {
        return scheduleData[curriculumId]?.[type]?.[dayKey] || [`Sample ${type.slice(0, -1)} for ${dayKey.toUpperCase()}`]
    }

    // Bullet point editor component
    function BulletPointEditor({
        items,
        onChange,
        disabled = false,
        placeholder
    }: {
        items: string[]
        onChange: (items: string[]) => void
        disabled?: boolean
        placeholder?: string
    }) {
        const [editingIndex, setEditingIndex] = React.useState<number | null>(null)
        const [tempValue, setTempValue] = React.useState("")

        const handleEdit = (index: number) => {
            if (disabled) return
            setEditingIndex(index)
            setTempValue(items[index] || "")
        }

        const handleSave = () => {
            if (editingIndex !== null) {
                const newItems = [...items]
                if (tempValue.trim()) {
                    newItems[editingIndex] = tempValue.trim()
                } else {
                    newItems.splice(editingIndex, 1)
                }
                onChange(newItems)
            }
            setEditingIndex(null)
            setTempValue("")
        }

        const handleKeyDown = (e: React.KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault()
                if (tempValue.trim()) {
                    const newItems = [...items]
                    if (editingIndex !== null) {
                        newItems[editingIndex] = tempValue.trim()
                        newItems.splice(editingIndex + 1, 0, "")
                        onChange(newItems)
                        setEditingIndex(editingIndex + 1)
                        setTempValue("")
                    }
                }
            } else if (e.key === 'Escape') {
                setEditingIndex(null)
                setTempValue("")
            }
        }

        const addNewItem = () => {
            if (disabled) return
            const newItems = [...items, ""]
            onChange(newItems)
            setEditingIndex(newItems.length - 1)
            setTempValue("")
        }

        return (
            <div className="w-full max-w-full overflow-hidden">
                {items.map((item, index) => (
                    <div key={index} className="flex items-start gap-2 mb-1 max-w-full overflow-hidden">
                        <span className="text-muted-foreground text-xs leading-4 mt-0.5 flex-shrink-0">•</span>
                        {editingIndex === index ? (
                            <input
                                type="text"
                                value={tempValue}
                                onChange={(e) => setTempValue(e.target.value)}
                                onBlur={handleSave}
                                onKeyDown={handleKeyDown}
                                className="flex-1 min-w-0 text-xs bg-transparent border-none outline-none focus:bg-background rounded px-1 py-0.5"
                                autoFocus
                                placeholder={placeholder}
                            />
                        ) : (
                            <span
                                onClick={() => handleEdit(index)}
                                className={`flex-1 min-w-0 text-xs leading-4 cursor-pointer hover:bg-muted/30 rounded px-1 py-0.5 overflow-hidden ${disabled ? 'cursor-default hover:bg-transparent' : ''
                                    }`}
                                style={{
                                    wordBreak: 'break-all',
                                    overflowWrap: 'break-word',
                                    hyphens: 'auto',
                                    whiteSpace: 'pre-wrap'
                                }}
                            >
                                {item || placeholder}
                            </span>
                        )}
                    </div>
                ))}
                {!disabled && (
                    <button
                        onClick={addNewItem}
                        className="flex items-start gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors max-w-full overflow-hidden"
                    >
                        <span className="leading-4 mt-0.5 flex-shrink-0">•</span>
                        <span className="flex-1 min-w-0 overflow-hidden">Add item...</span>
                    </button>
                )}
            </div>
        )
    }

    // Lesson selector component
    function LessonCombobox({
        options,
        value,
        onValueChange,
        placeholder = "Select lesson...",
        disabled = false
    }: {
        options: { value: string; label: string }[]
        value?: string
        onValueChange: (value?: string) => void
        placeholder?: string
        disabled?: boolean
    }) {
        const [open, setOpen] = React.useState(false)

        return (
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        disabled={disabled}
                        className="w-full justify-between text-xs"
                    >
                        {value
                            ? options.find((option) => option.value === value)?.label
                            : placeholder}
                        <ChevronsUpDown className="ml-2 h-3 w-3 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0">
                    <Command>
                        <CommandInput placeholder="Search lessons..." className="h-9" />
                        <CommandList>
                            <CommandEmpty>No lesson found.</CommandEmpty>
                            <CommandGroup>
                                {options.map((option) => (
                                    <CommandItem
                                        key={option.value}
                                        value={option.value}
                                        onSelect={(currentValue) => {
                                            const newValue = currentValue === value ? undefined : currentValue
                                            onValueChange(newValue)
                                            setOpen(false)
                                        }}
                                    >
                                        {option.label}
                                        <Check
                                            className={cn(
                                                "ml-auto h-4 w-4",
                                                value === option.value ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Teaching Assignment</CardTitle>
                <CardDescription>Curriculum assignments and weekly schedule overview.</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
                <Tabs defaultValue="schedule" className="w-full">
                    <div className="px-6">

                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="schedule" className="gap-2">
                                <Calendar className="h-4 w-4" />
                                Weekly Schedule
                            </TabsTrigger>
                            <TabsTrigger value="curriculums" className="gap-2">
                                <BookOpen className="h-4 w-4" />
                                Curriculums
                            </TabsTrigger>
                        </TabsList>
                    </div>



                    <TabsContent value="curriculums" className="mt-4 space-y-4">
                        {/* Filters */}
                        <div className="flex items-center justify-between gap-3 px-6">
                            <div className="flex flex-1 items-center gap-3">
                                <div className="relative flex-1">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                                        onChange={(event) =>
                                            table.getColumn("name")?.setFilterValue(event.target.value)
                                        }
                                        placeholder="Search curriculums by name"
                                        aria-label="Search curriculums"
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
                                            onClick={() => table.getColumn("status")?.setFilterValue(undefined)}
                                            className={!table.getColumn("status")?.getFilterValue() ? "bg-accent" : ""}
                                        >
                                            All Curriculums
                                        </DropdownMenuItem>
                                        {statusOptions.map((status) => (
                                            <DropdownMenuItem
                                                key={status.value}
                                                onClick={() => table.getColumn("status")?.setFilterValue([status.value])}
                                                className={
                                                    Array.isArray(table.getColumn("status")?.getFilterValue()) &&
                                                        (table.getColumn("status")?.getFilterValue() as string[])?.includes(status.value)
                                                        ? "bg-accent"
                                                        : ""
                                                }
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${status.color}`}></div>
                                                    {status.label}
                                                </div>
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <AddCurriculumDialog teacherId={teacherId} />
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
                                                    const curriculumId = row.original._id;
                                                    // TODO: Navigate to curriculum detail
                                                    console.log("Navigate to curriculum:", curriculumId);
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
                                                colSpan={columns.length}
                                                className="h-24 text-center text-muted-foreground"
                                            >
                                                No curriculums found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between gap-2 px-6">
                            <div className="text-sm text-muted-foreground min-w-0 truncate">
                                Showing {table.getRowModel().rows.length} of {curriculums.length} curriculum(s)
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
                    </TabsContent>

                    <TabsContent value="schedule" className=" mx-6">
                        <Accordion type="single" collapsible className="w-full" defaultValue={curriculums[0]?._id}>
                            {curriculums.map((curriculum) => (
                                <AccordionItem key={curriculum._id} value={curriculum._id}>
                                    <AccordionTrigger>
                                        <div className="flex items-center justify-between w-full pr-4">
                                            <span>{curriculum.name}</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    toggleEditMode(curriculum._id)
                                                }}
                                                className="h-8 w-8 p-0"
                                            >
                                                {editMode[curriculum._id] ? (
                                                    <Save className="h-4 w-4" />
                                                ) : (
                                                    <Edit className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-0">
                                        <div className="overflow-auto border rounded-md border-slate-200">
                                            <Table className="table-fixed w-full border-collapse">
                                                <TableHeader className="border-b border-slate-200">
                                                    <TableRow>
                                                        {daysFull.map((d) => (
                                                            <TableHead key={d} className="text-center w-48 min-w-48">{d}</TableHead>
                                                        ))}
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody className="divide-y divide-slate-200">
                                                    {/* Standards section */}
                                                    <TableRow>
                                                        <TableCell colSpan={days.length} className="py-1 px-3 text-xs font-medium text-muted-foreground bg-muted/20">
                                                            Standards
                                                        </TableCell>
                                                    </TableRow>
                                                    <TableRow>
                                                        {days.map((dayKey) => (
                                                            <TableCell key={dayKey} className="p-2 align-top w-48 min-w-48 max-w-48">
                                                                <BulletPointEditor
                                                                    items={getScheduleValue(curriculum._id, 'standards', dayKey)}
                                                                    onChange={(items) => updateScheduleData(curriculum._id, 'standards', dayKey, items)}
                                                                    disabled={!editMode[curriculum._id]}
                                                                    placeholder={`Standard for ${dayKey.toUpperCase()}`}
                                                                />
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>

                                                    {/* Objectives section */}
                                                    <TableRow>
                                                        <TableCell colSpan={days.length} className="py-1 px-3 text-xs font-medium text-muted-foreground bg-muted/20">
                                                            Objectives
                                                        </TableCell>
                                                    </TableRow>
                                                    <TableRow>
                                                        {days.map((dayKey) => (
                                                            <TableCell key={dayKey} className="p-2 align-top w-48 min-w-48 max-w-48">
                                                                <BulletPointEditor
                                                                    items={getScheduleValue(curriculum._id, 'objectives', dayKey)}
                                                                    onChange={(items) => updateScheduleData(curriculum._id, 'objectives', dayKey, items)}
                                                                    disabled={!editMode[curriculum._id]}
                                                                    placeholder={`Objective for ${dayKey.toUpperCase()}`}
                                                                />
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>

                                                    {/* Lesson section */}
                                                    <TableRow>
                                                        <TableCell colSpan={days.length} className="py-1 px-3 text-xs font-medium text-muted-foreground bg-muted/20">
                                                            Lesson
                                                        </TableCell>
                                                    </TableRow>
                                                    <TableRow>
                                                        {days.map((dayKey) => (
                                                            <TableCell key={dayKey} className="p-2 w-48 min-w-48 max-w-48">
                                                                <LessonCombobox
                                                                    options={lessonsByCurriculum[curriculum._id] || []}
                                                                    value={selectedLessons[curriculum._id]?.[dayKey]}
                                                                    onValueChange={(val) => handleLessonChange(curriculum._id, dayKey, val)}
                                                                    placeholder="Select lesson"
                                                                    disabled={!editMode[curriculum._id]}
                                                                />
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>

                                                    {/* Description section */}
                                                    <TableRow>
                                                        <TableCell colSpan={days.length} className="py-1 px-3 text-xs font-medium text-muted-foreground bg-muted/20">
                                                            Description
                                                        </TableCell>
                                                    </TableRow>
                                                    <TableRow>
                                                        {days.map((dayKey) => (
                                                            <TableCell key={dayKey} className="p-2 align-top w-48 min-w-48 max-w-48">
                                                                <BulletPointEditor
                                                                    items={getScheduleValue(curriculum._id, 'descriptions', dayKey)}
                                                                    onChange={(items) => updateScheduleData(curriculum._id, 'descriptions', dayKey, items)}
                                                                    disabled={!editMode[curriculum._id]}
                                                                    placeholder={`Description for ${dayKey.toUpperCase()}`}
                                                                />
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

function CurriculumStatusBadge({ status }: { status: CurriculumStatus }) {
    const styles: Record<CurriculumStatus, string> = {
        draft: "bg-gray-500/15 text-gray-700",
        active: "bg-emerald-500/10 text-emerald-700",
        archived: "bg-amber-500/15 text-amber-700",
        deprecated: "bg-rose-500/20 text-rose-700",
    };

    return (
        <Badge className={`rounded-full px-3 py-1 text-xs font-medium ${styles[status] ?? styles.draft}`}>
            {status}
        </Badge>
    );
}