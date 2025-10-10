"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SelectDropdown } from "@/components/ui/select-dropdown"
import { Plus, Edit, Trash2, BookOpen } from "lucide-react"
import { useState } from "react"
import { EntityDialog } from "@/components/ui/entity-dialog"
import { useMutation, useQuery } from "convex/react"
import { useUser } from "@clerk/nextjs"
import { useRouter, useParams } from "next/navigation"
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"

interface CurriculumDialogProps {
    curriculum?: Doc<"curriculums">
    trigger?: React.ReactNode
}

export function CurriculumDialog({ curriculum, trigger }: CurriculumDialogProps) {
    const isEditing = !!curriculum
    const router = useRouter()
    const params = useParams()
    const locale = params.locale as string

    // Clerk user
    const { user: clerkUser } = useUser()

    // Get current Convex user
    const currentUser = useQuery(
        api.users.getCurrentUser,
        clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
    )

    // Mutations
    const createCurriculumMutation = useMutation(api.curriculums.createCurriculum)
    const updateCurriculumMutation = useMutation(api.curriculums.updateCurriculum)
    const deleteCurriculumMutation = useMutation(api.curriculums.deleteCurriculum)

    // Dialog state
    const [isOpen, setIsOpen] = useState(false)

    // Loading state
    const [isSubmitting, setIsSubmitting] = useState(false)

    const [selectedStatus, setSelectedStatus] = useState<string>(
        curriculum?.status || "draft"
    )

    // Curriculum status options
    const curriculumStatusOptions = [
        { value: "active", label: "Active" },
        { value: "draft", label: "Draft" },
        { value: "archived", label: "Archived" },
        { value: "deprecated", label: "Deprecated" }
    ]

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        // Guardar referencia al formulario ANTES de cualquier operación asíncrona
        const form = event.currentTarget

        // Validar que tengamos el usuario actual
        if (!currentUser?._id) {
            alert("Error: User not authenticated. Please sign in again.")
            return
        }

        const formData = new FormData(form)

        // Obtener datos del formulario
        const name = formData.get("name") as string
        const code = formData.get("code") as string | null
        const description = formData.get("description") as string | null
        const numberOfQuarters = formData.get("numberOfQuarters") as string | null

        // Validación básica
        if (!name?.trim()) {
            alert("Validation Error: Curriculum name is required.")
            return
        }

        if (!code?.trim()) {
            alert("Validation Error: Curriculum code is required.")
            return
        }

        setIsSubmitting(true)

        try {
            if (isEditing) {
                // Actualizar curriculum existente
                if (!curriculum?._id) {
                    alert("Error: Curriculum ID not found.")
                    return
                }

                const updates: {
                    name?: string
                    code?: string
                    description?: string
                    numberOfQuarters?: number
                    status?: "draft" | "active" | "archived" | "deprecated"
                } = {}

                // Solo incluir campos que han cambiado
                if (name.trim() !== curriculum.name) {
                    updates.name = name.trim()
                }

                if (code?.trim() !== curriculum.code) {
                    updates.code = code?.trim() || undefined
                }

                if (description?.trim() !== (curriculum.description || "")) {
                    updates.description = description?.trim() || undefined
                }

                const newQuarters = numberOfQuarters ? parseInt(numberOfQuarters) : 4
                if (newQuarters !== curriculum.numberOfQuarters) {
                    updates.numberOfQuarters = newQuarters
                }

                if (selectedStatus !== curriculum.status) {
                    updates.status = selectedStatus as "draft" | "active" | "archived" | "deprecated"
                }

                // Solo hacer la actualización si hay cambios
                if (Object.keys(updates).length > 0) {
                    await updateCurriculumMutation({
                        curriculumId: curriculum._id,
                        updates,
                        updatedBy: currentUser._id,
                    })

                    alert(`Success! Curriculum "${name}" has been updated successfully.`)
                    console.log("Curriculum updated:", curriculum._id)

                    // Cerrar el dialog automáticamente después del éxito
                    setIsOpen(false)

                    // Recargar la página para mostrar los cambios
                    router.refresh()
                } else {
                    alert("No changes detected.")
                    setIsSubmitting(false)
                    return
                }
            } else {
                // Crear curriculum
                const curriculumData: {
                    name: string
                    code?: string
                    description?: string
                    numberOfQuarters: number
                    createdBy: Id<"users">
                } = {
                    name: name.trim(),
                    code: code.trim(),
                    numberOfQuarters: numberOfQuarters ? parseInt(numberOfQuarters) : 4,
                    createdBy: currentUser._id,
                }

                // Descripción opcional
                if (description?.trim()) {
                    curriculumData.description = description.trim()
                }

                const curriculumId = await createCurriculumMutation(curriculumData)

                alert(`Success! Curriculum "${name}" has been created successfully.`)
                console.log("Curriculum created with ID:", curriculumId)

                // Resetear formulario
                form.reset()
                setSelectedStatus("draft")

                // Cerrar el dialog automáticamente después del éxito
                setIsOpen(false)

                // Recargar la página para mostrar el nuevo curriculum
                router.refresh()
            }
        } catch (error) {
            console.error("Error saving curriculum:", error)
            const errorMessage = error instanceof Error ? error.message : "Failed to save curriculum. Please try again."
            alert(`Error: ${errorMessage}`)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async () => {
        if (!curriculum) return

        if (window.confirm(`Are you sure you want to delete "${curriculum.name}"? This action cannot be undone.`)) {
            try {
                setIsSubmitting(true)
                await deleteCurriculumMutation({ curriculumId: curriculum._id })
                
                alert(`Success! Curriculum "${curriculum.name}" has been deleted.`)
                console.log("Curriculum deleted:", curriculum._id)

                // Cerrar el dialog
                setIsOpen(false)

                // Redirigir a la página de listado de curriculums con el locale correcto
                router.push(`/${locale}/admin/curriculums`)
                router.refresh()
            } catch (error) {
                console.error("Error deleting curriculum:", error)
                const errorMessage = error instanceof Error ? error.message : "Failed to delete curriculum. Please try again."
                alert(`Error: ${errorMessage}`)
            } finally {
                setIsSubmitting(false)
            }
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
            isSubmitting={isSubmitting}
            open={isOpen}
            onOpenChange={setIsOpen}
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

                {/* Number of Quarters */}
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
