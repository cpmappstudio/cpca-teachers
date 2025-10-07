"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SelectDropdown } from "@/components/ui/select-dropdown"
import { Plus, Edit, Trash2, BookOpen } from "lucide-react"
import { useState } from "react"
import { EntityDialog } from "@/components/ui/entity-dialog"

interface CurriculumDialogProps {
    curriculum?: {
        id: string
        name: string
        code?: string
        description?: string
        grade: "Pre-K" | "K" | "1st" | "2nd" | "3rd" | "4th" | "5th" | "6th" | "7th" | "8th" | "9th" | "10th" | "11th" | "12th"
        numberOfQuarters?: number
        syllabus?: string
        status: "active" | "inactive" | "draft" | "archived"
    }
    trigger?: React.ReactNode
}

export function CurriculumDialog({ curriculum, trigger }: CurriculumDialogProps) {
    const isEditing = !!curriculum

    const [selectedGrade, setSelectedGrade] = useState<string>(
        curriculum?.grade || "Pre-K"
    )
    const [selectedStatus, setSelectedStatus] = useState<string>(
        curriculum?.status || "draft"
    )

    // Grade options
    const gradeOptions = [
        { value: "Pre-K", label: "Pre-K" },
        { value: "K", label: "K" },
        { value: "1st", label: "1st Grade" },
        { value: "2nd", label: "2nd Grade" },
        { value: "3rd", label: "3rd Grade" },
        { value: "4th", label: "4th Grade" },
        { value: "5th", label: "5th Grade" },
        { value: "6th", label: "6th Grade" },
        { value: "7th", label: "7th Grade" },
        { value: "8th", label: "8th Grade" },
        { value: "9th", label: "9th Grade" },
        { value: "10th", label: "10th Grade" },
        { value: "11th", label: "11th Grade" },
        { value: "12th", label: "12th Grade" }
    ]

    // Curriculum status options
    const curriculumStatusOptions = [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
        { value: "draft", label: "Draft" },
        { value: "archived", label: "Archived" }
    ]

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)

        // Añadir los valores seleccionados al formData
        formData.set("grade", selectedGrade)
        formData.set("status", selectedStatus)

        if (isEditing) {
            // TODO: Implement Convex mutation to update curriculum
            console.log("Updating curriculum with form data:", Object.fromEntries(formData))
        } else {
            // TODO: Implement Convex mutation to create curriculum
            console.log("Creating curriculum with form data:", Object.fromEntries(formData))
        }

        console.log("Selected Grade:", selectedGrade)
        console.log("Selected Status:", selectedStatus)
    }

    const handleDelete = () => {
        if (curriculum && window.confirm(`Are you sure you want to delete "${curriculum.name}"? This action cannot be undone.`)) {
            // TODO: Implement Convex mutation to delete curriculum
            console.log("Deleting curriculum:", curriculum.id)
            alert("Curriculum deletion would be implemented here")
        }
    }

    // Default triggers si no se proporciona uno custom
    const defaultTrigger = isEditing ? (
        <Button className="gap-2 cursor-pointer">
            <Edit className="h-4 w-4" />
            Edit curriculum
        </Button>
    ) : (
        <Button className="bg-deep-koamaru h-9 dark:text-white gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden md:inline">Add Curriculum</span>
        </Button>
    )

    return (
        <EntityDialog
            trigger={trigger || defaultTrigger}
            title={isEditing ? "Edit Curriculum" : "Create New Curriculum"}
            description={
                isEditing
                    ? "Make changes to the curriculum information. Click save when you're done."
                    : "Add a new curriculum to the system. Fill in the required information and click create."
            }
            onSubmit={handleSubmit}
            submitLabel={isEditing ? "Save changes" : "Create Curriculum"}
            leftActions={isEditing ? (
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleDelete}
                    className="gap-2 bg-rose-100 text-rose-800 hover:bg-rose-200 border-rose-200 dark:bg-rose-900/20 dark:text-rose-200 min-w-[120px] whitespace-nowrap"
                >
                    <Trash2 className="h-4 w-4" />
                    Delete Curriculum
                </Button>
            ) : undefined}
        >
            <div className="grid gap-6">
                {/* Hidden inputs para los valores seleccionados */}
                <input type="hidden" name="grade" value={selectedGrade} />
                <input type="hidden" name="status" value={selectedStatus} />

                {/* Basic Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-3">
                        <Label htmlFor="code">
                            Code {!isEditing && "*"}
                        </Label>
                        <Input
                            id="code"
                            name="code"
                            defaultValue={curriculum?.code || ""}
                            placeholder={isEditing ? "" : "e.g., MATH-10-001, SCI-09-001"}
                            required
                        />
                    </div>
                    <div className="grid gap-3">
                        <Label htmlFor="name">
                            Name {!isEditing && "*"}
                        </Label>
                        <Input
                            id="name"
                            name="name"
                            defaultValue={curriculum?.name || ""}
                            placeholder={isEditing ? "" : "e.g., Mathematics Grade 10"}
                            required
                        />
                    </div>
                </div>

                {/* Description */}
                <div className="grid gap-3">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                        id="description"
                        name="description"
                        defaultValue={curriculum?.description || ""}
                        placeholder={isEditing ? "" : "Provide a brief description of the curriculum..."}
                        rows={4}
                        className="resize-none"
                    />
                </div>

                {/* Grade and Quarters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-3">
                        <Label htmlFor="grade">
                            Grade {!isEditing && "*"}
                        </Label>
                        <SelectDropdown
                            options={gradeOptions}
                            value={selectedGrade}
                            onValueChange={(value) => setSelectedGrade(value)}
                            placeholder="Select grade..."
                            label="Grade Options"
                        />
                    </div>
                    <div className="grid gap-3">
                        <Label htmlFor="numberOfQuarters">Number of Quarters</Label>
                        <Input
                            id="numberOfQuarters"
                            name="numberOfQuarters"
                            type="number"
                            min="1"
                            max="4"
                            defaultValue={curriculum?.numberOfQuarters || 4}
                            placeholder={isEditing ? "" : "e.g., 4"}
                        />
                    </div>
                </div>

                {/* Syllabus */}
                <div className="space-y-4">
                    <h4 className="text-sm font-medium border-b pb-2">Syllabus</h4>
                    <div className="grid gap-3">
                        <Label htmlFor="syllabus">Syllabus Content</Label>
                        <Textarea
                            id="syllabus"
                            name="syllabus"
                            defaultValue={curriculum?.syllabus || ""}
                            placeholder={isEditing ? "" : "Enter the complete syllabus content, including topics, objectives, and learning outcomes..."}
                            rows={8}
                            className="resize-none font-mono text-sm"
                        />
                        <p className="text-sm text-muted-foreground">
                            Include all relevant topics, learning objectives, and assessment criteria
                        </p>
                    </div>
                </div>

                {/* Status */}
                <div className="space-y-4">
                    <h4 className="text-sm font-medium border-b pb-2">Status</h4>
                    <div className="grid gap-3">
                        <Label htmlFor="status">
                            Curriculum Status {!isEditing && "*"}
                        </Label>
                        <SelectDropdown
                            options={curriculumStatusOptions}
                            value={selectedStatus}
                            onValueChange={(value) => setSelectedStatus(value)}
                            placeholder="Select status..."
                            label="Curriculum Status Options"
                        />
                    </div>
                </div>
            </div>
        </EntityDialog>
    )
}
