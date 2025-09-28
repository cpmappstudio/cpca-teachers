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
import { SelectDropdown } from "@/components/ui/select-dropdown"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Plus, Edit, ChevronDown, User, Upload, Trash2, ImageIcon, Building2 } from "lucide-react"
import { useState, useRef } from "react"
import Image from "next/image"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { EntityDialog } from "@/components/ui/entity-dialog"

interface TeacherDialogProps {
    teacher?: Doc<"users">
    trigger?: React.ReactNode
}

const teacherStatusOptions = [
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
    { label: "On Leave", value: "on_leave" },
    { label: "Terminated", value: "terminated" },
]

export function TeacherDialog({ teacher, trigger }: TeacherDialogProps) {
    const isEditing = !!teacher

    const [selectedCampusId, setSelectedCampusId] = useState<Id<"campuses"> | undefined>(
        teacher?.campusId || undefined
    )
    const [selectedStatus, setSelectedStatus] = useState<string>(
        teacher?.status || "active"
    )
    const [selectedImage, setSelectedImage] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Query para obtener campuses disponibles
    const campuses = useQuery(api.admin.getCampuses) // Assuming this query exists
    const selectedCampus = campuses?.find(campus => campus._id === selectedCampusId)

    // Image handling functions
    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            setSelectedImage(file)
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

    const triggerFileUpload = () => {
        fileInputRef.current?.click()
    }

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)

        // Añadir los valores seleccionados al formData
        if (selectedCampusId) {
            formData.set("campusId", selectedCampusId)
        }
        formData.set("status", selectedStatus)
        formData.set("role", "teacher") // Always teacher

        // Añadir imagen si se seleccionó una nueva
        if (selectedImage) {
            formData.set("avatarImage", selectedImage)
        }

        if (isEditing) {
            // TODO: Implement Convex mutation to update teacher
            console.log("Updating teacher with form data:", Object.fromEntries(formData))
        } else {
            // TODO: Implement Convex mutation to create teacher
            console.log("Creating teacher with form data:", Object.fromEntries(formData))
        }

        console.log("Selected Campus ID:", selectedCampusId)
        console.log("Selected Status:", selectedStatus)
        console.log("Selected Image:", selectedImage?.name || "No image")
    }

    const handleDelete = () => {
        if (teacher && window.confirm(`Are you sure you want to delete "${teacher.fullName}"? This action cannot be undone.`)) {
            // TODO: Implement Convex mutation to delete teacher
            console.log("Deleting teacher:", teacher._id)
            alert("Teacher deletion would be implemented here")
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
        <EntityDialog
            trigger={trigger || defaultTrigger}
            title={isEditing ? "Edit Teacher" : "Create New Teacher"}
            description={
                isEditing
                    ? "Make changes to the teacher information. Click save when you're done."
                    : "Add a new teacher to the system. Fill in the required information and click create."
            }
            onSubmit={handleSubmit}
            submitLabel={isEditing ? "Save changes" : "Create Teacher"}
            leftActions={isEditing ? (
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleDelete}
                    className="gap-2 bg-rose-100 text-rose-800 hover:bg-rose-200 border-rose-200 dark:bg-rose-900/20 dark:text-rose-200 min-w-[120px] whitespace-nowrap"
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
                            placeholder={isEditing ? "" : "John"}
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
                            placeholder={isEditing ? "" : "Doe"}
                            required
                        />
                    </div>
                </div>

                <div className="grid gap-3">
                    <Label htmlFor="email">
                        Email {!isEditing && "*"}
                    </Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        defaultValue={teacher?.email || ""}
                        placeholder={isEditing ? "" : "john.doe@alefuniversity.edu"}
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
                        placeholder={isEditing ? "" : "+1 (555) 123-4567"}
                    />
                </div>

                {/* Profile Image */}
                <div className="space-y-4">
                    <h4 className="text-sm font-medium border-b pb-2">Profile Image</h4>
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
                                ) : teacher?.avatarStorageId ? (
                                    <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted">
                                        <User className="h-8 w-8 text-muted-foreground" />
                                        <span className="ml-2 text-sm text-muted-foreground">Current Image</span>
                                    </div>
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted">
                                        <User className="h-8 w-8 text-muted-foreground" />
                                        <span className="ml-2 text-sm text-muted-foreground">No Image</span>
                                    </div>
                                )}
                            </AspectRatio>
                        </div>

                        {/* Upload Controls */}
                        <div className="space-y-4 lg:col-span-2">
                            <div className="space-y-3">
                                <Label>
                                    {isEditing ? "Upload New Image" : "Upload Profile Image"}
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    Choose a square profile image. Recommended size: 400x400px or larger.
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
                                {campuses?.length === 0 ? (
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
                                        {campuses?.map((campus) => (
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
                                                    {campus.address && (
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
                        {campuses === undefined && (
                            <div className="text-sm text-muted-foreground">
                                Loading available campuses...
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
    )
}