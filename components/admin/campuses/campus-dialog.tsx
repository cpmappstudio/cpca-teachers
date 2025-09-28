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
import { Plus, Edit, ChevronDown, User, Upload, Trash2, ImageIcon } from "lucide-react"
import { useState, useRef } from "react"
import Image from "next/image"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { EntityDialog } from "@/components/ui/entity-dialog"
import { usStates, campusStatusOptions } from "@/lib/location-data"
import { getCitiesByState } from "@/lib/cities-data"

interface CampusDialogProps {
    campus?: Doc<"campuses">
    trigger?: React.ReactNode
}

export function CampusDialog({ campus, trigger }: CampusDialogProps) {
    const isEditing = !!campus

    const [selectedDirectorId, setSelectedDirectorId] = useState<Id<"users"> | undefined>(
        campus?.directorId || undefined
    )
    const [selectedState, setSelectedState] = useState<string>(
        campus?.address?.state || ""
    )
    const [selectedCity, setSelectedCity] = useState<string>(
        campus?.address?.city || ""
    )
    const [selectedStatus, setSelectedStatus] = useState<string>(
        campus?.status || "active"
    )
    const [selectedImage, setSelectedImage] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Query para obtener usuarios que pueden ser directores (admins y superadmins)
    const potentialDirectors = useQuery(api.admin.getPotentialDirectors)
    const selectedDirector = potentialDirectors?.find(director => director._id === selectedDirectorId)

    // Get available cities based on selected state
    const availableCities = getCitiesByState(selectedState)

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
        if (selectedDirectorId) {
            formData.set("directorId", selectedDirectorId)
        }
        formData.set("country", "United States") // Always US
        formData.set("state", selectedState)
        formData.set("city", selectedCity)
        formData.set("status", selectedStatus)

        // Añadir imagen si se seleccionó una nueva
        if (selectedImage) {
            formData.set("campusImage", selectedImage)
        }

        if (isEditing) {
            // TODO: Implement Convex mutation to update campus
            console.log("Updating campus with form data:", Object.fromEntries(formData))
        } else {
            // TODO: Implement Convex mutation to create campus
            console.log("Creating campus with form data:", Object.fromEntries(formData))
        }

        console.log("Selected Director ID:", selectedDirectorId)
        console.log("Selected State:", selectedState)
        console.log("Selected City:", selectedCity)
        console.log("Selected Status:", selectedStatus)
        console.log("Selected Image:", selectedImage?.name || "No image")
    }

    // Default triggers si no se proporciona uno custom
    const defaultTrigger = isEditing ? (
        <Button className="gap-2 cursor-pointer">
            <Edit className="h-4 w-4" />
            Edit campus
        </Button>
    ) : (
        <Button className="bg-sidebar-accent h-9 dark:text-white gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden md:inline">Add Campus</span>
        </Button>
    )

    return (
        <EntityDialog
            trigger={trigger || defaultTrigger}
            title={isEditing ? "Edit Campus" : "Create New Campus"}
            description={
                isEditing
                    ? "Make changes to the campus information. Click save when you're done."
                    : "Add a new campus to the system. Fill in the required information and click create."
            }
            onSubmit={handleSubmit}
            submitLabel={isEditing ? "Save changes" : "Create Campus"}
        >
            <div className="grid gap-6">
                {/* Hidden inputs para los valores seleccionados */}
                <input type="hidden" name="directorId" value={selectedDirectorId || ""} />
                <input type="hidden" name="country" value="United States" />
                <input type="hidden" name="state" value={selectedState} />
                <input type="hidden" name="city" value={selectedCity} />
                <input type="hidden" name="status" value={selectedStatus} />

                {/* Basic Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-3">
                        <Label htmlFor="name">
                            Campus Name {!isEditing && "*"}
                        </Label>
                        <Input
                            id="name"
                            name="name"
                            defaultValue={campus?.name || ""}
                            placeholder={isEditing ? "" : "e.g., Main Campus, North Campus"}
                            required
                        />
                    </div>
                    <div className="grid gap-3">
                        <Label htmlFor="code">Campus Code</Label>
                        <Input
                            id="code"
                            name="code"
                            defaultValue={campus?.code || ""}
                            placeholder="e.g., MAIN, NORTH, SOUTH"
                        />
                    </div>
                </div>

                {/* Description - solo para creación */}
                {!isEditing && (
                    <div className="grid gap-3">
                        <Label htmlFor="description">Description</Label>
                        <Input
                            id="description"
                            name="description"
                            placeholder="Brief description of the campus"
                        />
                    </div>
                )}

                {/* Campus Image */}
                <div className="space-y-4">
                    <h4 className="text-sm font-medium border-b pb-2">Campus Image</h4>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Image Preview */}
                        <div className="space-y-3">
                            <Label>{isEditing ? "Current Image" : "Preview"}</Label>
                            <AspectRatio ratio={1} className="bg-muted rounded-lg">
                                {imagePreview ? (
                                    <Image
                                        src={imagePreview}
                                        alt="Campus preview"
                                        fill
                                        className="h-full w-full rounded-lg object-cover"
                                    />
                                ) : campus?.campusImageStorageId ? (
                                    <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted">
                                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                        <span className="ml-2 text-sm text-muted-foreground">Current Image</span>
                                    </div>
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
                                    {isEditing ? "Upload New Image" : "Upload Campus Image"}
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    Choose a square image that represents your campus. Recommended size: 400x400px or larger.
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

                {/* Director Selection */}
                <div className="space-y-4">
                    <h4 className="text-sm font-medium border-b pb-2">Director Assignment</h4>
                    <div className="grid gap-3">
                        <Label>Campus Director</Label>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full justify-between">
                                    {selectedDirector ? (
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4" />
                                            <span className="font-medium">{selectedDirector.fullName}</span>
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground">Select a director</span>
                                    )}
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-80" align="start">
                                <DropdownMenuLabel>Available Directors</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {potentialDirectors?.length === 0 ? (
                                    <DropdownMenuItem disabled>
                                        No directors available
                                    </DropdownMenuItem>
                                ) : (
                                    <>
                                        <DropdownMenuItem
                                            onClick={() => setSelectedDirectorId(undefined)}
                                            className={!selectedDirectorId ? "bg-accent" : ""}
                                        >
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4" />
                                                <span>No director assigned</span>
                                            </div>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        {potentialDirectors?.map((director) => (
                                            <DropdownMenuItem
                                                key={director._id}
                                                onClick={() => setSelectedDirectorId(director._id)}
                                                className={selectedDirectorId === director._id ? "bg-accent" : ""}
                                            >
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <User className="h-4 w-4" />
                                                        <span className="font-medium">{director.fullName}</span>
                                                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                                            {director.role}
                                                        </span>
                                                    </div>
                                                    <span className="text-sm text-muted-foreground ml-6">
                                                        {director.email}
                                                    </span>
                                                </div>
                                            </DropdownMenuItem>
                                        ))}
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {potentialDirectors === undefined && (
                            <div className="text-sm text-muted-foreground">
                                Loading available directors...
                            </div>
                        )}
                    </div>
                </div>

                {/* Address */}
                <div className="space-y-4">
                    <h4 className="text-sm font-medium border-b pb-2">Address</h4>
                    <div className="grid gap-3">
                        <Label htmlFor="street">
                            {isEditing ? "Street" : "Street Address"}
                        </Label>
                        <Input
                            id="street"
                            name="street"
                            defaultValue={campus?.address?.street || ""}
                            placeholder={isEditing ? "" : "123 University Avenue"}
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="grid gap-3">
                            <Label htmlFor="city">City</Label>
                            <SelectDropdown
                                options={availableCities}
                                value={selectedCity}
                                onValueChange={(value) => setSelectedCity(value)}
                                placeholder={availableCities.length > 0 ? "Select city..." : "Select state first"}
                                label={availableCities.length > 0 ? "Available Cities" : undefined}
                                disabled={availableCities.length === 0}
                            />
                            {availableCities.length === 0 && selectedState && (
                                <p className="text-xs text-muted-foreground">
                                    No major cities available for selected state
                                </p>
                            )}
                        </div>
                        <div className="grid gap-3">
                            <Label htmlFor="state">
                                State {!isEditing && "*"}
                            </Label>
                            <SelectDropdown
                                options={usStates}
                                value={selectedState}
                                onValueChange={(value) => {
                                    setSelectedState(value)
                                    // Reset city when state changes
                                    setSelectedCity("")
                                }}
                                placeholder="Select state..."
                                label="US States"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="grid gap-3">
                            <Label htmlFor="zipCode">ZIP Code</Label>
                            <Input
                                id="zipCode"
                                name="zipCode"
                                defaultValue={campus?.address?.zipCode || ""}
                                placeholder={isEditing ? "" : "12345"}
                            />
                        </div>
                        <div className="grid gap-3">
                            <Label htmlFor="country">Country</Label>
                            <Input
                                id="country"
                                name="country"
                                value="United States"
                                disabled
                                className="bg-muted"
                            />
                        </div>
                    </div>
                </div>

                {/* Status */}
                <div className="space-y-4">
                    <h4 className="text-sm font-medium border-b pb-2">Status</h4>
                    <div className="grid gap-3">
                        <Label htmlFor="status">
                            Campus Status {!isEditing && "*"}
                        </Label>
                        <SelectDropdown
                            options={campusStatusOptions}
                            value={selectedStatus}
                            onValueChange={(value) => setSelectedStatus(value)}
                            placeholder="Select status..."
                            label="Campus Status Options"
                        />
                    </div>
                </div>
            </div>
        </EntityDialog>
    )
}