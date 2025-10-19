"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { EntityDialog } from "@/components/ui/entity-dialog"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import {
    Plus,
    BookOpen,
    GraduationCap,
    ListChecks,
    GripVertical,
    X
} from "lucide-react"
import { useState, useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id, Doc } from "@/convex/_generated/dataModel"
import { LessonsDialog } from "@/components/admin/lessons/lessons-dialog"
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core"
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { toast } from "sonner"


interface AddLessonsDialogProps {
    curriculumId: Id<"curriculums">
}

// Sortable Lesson Component
interface SortableLessonProps {
    lesson: Doc<"curriculum_lessons">
    index: number
    onRemove: (lessonId: Id<"curriculum_lessons">) => void
}

function SortableLesson({ lesson, index, onRemove }: SortableLessonProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: lesson._id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center gap-1 w-full max-w-full"
        >
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded flex-shrink-0"
            >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <Badge
                variant="outline"
                className="flex items-center gap-2 px-3 py-1.5 text-sm flex-1 min-w-0"
            >
                <BookOpen className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{lesson.title}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">- Q{lesson.quarter}</span>
                {lesson.gradeCode && (
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                        <GraduationCap className="h-3 w-3 inline mr-1" />
                        {lesson.gradeCode}
                    </span>
                )}
                {lesson.isMandatory && (
                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded flex-shrink-0">
                        Required
                    </span>
                )}
                <button
                    type="button"
                    onClick={() => onRemove(lesson._id)}
                    className="ml-1 rounded-full hover:bg-muted p-0.5 flex-shrink-0"
                >
                    <X className="h-3 w-3" />
                </button>
            </Badge>
        </div>
    )
}

export function AddLessonsDialog({ curriculumId }: AddLessonsDialogProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Query para obtener el curriculum y sus grades
    const curriculum = useQuery(api.curriculums.getCurriculum, { curriculumId })

    // Query para obtener las lecciones del curriculum
    const lessons = useQuery(api.curriculums.getLessonsByCurriculum, {
        curriculumId,
        isActive: true
    })

    // Estado local para el orden de las lecciones por grade y quarter (antes de guardar)
    const [localLessonsOrder, setLocalLessonsOrder] = useState<Record<string, Record<number, Doc<"curriculum_lessons">[]>>>({})

    // Mutations
    const deleteLesson = useMutation(api.lessons.deleteLesson)
    const reorderLessons = useMutation(api.lessons.reorderLessons)

    // Setup drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    // Obtener todos los grades únicos del curriculum
    const allGrades = useMemo(() => {
        if (!curriculum?.campusAssignments) return []

        const gradesSet = new Set<string>()
        curriculum.campusAssignments.forEach((assignment: { gradeCodes: string[] }) => {
            assignment.gradeCodes.forEach((code: string) => gradesSet.add(code))
        })

        return Array.from(gradesSet).sort()
    }, [curriculum])

    // Agrupar lecciones por grade y quarter
    const lessonsByGradeAndQuarter = useMemo(() => {
        if (!lessons) return {}

        const grouped: Record<string, Record<number, Doc<"curriculum_lessons">[]>> = {}

        lessons.forEach(lesson => {
            const gradeCode = lesson.gradeCode || "unassigned"

            if (!grouped[gradeCode]) {
                grouped[gradeCode] = {}
            }
            if (!grouped[gradeCode][lesson.quarter]) {
                grouped[gradeCode][lesson.quarter] = []
            }
            grouped[gradeCode][lesson.quarter].push(lesson)
        })

        // Ordenar lecciones dentro de cada quarter por orderInQuarter
        Object.keys(grouped).forEach(gradeCode => {
            Object.keys(grouped[gradeCode]).forEach(quarter => {
                grouped[gradeCode][Number(quarter)].sort((a, b) => a.orderInQuarter - b.orderInQuarter)
            })
        })

        return grouped
    }, [lessons])

    // Usar el orden local si existe, sino usar el del servidor
    const displayedLessons = useMemo(() => {
        if (Object.keys(localLessonsOrder).length === 0) {
            return lessonsByGradeAndQuarter
        }
        return localLessonsOrder
    }, [localLessonsOrder, lessonsByGradeAndQuarter])

    // Resetear el orden local cuando se abre/cierra el dialog
    const handleOpenChange = (open: boolean) => {
        setIsOpen(open)
        if (open) {
            // Al abrir, resetear el orden local
            setLocalLessonsOrder({})
        }
    }

    const handleDragEnd = (event: DragEndEvent, gradeCode: string, quarter: number) => {
        const { active, over } = event

        if (!over || active.id === over.id) {
            return
        }

        const quarterLessons = displayedLessons[gradeCode]?.[quarter]
        if (!quarterLessons) return

        const oldIndex = quarterLessons.findIndex(l => l._id === active.id)
        const newIndex = quarterLessons.findIndex(l => l._id === over.id)

        if (oldIndex !== -1 && newIndex !== -1) {
            // Reordenar el array localmente
            const reorderedLessons = arrayMove(quarterLessons, oldIndex, newIndex)

            // Actualizar el estado local con el nuevo orden
            setLocalLessonsOrder(prev => ({
                ...prev,
                [gradeCode]: {
                    ...(prev[gradeCode] || displayedLessons[gradeCode]),
                    [quarter]: reorderedLessons
                }
            }))
        }
    }

    const handleRemoveLesson = async (lessonId: Id<"curriculum_lessons">) => {
        try {
            await deleteLesson({ lessonId })
            toast.success("Lesson deleted", {
                description: "The lesson has been removed successfully."
            })
        } catch (error) {
            toast.error("Error deleting lesson", {
                description: error instanceof Error ? error.message : "Failed to delete lesson."
            })
        }
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        // Verificar si hay cambios pendientes
        if (Object.keys(localLessonsOrder).length === 0) {
            toast.info("No changes detected", {
                description: "Please reorder lessons before saving."
            })
            return
        }

        setIsSubmitting(true)

        try {
            // Guardar el nuevo orden para cada grade y quarter que fue modificado
            for (const [gradeCode, gradeQuarters] of Object.entries(localLessonsOrder)) {
                for (const [quarter, reorderedLessons] of Object.entries(gradeQuarters)) {
                    const lessonOrders = reorderedLessons.map((lesson, index) => ({
                        lessonId: lesson._id,
                        newOrder: index + 1, // orderInQuarter empieza en 1
                    }))

                    await reorderLessons({
                        curriculumId,
                        quarter: Number(quarter),
                        lessonOrders,
                    })
                }
            }

            toast.success("Lessons reordered", {
                description: "The lesson order has been updated successfully."
            })

            // Resetear el estado local y cerrar el dialog
            setLocalLessonsOrder({})
            setIsOpen(false)
        } catch (error) {
            toast.error("Error reordering lessons", {
                description: error instanceof Error ? error.message : "Failed to reorder lessons."
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const trigger = (
        <Button className="bg-sidebar-accent h-9 dark:text-white gap-2">
            <ListChecks className="h-4 w-4" />
            <span className="hidden md:inline">Manage Lessons</span>
            <span className="md:hidden">Lessons</span>
        </Button>
    )

    return (
        <EntityDialog
            trigger={trigger}
            title="Curriculum Lessons"
            open={isOpen}
            onOpenChange={handleOpenChange}
            onSubmit={handleSubmit}
            submitLabel="Save Changes"
            isSubmitting={isSubmitting}
            maxWidth="900px"
        >
            <div className="grid gap-6">
                {/* Header with total count */}
                <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="text-sm font-medium">
                        Lessons by Grade
                    </h4>
                    <Badge variant="outline" className="text-xs">
                        {lessons?.length || 0} total
                    </Badge>
                </div>

                {/* Tabs - Always show even if no lessons */}
                {allGrades.length > 0 ? (
                    <Tabs defaultValue={allGrades[0]} className="w-full">
                        <TabsList className="grid " style={{ gridTemplateColumns: `repeat(${allGrades.length || 1}, minmax(0, 1fr))` }}>
                            {allGrades.map((gradeCode) => {
                                const gradeLessons = lessons?.filter(l => l.gradeCode === gradeCode) || []
                                return (
                                    <TabsTrigger key={gradeCode} value={gradeCode} className="gap-2">
                                        <GraduationCap className="h-3 w-3" />
                                        {gradeCode}
                                        <Badge variant="secondary" className="ml-1 text-xs">
                                            {gradeLessons.length}
                                        </Badge>
                                    </TabsTrigger>
                                )
                            })}
                            {lessons?.some(l => !l.gradeCode) && (
                                <TabsTrigger value="unassigned" className="gap-2">
                                    <GraduationCap className="h-3 w-3" />
                                    Unassigned
                                    <Badge variant="secondary" className="ml-1 text-xs">
                                        {lessons?.filter(l => !l.gradeCode).length || 0}
                                    </Badge>
                                </TabsTrigger>
                            )}
                        </TabsList>

                        {allGrades.map((gradeCode) => (
                            <TabsContent key={gradeCode} value={gradeCode} className="mt-4">
                                <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
                                    {displayedLessons[gradeCode] && Object.entries(displayedLessons[gradeCode])
                                        .sort(([a], [b]) => Number(a) - Number(b))
                                        .map(([quarter, quarterLessons]) => (
                                            <div key={quarter} className="space-y-3 overflow-hidden">
                                                <Label className="flex items-center gap-2">
                                                    Quarter {quarter}
                                                    <Badge variant="outline" className="text-xs">
                                                        {quarterLessons.length} lesson{quarterLessons.length !== 1 ? 's' : ''}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground ml-auto">
                                                        Drag to reorder
                                                    </span>
                                                </Label>
                                                <DndContext
                                                    sensors={sensors}
                                                    collisionDetection={closestCenter}
                                                    onDragEnd={(event) => handleDragEnd(event, gradeCode, Number(quarter))}
                                                >
                                                    <SortableContext
                                                        items={quarterLessons.map(l => l._id)}
                                                        strategy={verticalListSortingStrategy}
                                                    >
                                                        <div className="flex flex-col gap-2 w-full overflow-hidden">
                                                            {quarterLessons.map((lesson, index) => (
                                                                <SortableLesson
                                                                    key={lesson._id}
                                                                    lesson={lesson}
                                                                    index={index}
                                                                    onRemove={handleRemoveLesson}
                                                                />
                                                            ))}
                                                        </div>
                                                    </SortableContext>
                                                </DndContext>
                                            </div>
                                        ))}
                                    {(!displayedLessons[gradeCode] || Object.keys(displayedLessons[gradeCode]).length === 0) && (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">No lessons for {gradeCode} yet</p>
                                            <p className="text-xs mt-1">Create your first lesson using the button below</p>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        ))}

                        {lessons?.some(l => !l.gradeCode) && (
                            <TabsContent value="unassigned" className="mt-4">
                                <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
                                    {displayedLessons["unassigned"] && Object.entries(displayedLessons["unassigned"])
                                        .sort(([a], [b]) => Number(a) - Number(b))
                                        .map(([quarter, quarterLessons]) => (
                                            <div key={quarter} className="space-y-3 overflow-hidden">
                                                <Label className="flex items-center gap-2">
                                                    Quarter {quarter}
                                                    <Badge variant="outline" className="text-xs">
                                                        {quarterLessons.length} lesson{quarterLessons.length !== 1 ? 's' : ''}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground ml-auto">
                                                        Drag to reorder
                                                    </span>
                                                </Label>
                                                <DndContext
                                                    sensors={sensors}
                                                    collisionDetection={closestCenter}
                                                    onDragEnd={(event) => handleDragEnd(event, "unassigned", Number(quarter))}
                                                >
                                                    <SortableContext
                                                        items={quarterLessons.map(l => l._id)}
                                                        strategy={verticalListSortingStrategy}
                                                    >
                                                        <div className="flex flex-col gap-2 w-full overflow-hidden">
                                                            {quarterLessons.map((lesson, index) => (
                                                                <SortableLesson
                                                                    key={lesson._id}
                                                                    lesson={lesson}
                                                                    index={index}
                                                                    onRemove={handleRemoveLesson}
                                                                />
                                                            ))}
                                                        </div>
                                                    </SortableContext>
                                                </DndContext>
                                            </div>
                                        ))}
                                </div>
                            </TabsContent>
                        )}
                    </Tabs>
                ) : (
                    <div className="text-center py-8 text-muted-foreground border rounded-lg">
                        <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm font-medium">No grades assigned to curriculum yet</p>
                        <p className="text-xs mt-1">Assign grades to the curriculum first, then you can create lessons</p>
                    </div>
                )}

                {/* Create New Lesson */}
                <div className="space-y-3 border-t pt-4">
                    <Label className="text-sm">Add New Lesson</Label>
                    <p className="text-sm text-muted-foreground">
                        Create a new lesson for this curriculum. The lesson will be added to the end of the selected quarter.
                    </p>
                    <LessonsDialog
                        defaultCurriculumId={curriculumId}
                        trigger={
                            <Button
                                type="button"
                                variant="outline"
                                className="gap-2 self-start"
                            >
                                <Plus className="h-4 w-4" />
                                Add Lesson
                            </Button>
                        }
                    />
                </div>
            </div>
        </EntityDialog>
    )
}

