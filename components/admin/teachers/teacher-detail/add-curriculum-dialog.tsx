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
import { Plus, ChevronDown, BookOpen, FileText, X } from "lucide-react"
import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id, Doc } from "@/convex/_generated/dataModel"
import { EntityDialog } from "@/components/ui/entity-dialog"

// Mock data para curriculums - TEMPORAL PARA TESTING
const mockCurriculums = [
    {
        _id: "curriculum_5" as Id<"curriculums">,
        name: "History Grade 3",
        code: "HIST-G3",
        status: "active" as const,
        metrics: {
            totalLessons: 32,
            assignedTeachers: 2,
            averageProgress: 85,
            lastUpdated: Date.now(),
        },
        isActive: true
    },
    {
        _id: "curriculum_6" as Id<"curriculums">,
        name: "Art Education",
        code: "ART-G3",
        status: "active" as const,
        metrics: {
            totalLessons: 28,
            assignedTeachers: 1,
            averageProgress: 92,
            lastUpdated: Date.now(),
        },
        isActive: true
    },
    {
        _id: "curriculum_7" as Id<"curriculums">,
        name: "Physical Education",
        code: "PE-G3",
        status: "draft" as const,
        metrics: {
            totalLessons: 40,
            assignedTeachers: 0,
            averageProgress: 0,
            lastUpdated: Date.now(),
        },
        isActive: false
    },
    {
        _id: "curriculum_8" as Id<"curriculums">,
        name: "Music Education",
        code: "MUS-G3",
        status: "active" as const,
        metrics: {
            totalLessons: 24,
            assignedTeachers: 3,
            averageProgress: 78,
            lastUpdated: Date.now(),
        },
        isActive: true
    },
    {
        _id: "curriculum_9" as Id<"curriculums">,
        name: "Computer Science Basics",
        code: "CS-G3",
        status: "draft" as const,
        metrics: {
            totalLessons: 36,
            assignedTeachers: 1,
            averageProgress: 45,
            lastUpdated: Date.now(),
        },
        isActive: false
    },
    {
        _id: "curriculum_10" as Id<"curriculums">,
        name: "Geography Grade 3",
        code: "GEO-G3",
        status: "active" as const,
        metrics: {
            totalLessons: 30,
            assignedTeachers: 2,
            averageProgress: 88,
            lastUpdated: Date.now(),
        },
        isActive: true
    }
]

interface AddCurriculumDialogProps {
    teacherId: string
}

export function AddCurriculumDialog({ teacherId }: AddCurriculumDialogProps) {
    const [selectedCurriculumIds, setSelectedCurriculumIds] = useState<Id<"curriculums">[]>([])

    // Query para obtener curriculums disponibles (comentado temporalmente)
    // const allCurriculums = useQuery(api.curriculums.getAvailable)
    // const availableCurriculums = allCurriculums?.filter(curriculum =>
    //     curriculum.status === "active"
    // ) || []

    // Usando mock data temporalmente
    const availableCurriculums = mockCurriculums

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

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        // Simular éxito
        alert(`Successfully added ${selectedCurriculums.length} curriculum(s) to the teacher!`)

        // Reset selection after submit
        setSelectedCurriculumIds([])
    }

    const trigger = (
        <Button className="bg-sidebar-accent h-9 dark:text-white gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden md:inline">Add Curriculum</span>
        </Button>
    )

    return (
        <EntityDialog
            trigger={trigger}
            title="Add Curriculums to Teacher"
            description="Select curriculums to assign to this teacher. You can select multiple curriculums before saving."
            onSubmit={handleSubmit}
            submitLabel={`Add ${selectedCurriculumIds.length} Curriculum${selectedCurriculumIds.length === 1 ? '' : 's'}`}
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
                                                        {curriculum.metrics?.totalLessons} lessons • {curriculum.status}
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
                        <Button
                            type="button"
                            variant="outline"
                            className="gap-2 self-start"
                            onClick={() => {
                                alert("Create Curriculum functionality coming soon!")
                            }}
                        >
                            <FileText className="h-4 w-4" />
                            Create Curriculum
                        </Button>
                    </div>
                </div>
            </div>
        </EntityDialog>
    )
}