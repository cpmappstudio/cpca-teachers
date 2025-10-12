"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Plus, ChevronDown, BookOpen, FileText, X, ListCheck } from "lucide-react"
import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id, Doc } from "@/convex/_generated/dataModel"
import { EntityDialog } from "@/components/ui/entity-dialog"
import { toast } from "sonner"
import { CurriculumDialog } from "@/components/admin/curriculums/curriculum-dialog"

interface AddCurriculumDialogProps {
    teacherId: string
}

export function AddCurriculumDialog({ teacherId }: AddCurriculumDialogProps) {
    const [selectedCurriculumIds, setSelectedCurriculumIds] = useState<Id<"curriculums">[]>([])
    const [initialCurriculumIds, setInitialCurriculumIds] = useState<Id<"curriculums">[]>([])

    // Query para obtener información del teacher (necesitamos su campusId)
    const teacher = useQuery(api.users.getUser, { userId: teacherId as Id<"users"> })

    // Query para obtener curriculums disponibles
    const allCurriculums = useQuery(api.curriculums.getCurriculums, { isActive: true })
    // Show both active and draft curriculums (exclude archived and deprecated)
    const availableCurriculums = allCurriculums?.filter(curriculum =>
        curriculum.status === "active" || curriculum.status === "draft"
    ) || []

    // Query para obtener curriculums ya asignados al profesor
    const teacherCurriculums = useQuery(api.curriculums.getCurriculumsByTeacherNew, {
        teacherId: teacherId as Id<"users">,
        isActive: true,
    })

    // Mutations
    const addTeacherToCurriculum = useMutation(api.curriculums.addTeacherToCurriculum)
    const removeTeacherFromCurriculum = useMutation(api.curriculums.removeTeacherFromCurriculum)

    // Inicializar con los curriculums ya asignados al profesor
    useEffect(() => {
        if (teacherCurriculums) {
            const curriculumIds = teacherCurriculums.map(c => c._id)
            setSelectedCurriculumIds(curriculumIds)
            setInitialCurriculumIds(curriculumIds)
        }
    }, [teacherCurriculums])

    const selectedCurriculums = availableCurriculums.filter(curriculum =>
        selectedCurriculumIds.includes(curriculum._id)
    )

    const handleCurriculumToggle = (curriculumId: Id<"curriculums">) => {
        setSelectedCurriculumIds(prev =>
            prev.includes(curriculumId)
                ? prev.filter(id => id !== curriculumId)
                : [...prev, curriculumId]
        )
    }

    const handleRemoveCurriculum = (curriculumId: Id<"curriculums">) => {
        setSelectedCurriculumIds(prev => prev.filter(id => id !== curriculumId))
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        try {
            // Determinar qué curriculums añadir y cuáles remover
            const curriculumsToAdd = selectedCurriculumIds.filter(id => !initialCurriculumIds.includes(id))
            const curriculumsToRemove = initialCurriculumIds.filter(id => !selectedCurriculumIds.includes(id))

            // Verificar que el teacher tiene un campus asignado para poder añadir curriculums
            if (curriculumsToAdd.length > 0 && !teacher?.campusId) {
                toast.error("Cannot assign curriculums", {
                    description: "This teacher must be assigned to a campus before adding curriculums."
                })
                return
            }

            // Añadir teacher a los curriculums seleccionados
            await Promise.all(
                curriculumsToAdd.map(curriculumId =>
                    addTeacherToCurriculum({
                        curriculumId,
                        teacherId: teacherId as Id<"users">,
                        campusId: teacher!.campusId!,
                    })
                )
            )

            // Remover teacher de los curriculums deseleccionados
            await Promise.all(
                curriculumsToRemove.map(curriculumId =>
                    removeTeacherFromCurriculum({
                        curriculumId,
                        teacherId: teacherId as Id<"users">,
                    })
                )
            )

            if (curriculumsToAdd.length > 0 || curriculumsToRemove.length > 0) {
                const message = []
                if (curriculumsToAdd.length > 0) {
                    message.push(`${curriculumsToAdd.length} curriculum${curriculumsToAdd.length === 1 ? '' : 's'} added`)
                }
                if (curriculumsToRemove.length > 0) {
                    message.push(`${curriculumsToRemove.length} curriculum${curriculumsToRemove.length === 1 ? '' : 's'} removed`)
                }

                toast.success("Curriculums updated successfully", {
                    description: message.join(' and ') + '.'
                })
            } else {
                toast.info("No changes detected", {
                    description: "No curriculums were added or removed."
                })
            }

            // Actualizar los IDs iniciales
            setInitialCurriculumIds(selectedCurriculumIds)
        } catch (error) {
            toast.error("Error updating curriculums", {
                description: "There was a problem updating the curriculums. Please try again."
            })
        }
    }

    const trigger = (
        <Button className="bg-sidebar-accent h-9 dark:text-white gap-2">
            <ListCheck className="h-4 w-4" />
            <span className="hidden md:inline">Update Curriculums</span>
        </Button>
    )

    return (
        <EntityDialog
            trigger={trigger}
            title="Add Curriculums to Teacher"
            onSubmit={handleSubmit}
            submitLabel="Update Curriculums"
            maxWidth="700px"
        >
            <div className="grid gap-6">


                {/* Curriculum Selection */}
                <div className="space-y-4">
                    <h4 className="text-sm font-medium border-b pb-2">Available Curriculums</h4>
                    <div className="grid gap-3">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full justify-between">
                                    <span className="text-muted-foreground">
                                        Choose curriculums to add...
                                    </span>
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-80 max-h-80 overflow-y-auto" align="start">
                                <DropdownMenuLabel>Available Curriculums ({availableCurriculums.length})</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {availableCurriculums.map((curriculum) => {
                                    const isSelected = selectedCurriculumIds.includes(curriculum._id)
                                    return (
                                        <DropdownMenuItem
                                            key={curriculum._id}
                                            onClick={() => handleCurriculumToggle(curriculum._id)}
                                            className={`${isSelected ? "bg-accent" : ""} cursor-pointer`}
                                        >
                                            <div className="flex flex-col gap-1 w-full">
                                                <div className="flex items-center gap-2">
                                                    <BookOpen className="h-4 w-4" />
                                                    <span className="font-medium">{curriculum.name}</span>
                                                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                                        {curriculum.code}
                                                    </span>
                                                    {isSelected && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            Selected
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between ml-6">
                                                    <span className="text-sm text-muted-foreground">
                                                        {curriculum.metrics?.totalLessons || 0} lessons • {curriculum.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </DropdownMenuItem>
                                    )
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Selected Curriculums Display */}
                {selectedCurriculums.length > 0 && (
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium border-b pb-2">Selected Curriculums ({selectedCurriculums.length})</h4>
                        <div className="flex flex-wrap gap-2">
                            {selectedCurriculums.map((curriculum) => (
                                <Badge
                                    key={curriculum._id}
                                    variant="outline"
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm"
                                >
                                    <BookOpen className="h-3 w-3" />
                                    <span>{curriculum.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveCurriculum(curriculum._id)}
                                        className="ml-1 rounded-full hover:bg-muted p-0.5"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}
                {/* Create New Curriculum Option */}
                <div className="space-y-4">
                    <h4 className="text-sm font-medium border-b pb-2">Don't see the curriculum you need?</h4>
                    <div className="flex flex-col gap-3">
                        <p className="text-sm text-muted-foreground">
                            If the curriculum you want to assign isn't in the system yet, you can create a new curriculum.
                        </p>
                        <CurriculumDialog
                            trigger={
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="gap-2 self-start"
                                >
                                    <FileText className="h-4 w-4" />
                                    Create Curriculum
                                </Button>
                            }
                        />
                    </div>
                </div>
            </div>
        </EntityDialog>
    )
}