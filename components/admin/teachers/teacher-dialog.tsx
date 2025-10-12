"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { SelectDropdown } from "@/components/ui/select-dropdown"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Plus, Edit, ChevronDown, Upload, Trash2, ImageIcon, Building2, Loader2 } from "lucide-react"
import { useState, useRef } from "react"
import Image from "next/image"
import { useQuery, useMutation, useAction } from "convex/react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { toast } from "sonner"
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { EntityDialog } from "@/components/ui/entity-dialog"

interface TeacherDialogProps {
    teacher?: Doc<"users">
    trigger?: React.ReactNode
    defaultCampusId?: Id<"campuses">
}

export function TeacherDialog({ teacher, trigger, defaultCampusId }: TeacherDialogProps) {
    const isEditing = !!teacher
    const router = useRouter()
    const locale = useLocale()

    // Clerk user
    const { user: clerkUser } = useUser()

    // Get current Convex user
    const currentUser = useQuery(
        api.users.getCurrentUser,
        clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
    )

    // Mutations and Actions
    const createTeacherWithClerk = useAction(api.users.createTeacherWithClerk)
    const updateUserWithClerk = useAction(api.users.updateUserWithClerk)
    const deleteUserMutation = useMutation(api.users.deleteUser)
    const generateUploadUrl = useMutation(api.users.generateUploadUrl)
    const deleteUserAvatar = useMutation(api.users.deleteUserAvatar)

    // Dialog state
    const [isOpen, setIsOpen] = useState(false)
    const [showDeleteAlert, setShowDeleteAlert] = useState(false)

    // Loading state
    const [isSubmitting, setIsSubmitting] = useState(false)

    const [selectedCampusId, setSelectedCampusId] = useState<Id<"campuses"> | undefined>(
        teacher?.campusId || defaultCampusId || undefined
    )
    const [selectedStatus, setSelectedStatus] = useState<string>(
        teacher?.status || "active"
    )
    const [selectedImage, setSelectedImage] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [deleteExistingImage, setDeleteExistingImage] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Query available campuses
    const allCampuses = useQuery(api.campuses.getCampuses, {})
    const availableCampuses = allCampuses?.filter(campus => campus.status === "active")

    const selectedCampus = availableCampuses?.find(campus => campus._id === selectedCampusId)

    // Get existing avatar URL if editing
    const existingAvatarUrl = useQuery(
        api.users.getAvatarUrl,
        teacher?.avatarStorageId ? { storageId: teacher.avatarStorageId } : "skip"
    )

    // Teacher status options
    const teacherStatusOptions = [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
        { value: "on_leave", label: "On Leave" },
        { value: "terminated", label: "Terminated" }
    ]

    // Image handling functions
    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            setSelectedImage(file)
            setDeleteExistingImage(false) // Cancel deletion if uploading new image
            const reader = new FileReader()
            reader.onload = (e) => {
                setImagePreview(e.target?.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleImageRemove = () => {
        setSelectedImage(null)
        setImagePreview(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    const handleDeleteExistingImage = () => {
        setDeleteExistingImage(true)
        setSelectedImage(null)
        setImagePreview(null)
    }

    const triggerFileUpload = () => {
        fileInputRef.current?.click()
    }

    // Upload image to Convex storage
    const uploadImage = async (file: File): Promise<Id<"_storage"> | null> => {
        try {
            // Step 1: Get a short-lived upload URL
            const uploadUrl = await generateUploadUrl()

            // Step 2: POST the file to the upload URL
            const result = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            })

            if (!result.ok) {
                throw new Error(`Upload failed: ${result.statusText}`)
            }

            // Step 3: Get the storage ID from the response
            const { storageId } = await result.json()
            return storageId as Id<"_storage">
        } catch (error) {
            throw error
        }
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        event.stopPropagation() // Prevenir que el evento se propague al formulario padre

        // Guardar referencia al formulario ANTES de cualquier operación asíncrona
        const form = event.currentTarget

        // Validar que tengamos el usuario actual
        if (!currentUser?._id) {
            toast.error("User not authenticated", {
                description: "Please sign in again to continue.",
            })
            return
        }

        const formData = new FormData(form)

        // Obtener datos del formulario
        const firstName = formData.get("firstName") as string
        const lastName = formData.get("lastName") as string
        const email = formData.get("email") as string
        const phone = formData.get("phone") as string | null

        // Validación básica
        if (!firstName?.trim() || !lastName?.trim()) {
            toast.error("Validation Error", {
                description: "First name and last name are required.",
            })
            return
        }

        if (!email?.trim()) {
            toast.error("Validation Error", {
                description: "Email is required.",
            })
            return
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email.trim())) {
            toast.error("Validation Error", {
                description: "Please enter a valid email address.",
            })
            return
        }

        // Validar formato de teléfono si se proporciona
        if (phone?.trim()) {
            const phoneRegex = /^[\d\s\-\+\(\)]+$/
            if (!phoneRegex.test(phone.trim()) || phone.trim().length < 10) {
                toast.error("Validation Error", {
                    description: "Please enter a valid phone number (at least 10 digits).",
                })
                return
            }
        }

        setIsSubmitting(true)

        try {
            // Handle image deletion or replacement
            if (isEditing && teacher?._id && teacher?.avatarStorageId) {
                // Delete existing image if:
                // 1. User explicitly marked it for deletion, OR
                // 2. User is uploading a new image to replace it
                if (deleteExistingImage || selectedImage) {
                    await deleteUserAvatar({
                        userId: teacher._id,
                        updatedBy: currentUser._id,
                    })
                }
            }

            // Upload image first if a new one is selected
            let uploadedImageStorageId: Id<"_storage"> | null = null
            if (selectedImage) {
                uploadedImageStorageId = await uploadImage(selectedImage)
            }

            if (isEditing) {
                // Actualizar teacher existente
                if (!teacher?._id) {
                    toast.error("Error", {
                        description: "Teacher ID not found.",
                    })
                    return
                }

                const updates: {
                    firstName?: string
                    lastName?: string
                    email?: string
                    phone?: string
                    avatarStorageId?: Id<"_storage"> | null // Allow null to delete image
                    campusId?: Id<"campuses"> | null // Allow null/undefined to unassign campus
                    status?: "active" | "inactive" | "on_leave" | "terminated"
                } = {}

                // Include new image if uploaded
                if (uploadedImageStorageId) {
                    updates.avatarStorageId = uploadedImageStorageId
                }

                // Solo incluir campos que han cambiado
                if (firstName.trim() !== teacher.firstName) {
                    updates.firstName = firstName.trim()
                }

                if (lastName.trim() !== teacher.lastName) {
                    updates.lastName = lastName.trim()
                }

                if (email.trim() !== teacher.email) {
                    updates.email = email.trim()
                }

                if ((phone?.trim() || "") !== (teacher.phone || "")) {
                    updates.phone = phone?.trim() || undefined
                }

                // Handle campus assignment/unassignment
                // Check if campus has changed (including undefined to remove assignment)
                const campusChanged = selectedCampusId !== teacher.campusId;
                if (campusChanged) {
                    // If selectedCampusId is undefined, we want to unassign the campus
                    // Use null to explicitly remove the campus assignment
                    updates.campusId = selectedCampusId === undefined ? null : selectedCampusId;
                }

                if (selectedStatus !== teacher.status) {
                    updates.status = selectedStatus as "active" | "inactive" | "on_leave" | "terminated"
                }

                // Handle image deletion
                if (deleteExistingImage && teacher.avatarStorageId) {
                    updates.avatarStorageId = null
                }

                // Solo hacer la actualización si hay cambios
                const hasChanges = Object.keys(updates).length > 0

                if (hasChanges) {
                    await updateUserWithClerk({
                        userId: teacher._id,
                        updates: updates as any, // Type assertion needed until Convex regenerates types
                    })

                    toast.success("Teacher updated successfully", {
                        description: `"${firstName} ${lastName}" has been updated successfully.`,
                    })                    // Reset states
                    setDeleteExistingImage(false)
                    setSelectedImage(null)
                    setImagePreview(null)

                    // Cerrar el dialog automáticamente después del éxito
                    setIsOpen(false)

                    // Recargar la página para mostrar los cambios
                    router.refresh()
                } else {
                    toast.info("No changes detected", {
                        description: "Please make changes before updating.",
                    })
                    setIsSubmitting(false)
                    return
                }
            } else {
                // Crear teacher en Clerk y Convex
                const teacherData = {
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    email: email.trim(),
                    phone: phone?.trim(),
                    avatarStorageId: uploadedImageStorageId || undefined,
                    campusId: selectedCampusId,
                    status: selectedStatus as "active" | "inactive" | "on_leave" | "terminated" | undefined,
                }

                const result = await createTeacherWithClerk(teacherData)

                toast.success("Teacher created successfully", {
                    description: `"${firstName} ${lastName}" has been created successfully.`,
                })

                // Resetear formulario
                form.reset()
                // Mantener el campus preseleccionado si se pasó como defaultCampusId
                setSelectedCampusId(defaultCampusId || undefined)
                setSelectedStatus("active")
                setSelectedImage(null)
                setImagePreview(null)
                setDeleteExistingImage(false)

                // Cerrar el dialog automáticamente después del éxito
                setIsOpen(false)

                // Recargar la página para mostrar el nuevo teacher
                router.refresh()
            }
        } catch (error) {
            // Proporcionar mensajes de error más específicos
            let errorMessage = "Failed to save teacher. Please try again."

            if (error instanceof Error) {
                if (error.message.includes("duplicate") || error.message.includes("unique")) {
                    errorMessage = "A teacher with this email already exists."
                } else if (error.message.includes("permission") || error.message.includes("unauthorized")) {
                    errorMessage = "You don't have permission to perform this action."
                } else if (error.message.includes("network") || error.message.includes("fetch")) {
                    errorMessage = "Network error. Please check your connection."
                } else {
                    errorMessage = error.message
                }
            }

            toast.error("Error saving teacher", {
                description: errorMessage,
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async () => {
        if (!teacher) return

        try {
            setIsSubmitting(true)
            await deleteUserMutation({ userId: teacher._id })

            toast.success("Teacher deleted successfully", {
                description: `"${teacher.fullName}" has been deleted.`,
            })

            // Reset states
            setDeleteExistingImage(false)
            setSelectedImage(null)
            setImagePreview(null)

            // Cerrar el dialog
            setIsOpen(false)
            setShowDeleteAlert(false)

            // Redirigir a la página de listado de teachers con el locale correcto
            router.push(`/${locale}/admin/teachers`)
            router.refresh()
        } catch (error) {
            let errorMessage = "Failed to delete teacher. Please try again."

            if (error instanceof Error) {
                if (error.message.includes("permission") || error.message.includes("unauthorized")) {
                    errorMessage = "You don't have permission to delete this teacher."
                } else if (error.message.includes("not found")) {
                    errorMessage = "Teacher not found. It may have been already deleted."
                } else {
                    errorMessage = error.message
                }
            }

            toast.error("Error deleting teacher", {
                description: errorMessage,
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    // Default triggers si no se proporciona uno custom
    const defaultTrigger = isEditing ? (
        <Button className="gap-2 cursor-pointer">
            <Edit className="h-4 w-4" />
            Edit teacher
        </Button>
    ) : (
        <Button className="bg-sidebar-accent h-9 dark:text-white gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden md:inline">Add Teacher</span>
        </Button>
    )

    return (
        <>
            <EntityDialog
                trigger={trigger || defaultTrigger}
                title={isEditing ? "Edit Teacher" : "Create New Teacher"}
                onSubmit={handleSubmit}
                submitLabel={isEditing ? "Save changes" : "Create Teacher"}
                isSubmitting={isSubmitting}
                open={isOpen}
                onOpenChange={setIsOpen}
                leftActions={isEditing ? (
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={() => setShowDeleteAlert(true)}
                        className="gap-2 min-w-[120px] whitespace-nowrap"
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete Teacher
                    </Button>
                ) : undefined}
            >
                <div className="grid gap-6">
                    {/* Hidden inputs para los valores seleccionados */}
                    <input type="hidden" name="campusId" value={selectedCampusId || ""} />
                    <input type="hidden" name="status" value={selectedStatus} />
                    <input type="hidden" name="role" value="teacher" />

                    {/* Basic Information */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="grid gap-3">
                            <Label htmlFor="firstName">
                                First Name {!isEditing && "*"}
                            </Label>
                            <Input
                                id="firstName"
                                name="firstName"
                                defaultValue={teacher?.firstName || ""}
                                placeholder={isEditing ? "" : "e.g., John, María"}
                                required
                            />
                        </div>
                        <div className="grid gap-3">
                            <Label htmlFor="lastName">
                                Last Name {!isEditing && "*"}
                            </Label>
                            <Input
                                id="lastName"
                                name="lastName"
                                defaultValue={teacher?.lastName || ""}
                                placeholder={isEditing ? "" : "e.g., Smith, García"}
                                required
                            />
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="grid gap-3">
                            <Label htmlFor="email">
                                Email {!isEditing && "*"}
                            </Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                defaultValue={teacher?.email || ""}
                                placeholder={isEditing ? "" : "e.g., john.smith@alefuniversity.edu"}
                                required
                            />
                        </div>
                        <div className="grid gap-3">
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                name="phone"
                                type="tel"
                                defaultValue={teacher?.phone || ""}
                                placeholder={isEditing ? "" : "e.g., +1 (555) 123-4567"}
                            />
                        </div>
                    </div>

                    {/* Role - Disabled for teachers */}
                    <div className="grid gap-3">
                        <Label htmlFor="role">Role</Label>
                        <Input
                            id="role"
                            name="role"
                            value="Teacher"
                            disabled
                            className="bg-muted"
                        />
                        <p className="text-sm text-muted-foreground">
                            The role is assigned when the user is created
                        </p>
                    </div>

                    {/* Teacher Image */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium border-b pb-2">Teacher Image</h4>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Image Preview */}
                            <div className="space-y-3">
                                <Label>{isEditing ? "Current Image" : "Preview"}</Label>
                                <AspectRatio ratio={1} className="bg-muted rounded-lg">
                                    {imagePreview ? (
                                        <Image
                                            src={imagePreview}
                                            alt="Teacher preview"
                                            fill
                                            className="h-full w-full rounded-lg object-cover"
                                        />
                                    ) : existingAvatarUrl && !deleteExistingImage ? (
                                        <Image
                                            src={existingAvatarUrl}
                                            alt="Current teacher avatar"
                                            fill
                                            className="h-full w-full rounded-lg object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted">
                                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                            <span className="ml-2 text-sm text-muted-foreground">No Image</span>
                                        </div>
                                    )}
                                </AspectRatio>
                            </div>

                            {/* Upload Controls */}
                            <div className="space-y-4 lg:col-span-2">
                                <div className="space-y-3">
                                    <Label>
                                        {isEditing ? "Upload New Image" : "Upload Teacher Image"}
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Choose a square image that represents the teacher. Recommended size: 400x400px or larger.
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={triggerFileUpload}
                                        className="gap-2"
                                    >
                                        <Upload className="h-4 w-4" />
                                        Upload Image
                                    </Button>

                                    {(selectedImage || imagePreview) && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleImageRemove}
                                            className="gap-2 text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Remove
                                        </Button>
                                    )}

                                    {existingAvatarUrl && !deleteExistingImage && !imagePreview && isEditing && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleDeleteExistingImage}
                                            className="gap-2 text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete Current Image
                                        </Button>
                                    )}
                                </div>

                                {selectedImage && (
                                    <div className="text-sm text-muted-foreground">
                                        Selected: {selectedImage.name} ({Math.round(selectedImage.size / 1024)}KB)
                                    </div>
                                )}

                                {/* Hidden file input */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Campus Assignment */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium border-b pb-2">Campus Assignment</h4>
                        <div className="grid gap-3">
                            <Label>Assigned Campus</Label>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full justify-between">
                                        {selectedCampus ? (
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-4 w-4" />
                                                <span className="font-medium">{selectedCampus.name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">Select a campus</span>
                                        )}
                                        <ChevronDown className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-80" align="start">
                                    <DropdownMenuLabel>Available Campuses</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {!availableCampuses || availableCampuses.length === 0 ? (
                                        <DropdownMenuItem disabled>
                                            No campuses available
                                        </DropdownMenuItem>
                                    ) : (
                                        <>
                                            <DropdownMenuItem
                                                onClick={() => setSelectedCampusId(undefined)}
                                                className={!selectedCampusId ? "bg-accent" : ""}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-4 w-4" />
                                                    <span>No campus assigned</span>
                                                </div>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            {availableCampuses.map((campus) => (
                                                <DropdownMenuItem
                                                    key={campus._id}
                                                    onClick={() => setSelectedCampusId(campus._id)}
                                                    className={selectedCampusId === campus._id ? "bg-accent" : ""}
                                                >
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2">
                                                            <Building2 className="h-4 w-4" />
                                                            <span className="font-medium">{campus.name}</span>
                                                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                                                {campus.status}
                                                            </span>
                                                        </div>
                                                        {campus.address?.city && campus.address?.state && (
                                                            <span className="text-sm text-muted-foreground ml-6">
                                                                {campus.address.city}, {campus.address.state}
                                                            </span>
                                                        )}
                                                    </div>
                                                </DropdownMenuItem>
                                            ))}
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            {availableCampuses === undefined ? (
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Loading campuses...
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground">
                                    {availableCampuses.length} campus(es) available
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Status */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium border-b pb-2">Status</h4>
                        <div className="grid gap-3">
                            <Label htmlFor="status">
                                Teacher Status {!isEditing && "*"}
                            </Label>
                            <SelectDropdown
                                options={teacherStatusOptions}
                                value={selectedStatus}
                                onValueChange={(value) => setSelectedStatus(value)}
                                placeholder="Select status..."
                                label="Teacher Status Options"
                            />
                        </div>
                    </div>
                </div>
            </EntityDialog>

            <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the teacher
                            &quot;{teacher?.fullName}&quot; and remove all associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive !text-white text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete Teacher
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}