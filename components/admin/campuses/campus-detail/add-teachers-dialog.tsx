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
import { Plus, ChevronDown, User, UserPlus, X, ListCheck } from "lucide-react"
import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id, Doc } from "@/convex/_generated/dataModel"
import { EntityDialog } from "@/components/ui/entity-dialog"
import { toast } from "sonner"
import { TeacherDialog } from "@/components/admin/teachers/teacher-dialog"

interface AddTeachersDialogProps {
    campusId: Id<"campuses">
}

export function AddTeachersDialog({ campusId }: AddTeachersDialogProps) {
    const [selectedTeacherIds, setSelectedTeacherIds] = useState<Id<"users">[]>([])
    const [initialTeacherIds, setInitialTeacherIds] = useState<Id<"users">[]>([])

    // Query para obtener profesores disponibles
    const allUsers = useQuery(api.users.getUsers, { role: "teacher", isActive: true })
    const availableTeachers = allUsers || []

    // Query para obtener profesores ya asignados al campus
    const campusTeachers = useQuery(api.campuses.getTeachersByCampus, { campusId })

    // Mutation para actualizar profesores
    const updateUser = useMutation(api.users.updateUser)
    const removeTeacherFromCampus = useMutation(api.users.removeTeacherFromCampus)

    // Inicializar con los profesores ya asignados al campus
    useEffect(() => {
        if (campusTeachers) {
            const teacherIds = campusTeachers.map(t => t._id)
            setSelectedTeacherIds(teacherIds)
            setInitialTeacherIds(teacherIds)
        }
    }, [campusTeachers])

    const selectedTeachers = availableTeachers.filter(teacher =>
        selectedTeacherIds.includes(teacher._id)
    )

    const handleTeacherToggle = (teacherId: Id<"users">) => {
        setSelectedTeacherIds(prev =>
            prev.includes(teacherId)
                ? prev.filter(id => id !== teacherId)
                : [...prev, teacherId]
        )
    }

    const handleRemoveTeacher = (teacherId: Id<"users">) => {
        setSelectedTeacherIds(prev => prev.filter(id => id !== teacherId))
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        try {
            // Determinar qué profesores añadir y cuáles remover
            const teachersToAdd = selectedTeacherIds.filter(id => !initialTeacherIds.includes(id))
            const teachersToRemove = initialTeacherIds.filter(id => !selectedTeacherIds.includes(id))

            // Añadir profesores al campus
            await Promise.all(
                teachersToAdd.map(teacherId =>
                    updateUser({
                        userId: teacherId,
                        updates: { campusId }
                    })
                )
            )

            // Remover profesores del campus
            await Promise.all(
                teachersToRemove.map(teacherId =>
                    removeTeacherFromCampus({ userId: teacherId })
                )
            )

            if (teachersToAdd.length > 0 || teachersToRemove.length > 0) {
                const message = []
                if (teachersToAdd.length > 0) {
                    message.push(`${teachersToAdd.length} teacher${teachersToAdd.length === 1 ? '' : 's'} added`)
                }
                if (teachersToRemove.length > 0) {
                    message.push(`${teachersToRemove.length} teacher${teachersToRemove.length === 1 ? '' : 's'} removed`)
                }

                toast.success("Teachers updated successfully", {
                    description: message.join(' and ') + '.'
                })
            } else {
                toast.info("No changes detected", {
                    description: "No teachers were added or removed."
                })
            }

            // Actualizar los IDs iniciales
            setInitialTeacherIds(selectedTeacherIds)
        } catch (error) {
            toast.error("Error updating teachers", {
                description: "There was a problem updating the teachers. Please try again."
            })
        }
    }

    const trigger = (
        <Button className="bg-sidebar-accent h-9 dark:text-white gap-2">
            <ListCheck className="h-4 w-4" />
            <span className="hidden md:inline">Update Teachers</span>
        </Button>
    )

    return (
        <EntityDialog
            trigger={trigger}
            title="Add Teachers to Campus"
            description="Select teachers to assign to this campus. You can select multiple teachers before saving."
            onSubmit={handleSubmit}
            submitLabel="Update Teachers"
            maxWidth="700px"
        >
            <div className="grid gap-6">


                {/* Teacher Selection */}
                <div className="space-y-4">
                    <h4 className="text-sm font-medium border-b pb-2">Available Teachers</h4>
                    <div className="grid gap-3">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full justify-between">
                                    <span className="text-muted-foreground">
                                        Choose teachers to add...
                                    </span>
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-80 max-h-80 overflow-y-auto" align="start">
                                <DropdownMenuLabel>Available Teachers ({availableTeachers.length})</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {availableTeachers.map((teacher) => {
                                    const isSelected = selectedTeacherIds.includes(teacher._id)
                                    return (
                                        <DropdownMenuItem
                                            key={teacher._id}
                                            onClick={() => handleTeacherToggle(teacher._id)}
                                            className={`${isSelected ? "bg-accent" : ""} cursor-pointer`}
                                        >
                                            <div className="flex flex-col gap-1 w-full">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4" />
                                                    <span className="font-medium">{teacher.fullName}</span>
                                                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                                        {teacher.role}
                                                    </span>
                                                    {isSelected && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            Selected
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between ml-6">
                                                    <span className="text-sm text-muted-foreground">
                                                        {teacher.email}
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

                {/* Selected Teachers Display */}
                {selectedTeachers.length > 0 && (
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium border-b pb-2">Selected Teachers ({selectedTeachers.length})</h4>
                        <div className="flex flex-wrap gap-2">
                            {selectedTeachers.map((teacher) => (
                                <Badge
                                    key={teacher._id}
                                    variant="outline"
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm"
                                >
                                    <User className="h-3 w-3" />
                                    <span>{teacher.fullName}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveTeacher(teacher._id)}
                                        className="ml-1 rounded-full hover:bg-muted p-0.5"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}
                {/* Create New Teacher Option */}
                <div className="space-y-4">
                    <h4 className="text-sm font-medium border-b pb-2">Don't see the teacher you need?</h4>
                    <div className="flex flex-col gap-3">
                        <p className="text-sm text-muted-foreground">
                            If the teacher you want to assign isn't in the system yet, you can create a new teacher profile.
                            The teacher will be automatically assigned to this campus.
                        </p>
                        <TeacherDialog
                            defaultCampusId={campusId}
                            trigger={
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="gap-2 self-start"
                                >
                                    <UserPlus className="h-4 w-4" />
                                    Create Teacher
                                </Button>
                            }
                        />
                    </div>
                </div>
            </div>
        </EntityDialog>
    )
}