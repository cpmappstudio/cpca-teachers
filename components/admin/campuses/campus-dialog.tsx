"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SelectDropdown } from "@/components/ui/select-dropdown";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  Plus,
  Edit,
  ChevronDown,
  User,
  Upload,
  Trash2,
  ImageIcon,
  Loader2,
} from "lucide-react";
import { useState, useRef } from "react";
import Image from "next/image";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { EntityDialog } from "@/components/ui/entity-dialog";
import { usStates, campusStatusOptions } from "@/lib/location-data";
import { getCitiesByState } from "@/lib/cities-data";

interface CampusDialogProps {
  campus?: Doc<"campuses">;
  trigger?: React.ReactNode;
}

export function CampusDialog({ campus, trigger }: CampusDialogProps) {
  const isEditing = !!campus;
  const router = useRouter();
  const locale = useLocale();

  // Clerk user
  const { user: clerkUser } = useUser();

  // Get current Convex user
  const currentUser = useQuery(
    api.users.getCurrentUser,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip",
  );

  // Mutations
  const createCampusMutation = useMutation(api.campuses.createCampus);
  const updateCampusMutation = useMutation(api.campuses.updateCampus);
  const deleteCampusMutation = useMutation(api.campuses.deleteCampus);
  const generateUploadUrl = useMutation(api.campuses.generateUploadUrl);
  const saveCampusImage = useMutation(api.campuses.saveCampusImage);

  // Dialog state
  const [isOpen, setIsOpen] = useState(false);

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedDirectorId, setSelectedDirectorId] = useState<
    Id<"users"> | undefined
  >(campus?.directorId || undefined);
  const [selectedState, setSelectedState] = useState<string>(
    campus?.address?.state || "",
  );
  const [selectedCity, setSelectedCity] = useState<string>(
    campus?.address?.city || "",
  );
  const [selectedStatus, setSelectedStatus] = useState<string>(
    campus?.status || "",
  );
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Query para obtener usuarios que pueden ser directores (admins y superadmins)
  const potentialDirectors = useQuery(api.admin.getPotentialDirectors);
  const selectedDirector = potentialDirectors?.find(
    (director) => director._id === selectedDirectorId,
  );

  // Get existing campus image URL if editing
  const existingImageUrl = useQuery(
    api.campuses.getImageUrl,
    campus?.campusImageStorageId ? { storageId: campus.campusImageStorageId } : "skip"
  );

  // Get available cities based on selected state
  const availableCities = getCitiesByState(selectedState);

  // Image handling functions
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageRemove = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  // Upload image to Convex storage
  const uploadImage = async (file: File): Promise<Id<"_storage"> | null> => {
    try {
      // Step 1: Get a short-lived upload URL
      const uploadUrl = await generateUploadUrl();

      // Step 2: POST the file to the upload URL
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error(`Upload failed: ${result.statusText}`);
      }

      // Step 3: Get the storage ID from the response
      const { storageId } = await result.json();
      return storageId as Id<"_storage">;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Guardar referencia al formulario ANTES de cualquier operación asíncrona
    // Esto es necesario porque React recicla el SyntheticEvent después del await
    const form = event.currentTarget;

    // Validar que tengamos el usuario actual
    if (!currentUser?._id) {
      alert("Error: User not authenticated. Please sign in again.");
      return;
    }

    const formData = new FormData(form);

    // Obtener datos del formulario
    const name = formData.get("name") as string;
    const code = formData.get("code") as string | null;
    const street = formData.get("street") as string | null;
    const zipCode = formData.get("zipCode") as string | null;

    // Validación básica
    if (!name?.trim()) {
      alert("Validation Error: Campus name is required.");
      return;
    }

    if (!isEditing && !selectedStatus) {
      alert("Validation Error: Campus status is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload image first if a new one is selected
      let uploadedImageStorageId: Id<"_storage"> | null = null;
      if (selectedImage) {
        uploadedImageStorageId = await uploadImage(selectedImage);
      }

      if (isEditing) {
        // Actualizar campus existente
        if (!campus?._id) {
          alert("Error: Campus ID not found.");
          return;
        }

        const updates: {
          name?: string;
          code?: string;
          campusImageStorageId?: Id<"_storage">;
          directorId?: Id<"users">;
          directorName?: string;
          directorEmail?: string;
          directorPhone?: string;
          address?: {
            street?: string;
            city?: string;
            state?: string;
            zipCode?: string;
            country?: string;
          };
          status?: "active" | "inactive" | "maintenance";
        } = {};

        // Include new image if uploaded
        if (uploadedImageStorageId) {
          updates.campusImageStorageId = uploadedImageStorageId;
        }

        // Solo incluir campos que han cambiado
        if (name.trim() !== campus.name) {
          updates.name = name.trim();
        }

        // Code is not editable - skip update
        // if (code?.trim() !== campus.code) {
        //   updates.code = code?.trim() || undefined;
        // }

        if (selectedDirectorId !== campus.directorId) {
          const director = potentialDirectors?.find(
            (d) => d._id === selectedDirectorId,
          );
          updates.directorId = selectedDirectorId;
          if (director) {
            updates.directorName = director.fullName;
            updates.directorEmail = director.email;
          }
        }

        if (selectedStatus !== campus.status) {
          updates.status = selectedStatus as
            | "active"
            | "inactive"
            | "maintenance";
        }

        // Actualizar address si hay cambios
        const currentAddress = campus.address || {};
        const newAddress: {
          street?: string;
          city?: string;
          state?: string;
          zipCode?: string;
          country?: string;
        } = {};

        let addressChanged = false;

        if ((street?.trim() || "") !== (currentAddress.street || "")) {
          newAddress.street = street?.trim() || undefined;
          addressChanged = true;
        }
        if (selectedCity !== (currentAddress.city || "")) {
          newAddress.city = selectedCity || undefined;
          addressChanged = true;
        }
        if (selectedState !== (currentAddress.state || "")) {
          newAddress.state = selectedState || undefined;
          addressChanged = true;
        }
        if ((zipCode?.trim() || "") !== (currentAddress.zipCode || "")) {
          newAddress.zipCode = zipCode?.trim() || undefined;
          addressChanged = true;
        }

        if (addressChanged) {
          updates.address = {
            ...newAddress,
            country: "United States",
          };
        }

        // Solo hacer la actualización si hay cambios
        if (Object.keys(updates).length > 0) {
          await updateCampusMutation({
            campusId: campus._id,
            updates,
            updatedBy: currentUser._id,
          });

          alert(`Success! Campus "${name}" has been updated successfully.`);
          console.log("Campus updated:", campus._id);

          // Cerrar el dialog automáticamente después del éxito
          setIsOpen(false);

          // Recargar la página para mostrar los cambios
          router.refresh();
        } else {
          alert("No changes detected.");
          setIsSubmitting(false);
          return;
        }
      } else {
        // Crear campus
        const campusData: {
          name: string;
          createdBy: Id<"users">;
          code?: string;
          campusImageStorageId?: Id<"_storage">;
          directorId?: Id<"users">;
          directorName?: string;
          directorEmail?: string;
          directorPhone?: string;
          address?: {
            street?: string;
            city?: string;
            state?: string;
            zipCode?: string;
            country?: string;
          };
        } = {
          name: name.trim(),
          createdBy: currentUser._id,
        };

        // Include uploaded image if available
        if (uploadedImageStorageId) {
          campusData.campusImageStorageId = uploadedImageStorageId;
        }

        // Campos opcionales
        if (code?.trim()) {
          campusData.code = code.trim();
        }

        if (selectedDirectorId) {
          const director = potentialDirectors?.find(
            (d) => d._id === selectedDirectorId,
          );
          campusData.directorId = selectedDirectorId;
          if (director) {
            campusData.directorName = director.fullName;
            campusData.directorEmail = director.email;
            // Note: phoneNumber not available from getPotentialDirectors query
          }
        }

        // Address (solo si hay al menos un campo)
        if (
          street?.trim() ||
          selectedCity ||
          selectedState ||
          zipCode?.trim()
        ) {
          campusData.address = {
            street: street?.trim() || undefined,
            city: selectedCity || undefined,
            state: selectedState || undefined,
            zipCode: zipCode?.trim() || undefined,
            country: "United States",
          };
        }

        const campusId = await createCampusMutation(campusData);

        alert(`Success! Campus "${name}" has been created successfully.`);
        console.log("Campus created with ID:", campusId);

        // Resetear formulario usando la referencia guardada
        // Ahora usamos 'form' en lugar de 'event.currentTarget'
        form.reset();
        setSelectedDirectorId(undefined);
        setSelectedState("");
        setSelectedCity("");
        setSelectedImage(null);
        setImagePreview(null);

        // Cerrar el dialog automáticamente después del éxito
        setIsOpen(false);

        // Recargar la página para mostrar el nuevo campus
        // Usamos router.refresh() para refrescar los datos del servidor
        router.refresh();
      }
    } catch (error) {
      console.error("Error saving campus:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to save campus. Please try again.";
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!campus) return;

    if (
      window.confirm(
        `Are you sure you want to delete "${campus.name}"? This action cannot be undone.`,
      )
    ) {
      try {
        setIsSubmitting(true);
        await deleteCampusMutation({ campusId: campus._id });

        alert(`Success! Campus "${campus.name}" has been deleted.`);
        console.log("Campus deleted:", campus._id);

        // Cerrar el dialog
        setIsOpen(false);

        // Redirigir a la página de listado de campuses con el locale correcto
        router.push(`/${locale}/admin/campuses`);
        router.refresh();
      } catch (error) {
        console.error("Error deleting campus:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to delete campus. Please try again.";
        alert(`Error: ${errorMessage}`);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

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
  );

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
      isSubmitting={isSubmitting}
      open={isOpen}
      onOpenChange={setIsOpen}
      leftActions={
        isEditing ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            className="gap-2 bg-rose-100 text-rose-800 hover:bg-rose-200 border-rose-200 dark:bg-rose-900/20 dark:text-rose-200 min-w-[120px] whitespace-nowrap"
          >
            <Trash2 className="h-4 w-4" />
            Delete Campus
          </Button>
        ) : undefined
      }
    >
      <div className="grid gap-6">
        {/* Hidden inputs para los valores seleccionados */}
        <input
          type="hidden"
          name="directorId"
          value={selectedDirectorId || ""}
        />
        <input type="hidden" name="country" value="United States" />
        <input type="hidden" name="state" value={selectedState} />
        <input type="hidden" name="city" value={selectedCity} />
        <input type="hidden" name="status" value={selectedStatus} />

        {/* Basic Information */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium border-b pb-2">
            Basic Information
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-3">
              <Label htmlFor="name">
                Name
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={campus?.name || ""}
                placeholder={isEditing ? "" : "Enter campus name"}
                required
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                name="code"
                defaultValue={campus?.code || ""}
                placeholder="Enter campus code"
                disabled={isEditing}
                className={isEditing ? "bg-muted cursor-not-allowed" : ""}
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="status">
                Status
                <span className="text-red-500">*</span>
              </Label>
              <SelectDropdown
                options={campusStatusOptions}
                value={selectedStatus}
                onValueChange={(value) => setSelectedStatus(value)}
                placeholder="Select status..."
                label="Status Options"
              />
            </div>
            <div className="grid gap-3">
              <Label>Director</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {selectedDirector ? (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="font-medium">
                          {selectedDirector.fullName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        Select a director
                      </span>
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
                          className={
                            selectedDirectorId === director._id
                              ? "bg-accent"
                              : ""
                          }
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span className="font-medium">
                                {director.fullName}
                              </span>
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
        </div>

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
                ) : existingImageUrl ? (
                  <Image
                    src={existingImageUrl}
                    alt="Current campus image"
                    fill
                    className="h-full w-full rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">
                      No Image
                    </span>
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
                  Choose a square image that represents your campus. Recommended
                  size: 400x400px or larger.
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
                  Selected: {selectedImage.name} (
                  {Math.round(selectedImage.size / 1024)}KB)
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

        {/* Address */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium border-b pb-2">Address</h4>
          <div className="grid gap-4">
            {/* Country - First */}
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

            {/* State and City - Second row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-3">
                <Label htmlFor="state">
                  State
                </Label>
                <SelectDropdown
                  options={usStates}
                  value={selectedState}
                  onValueChange={(value) => {
                    setSelectedState(value);
                    // Reset city when state changes
                    setSelectedCity("");
                  }}
                  placeholder="Select state..."
                  label="US States"
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="city">City</Label>
                <SelectDropdown
                  options={availableCities}
                  value={selectedCity}
                  onValueChange={(value) => setSelectedCity(value)}
                  placeholder={
                    availableCities.length > 0
                      ? "Select city..."
                      : "Select state first"
                  }
                  label={
                    availableCities.length > 0 ? "Available Cities" : undefined
                  }
                  disabled={availableCities.length === 0}
                />
                {availableCities.length === 0 && selectedState && (
                  <p className="text-xs text-muted-foreground">
                    No major cities available for selected state
                  </p>
                )}
              </div>
            </div>

            {/* Street - Third row */}
            <div className="grid gap-3">
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                name="street"
                defaultValue={campus?.address?.street || ""}
                placeholder={isEditing ? "" : "Enter street adress"}
              />
            </div>

            {/* ZIP Code - Fourth row */}
            <div className="grid gap-3">
              <Label htmlFor="zipCode">ZIP Code</Label>
              <Input
                id="zipCode"
                name="zipCode"
                defaultValue={campus?.address?.zipCode || ""}
                placeholder={isEditing ? "" : "Enter ZIP code"}
              />
            </div>
          </div>
        </div>
      </div>
    </EntityDialog>
  );
}
