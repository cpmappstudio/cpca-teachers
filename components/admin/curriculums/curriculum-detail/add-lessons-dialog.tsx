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
    X,
    Sparkles
} from "lucide-react"
import { useState, useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id, Doc } from "@/convex/_generated/dataModel"
import { LessonsDialog } from "@/components/admin/lessons/lessons-dialog"
import { Textarea } from "@/components/ui/textarea"
import { useCurrentUser } from "@/hooks/use-current-user"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
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
    onRemove: (lessonId: Id<"curriculum_lessons">) => void
}

function SortableLesson({ lesson, onRemove }: SortableLessonProps) {
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
    const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false)
    const [bulkLessonsText, setBulkLessonsText] = useState("")
    const [isBulkSubmitting, setIsBulkSubmitting] = useState(false)
    const [currentGradeForBulk, setCurrentGradeForBulk] = useState<string | null>(null)

    // Get current user
    const { user } = useCurrentUser()

    // Query para obtener el curriculum y sus grades
    const curriculum = useQuery(api.curriculums.getCurriculum, { curriculumId })

    // Query para obtener las lecciones del curriculum
    const lessons = useQuery(api.curriculums.getLessonsByCurriculum, {
        curriculumId,
        isActive: true
    })

    // Query para obtener los campus (necesario para obtener el level de los grades)
    const campuses = useQuery(api.campuses.getCampuses, {})

    // Estado local para el orden de las lecciones por grade y quarter (antes de guardar)
    const [localLessonsOrder, setLocalLessonsOrder] = useState<Record<string, Record<number, Doc<"curriculum_lessons">[]>>>({})

    // Mutations
    const deleteLesson = useMutation(api.lessons.deleteLesson)
    const reorderLessons = useMutation(api.lessons.reorderLessons)
    const bulkCreateLessons = useMutation(api.lessons.bulkCreateLessons)

    // Setup drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    // Obtener todos los grades únicos del curriculum ordenados por level
    const allGrades = useMemo(() => {
        if (!curriculum?.campusAssignments || !campuses) return []

        // Obtener todos los grade codes del curriculum
        const gradesSet = new Set<string>()
        curriculum.campusAssignments.forEach((assignment: { campusId: Id<"campuses">, gradeCodes: string[] }) => {
            assignment.gradeCodes.forEach((code: string) => gradesSet.add(code))
        })

        // Crear un mapa de grade code a level usando la información de los campus
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

        // Ordenar los grades por level
        return Array.from(gradesSet).sort((a, b) => {
            const levelA = gradeToLevel.get(a) ?? 999
            const levelB = gradeToLevel.get(b) ?? 999
            return levelA - levelB
        })
    }, [curriculum, campuses])

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
            for (const [, gradeQuarters] of Object.entries(localLessonsOrder)) {
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

    const handleBulkCreate = async () => {
        if (!currentGradeForBulk || !bulkLessonsText.trim()) {
            toast.error("Missing information", {
                description: "Please select a grade and enter lesson titles."
            })
            return
        }

        if (!user?._id) {
            toast.error("Authentication required", {
                description: "You must be logged in to create lessons."
            })
            return
        }

        // Validate number of quarters before submitting
        const quarterSections = bulkLessonsText.split(/^---$/m).filter(s => s.trim().length > 0)
        const numberOfQuarters = curriculum?.numberOfQuarters || 1

        if (quarterSections.length > numberOfQuarters) {
            toast.error("Too many quarters", {
                description: `This curriculum has ${numberOfQuarters} quarter${numberOfQuarters > 1 ? 's' : ''}, but you provided ${quarterSections.length} sections separated by "---". Please adjust your input.`,
                duration: 5000,
            })
            return
        }

        setIsBulkSubmitting(true)

        try {
            const result = await bulkCreateLessons({
                curriculumId,
                gradeCode: currentGradeForBulk,
                lessonsText: bulkLessonsText,
                createdBy: user._id,
            })

            if (result.success) {
                toast.success("Lessons created", {
                    description: result.message
                })
                setBulkLessonsText("")
                setIsBulkDialogOpen(false)
            } else {
                toast.error("Error creating lessons", {
                    description: result.message
                })
            }

            if (result.errors && result.errors.length > 0) {
                toast.error("Some lessons had errors", {
                    description: result.errors.join('\n')
                })
            }
        } catch (error) {
            toast.error("Error creating lessons", {
                description: error instanceof Error ? error.message : "Failed to create lessons."
            })
        } finally {
            setIsBulkSubmitting(false)
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
                        <TabsList className="w-full justify-start overflow-x-auto">
                            {allGrades.map((grade) => {
                                const gradeLessons = lessons?.filter(l => l.gradeCode === grade) || []
                                return (
                                    <TabsTrigger key={grade} value={grade} className="gap-2">
                                        <GraduationCap className="h-3 w-3" />
                                        {grade}
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
                                                            {quarterLessons.map((lesson) => (
                                                                <SortableLesson
                                                                    key={lesson._id}
                                                                    lesson={lesson}
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
                                                            {quarterLessons.map((lesson) => (
                                                                <SortableLesson
                                                                    key={lesson._id}
                                                                    lesson={lesson}
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
                    <div className="flex gap-2">
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

                        <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="gap-2 self-start"
                                    onClick={() => {
                                        // Set the current grade from the active tab
                                        if (allGrades.length > 0) {
                                            setCurrentGradeForBulk(allGrades[0])
                                        }
                                    }}
                                >
                                    <Sparkles className="h-4 w-4" />
                                    Bulk Create
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl overflow-hidden">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        Bulk Create Lessons
                                        <Badge variant="outline" className="text-xs font-normal">
                                            {curriculum?.numberOfQuarters || 1} Quarter{curriculum?.numberOfQuarters !== 1 ? 's' : ''} Available
                                        </Badge>
                                    </DialogTitle>
                                    <DialogDescription>
                                        Paste multiple lesson titles (one per line) to create them all at once.
                                        Use &quot;---&quot; on its own line to separate quarters.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 overflow-hidden">
                                    <div className="space-y-2">
                                        <Label>Grade</Label>
                                        <select
                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                            value={currentGradeForBulk || ""}
                                            onChange={(e) => setCurrentGradeForBulk(e.target.value)}
                                        >
                                            <option value="">Select a grade...</option>
                                            {allGrades.map((gradeCode) => (
                                                <option key={gradeCode} value={gradeCode}>
                                                    {gradeCode}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-muted-foreground">
                                            All lessons will be created for this grade
                                        </p>
                                    </div>

                                    <div className="space-y-2 overflow-hidden">
                                        <Label>Lesson Titles</Label>
                                        <Textarea
                                            placeholder="Lesson 39 – Beginning consonant letter&#10;Lesson 42 – Beginning blending sound&#10;---&#10;Lesson 44 – Beginning letter sound (Quarter 2)&#10;Lesson 47 – Oral Phonics Evaluation"
                                            value={bulkLessonsText}
                                            onChange={(e) => setBulkLessonsText(e.target.value)}
                                            className="w-full font-mono text-sm min-h-[240px] max-h-[400px] resize-y overflow-auto"
                                        />
                                        <div className="flex items-start gap-2 text-xs text-muted-foreground overflow-hidden">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold mb-1">Format:</p>
                                                <ul className="list-disc list-inside space-y-0.5 ml-1">
                                                    <li className="break-words">&quot;Title – Description&quot; (text after &quot;–&quot; becomes description)</li>
                                                    <li className="break-words">Use &quot;---&quot; on its own line to separate quarters</li>
                                                    <li className="break-words">Lessons before first &quot;---&quot; go to Quarter 1, after go to Quarter 2, etc.</li>
                                                </ul>
                                            </div>
                                            <Badge
                                                variant="secondary"
                                                className="flex-shrink-0 text-xs whitespace-nowrap"
                                            >
                                                Max: {curriculum?.numberOfQuarters || 1}Q
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setIsBulkDialogOpen(false)
                                                setBulkLessonsText("")
                                            }}
                                            disabled={isBulkSubmitting}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={handleBulkCreate}
                                            disabled={isBulkSubmitting || !currentGradeForBulk || !bulkLessonsText.trim()}
                                        >
                                            {isBulkSubmitting ? "Creating..." : "Create Lessons"}
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>
        </EntityDialog>
    )
}

