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
import { Plus, ChevronDown, User, UserPlus, X } from "lucide-react"
import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id, Doc } from "@/convex/_generated/dataModel"
import { EntityDialog } from "@/components/ui/entity-dialog"

// Mock data para profesores - TEMPORAL PARA TESTING
const mockTeachers = [
    {
        _id: "teacher_1" as Id<"users">,
        fullName: "María García López",
        email: "maria.garcia@alefuniversity.edu",
        role: "teacher" as const,
        campusId: undefined
    },
    {
        _id: "teacher_2" as Id<"users">,
        fullName: "Carlos Rodríguez Martín",
        email: "carlos.rodriguez@alefuniversity.edu",
        role: "teacher" as const,
        campusId: undefined
    },
    {
        _id: "teacher_3" as Id<"users">,
        fullName: "Ana Isabel Fernández",
        email: "ana.fernandez@alefuniversity.edu",
        role: "teacher" as const,
        campusId: undefined
    },
    {
        _id: "teacher_4" as Id<"users">,
        fullName: "José Miguel Hernández",
        email: "jose.hernandez@alefuniversity.edu",
        role: "teacher" as const,
        campusId: undefined
    },
    {
        _id: "teacher_5" as Id<"users">,
        fullName: "Carmen Dolores Ruiz",
        email: "carmen.ruiz@alefuniversity.edu",
        role: "teacher" as const,
        campusId: undefined
    },
    {
        _id: "teacher_6" as Id<"users">,
        fullName: "Francisco Javier Torres",
        email: "francisco.torres@alefuniversity.edu",
        role: "teacher" as const,
        campusId: undefined
    },
    {
        _id: "teacher_7" as Id<"users">,
        fullName: "Lucía Montero Vázquez",
        email: "lucia.montero@alefuniversity.edu",
        role: "teacher" as const,
        campusId: undefined
    },
    {
        _id: "teacher_8" as Id<"users">,
        fullName: "Roberto Silva Jiménez",
        email: "roberto.silva@alefuniversity.edu",
        role: "teacher" as const,
        campusId: undefined
    },
    {
        _id: "teacher_9" as Id<"users">,
        fullName: "Elena Morales Vega",
        email: "elena.morales@alefuniversity.edu",
        role: "teacher" as const,
        campusId: undefined
    },
    {
        _id: "teacher_10" as Id<"users">,
        fullName: "David Sánchez Ruiz",
        email: "david.sanchez@alefuniversity.edu",
        role: "teacher" as const,
        campusId: undefined
    }
]

interface AddTeachersDialogProps {
    campusId: Id<"campuses">
}

export function AddTeachersDialog({ campusId }: AddTeachersDialogProps) {
    const [selectedTeacherIds, setSelectedTeacherIds] = useState<Id<"users">[]>([])

    // Query para obtener profesores disponibles (comentado temporalmente)
    // const allUsers = useQuery(api.admin.getPotentialDirectors)
    // const availableTeachers = allUsers?.filter(user =>
    //     user.role === "teacher"
    // ) || []

    // Usando mock data temporalmente
    const availableTeachers = mockTeachers

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

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        console.log("Adding teachers to campus:", {
            campusId,
            teacherIds: selectedTeacherIds,
            selectedTeachers: selectedTeachers.map(t => ({
                id: t._id,
                name: t.fullName,
                email: t.email
            }))
        })

        // Simular éxito
        alert(`Successfully added ${selectedTeachers.length} teacher(s) to the campus!`)

        // Reset selection after submit
        setSelectedTeacherIds([])
    }

    const trigger = (
        <Button className="bg-sidebar-accent h-9 dark:text-white gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden md:inline">Add Teacher</span>
        </Button>
    )

    return (
        <EntityDialog
            trigger={trigger}
            title="Add Teachers to Campus"
            description="Select teachers to assign to this campus. You can select multiple teachers before saving."
            onSubmit={handleSubmit}
            submitLabel={`Add ${selectedTeacherIds.length} Teacher${selectedTeacherIds.length === 1 ? '' : 's'}`}
            maxWidth="700px"
        >
            <div className="grid gap-6">
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

                {/* Create New Teacher Option */}
                <div className="space-y-4">
                    <h4 className="text-sm font-medium border-b pb-2">Don't see the teacher you need?</h4>
                    <div className="flex flex-col gap-3">
                        <p className="text-sm text-muted-foreground">
                            If the teacher you want to assign isn't in the system yet, you can create a new teacher profile.
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            className="gap-2 self-start"
                            onClick={() => {
                                alert("Create Teacher functionality coming soon!")
                                console.log("Create new teacher clicked")
                            }}
                        >
                            <UserPlus className="h-4 w-4" />
                            Create Teacher
                        </Button>
                    </div>
                </div>
            </div>
        </EntityDialog>
    )
}