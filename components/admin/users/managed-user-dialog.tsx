"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useUser } from "@clerk/nextjs";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EntityDialog } from "@/components/ui/entity-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectDropdown } from "@/components/ui/select-dropdown";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import {
  Building2,
  ChevronDown,
  Edit,
  ImageIcon,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

type ManagedUserRole = "teacher" | "principal";

interface ManagedUserDialogProps {
  user?: Doc<"users">;
  role: ManagedUserRole;
  trigger?: ReactNode;
  defaultCampusId?: Id<"campuses">;
}

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "on_leave", label: "On Leave" },
  { value: "terminated", label: "Terminated" },
] as const;

const roleConfig = {
  teacher: {
    singular: "Teacher",
    plural: "teachers",
    showCampusAssignment: true,
  },
  principal: {
    singular: "Principal",
    plural: "principals",
    showCampusAssignment: false,
  },
} as const;

export function ManagedUserDialog({
  user,
  role,
  trigger,
  defaultCampusId,
}: ManagedUserDialogProps) {
  const config = roleConfig[role];
  const entityName = config.singular;
  const entityNameLower = entityName.toLowerCase();
  const isEditing = !!user;
  const router = useRouter();
  const locale = useLocale();
  const { user: clerkUser } = useUser();

  const currentUser = useQuery(
    api.users.getCurrentUser,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip",
  );
  const allCampuses = useQuery(
    api.campuses.getCampuses,
    config.showCampusAssignment ? {} : "skip",
  );
  const existingAvatarUrl = useQuery(
    api.users.getAvatarUrl,
    user?.avatarStorageId ? { storageId: user.avatarStorageId } : "skip",
  );

  const createUserWithClerk = useAction(api.users.createUserWithClerk);
  const updateUserWithClerk = useAction(api.users.updateUserWithClerk);
  const deleteUserWithClerk = useAction(api.users.deleteUserWithClerk);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const deleteUserAvatar = useMutation(api.users.deleteUserAvatar);

  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCampusId, setSelectedCampusId] = useState<
    Id<"campuses"> | undefined
  >(user?.campusId || defaultCampusId || undefined);
  const [selectedStatus, setSelectedStatus] = useState<string>(
    user?.status || "active",
  );
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [deleteExistingImage, setDeleteExistingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableCampuses = allCampuses?.filter(
    (campus) => campus.status === "active",
  );
  const selectedCampus = availableCampuses?.find(
    (campus) => campus._id === selectedCampusId,
  );

  const uploadImage = async (file: File): Promise<Id<"_storage"> | null> => {
    const uploadUrl = await generateUploadUrl();
    const result = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!result.ok) {
      throw new Error(`Upload failed: ${result.statusText}`);
    }

    const { storageId } = await result.json();
    return storageId as Id<"_storage">;
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedImage(file);
    setDeleteExistingImage(false);

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setImagePreview(loadEvent.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageRemove = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resetImageState = () => {
    setDeleteExistingImage(false);
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resetFormState = (form: HTMLFormElement) => {
    form.reset();
    setSelectedCampusId(
      config.showCampusAssignment ? defaultCampusId || undefined : undefined,
    );
    setSelectedStatus("active");
    resetImageState();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const form = event.currentTarget;

    if (!currentUser?._id) {
      toast.error("User not authenticated", {
        description: "Please sign in again to continue.",
      });
      return;
    }

    const formData = new FormData(form);
    const firstName = (formData.get("firstName") as string)?.trim();
    const lastName = (formData.get("lastName") as string)?.trim();
    const email = (formData.get("email") as string)?.trim();
    const phone = (formData.get("phone") as string | null)?.trim() || undefined;

    if (!firstName || !lastName) {
      toast.error("Validation Error", {
        description: "First name and last name are required.",
      });
      return;
    }

    if (!email) {
      toast.error("Validation Error", {
        description: "Email is required.",
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Validation Error", {
        description: "Please enter a valid email address.",
      });
      return;
    }

    if (phone && (!/^[\d\s\-+()]+$/.test(phone) || phone.length < 10)) {
      toast.error("Validation Error", {
        description: "Please enter a valid phone number (at least 10 digits).",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (
        isEditing &&
        user?.avatarStorageId &&
        (deleteExistingImage || selectedImage)
      ) {
        await deleteUserAvatar({
          userId: user._id,
          updatedBy: currentUser._id,
        });
      }

      let uploadedImageStorageId: Id<"_storage"> | null = null;
      if (selectedImage) {
        uploadedImageStorageId = await uploadImage(selectedImage);
      }

      if (isEditing) {
        if (!user?._id) {
          throw new Error(`${entityName} ID not found.`);
        }

        const updates: {
          firstName?: string;
          lastName?: string;
          email?: string;
          phone?: string;
          avatarStorageId?: Id<"_storage"> | null;
          campusId?: Id<"campuses"> | null;
          status?: "active" | "inactive" | "on_leave" | "terminated";
        } = {};

        if (uploadedImageStorageId) {
          updates.avatarStorageId = uploadedImageStorageId;
        }

        if (firstName !== user.firstName) {
          updates.firstName = firstName;
        }
        if (lastName !== user.lastName) {
          updates.lastName = lastName;
        }
        if (email !== user.email) {
          updates.email = email;
        }
        if ((phone || "") !== (user.phone || "")) {
          updates.phone = phone;
        }
        if (config.showCampusAssignment && selectedCampusId !== user.campusId) {
          updates.campusId = selectedCampusId || null;
        }
        if (selectedStatus !== user.status) {
          updates.status = selectedStatus as
            | "active"
            | "inactive"
            | "on_leave"
            | "terminated";
        }
        if (deleteExistingImage && user.avatarStorageId) {
          updates.avatarStorageId = null;
        }

        if (Object.keys(updates).length === 0) {
          toast.info("No changes detected", {
            description: `Please make changes before updating this ${entityNameLower}.`,
          });
          setIsSubmitting(false);
          return;
        }

        await updateUserWithClerk({
          userId: user._id,
          updates: updates as Record<string, unknown>,
        });

        toast.success(`${entityName} updated successfully`, {
          description: `"${firstName} ${lastName}" has been updated successfully.`,
        });

        resetImageState();
        setIsOpen(false);
        router.refresh();
      } else {
        await createUserWithClerk({
          firstName,
          lastName,
          email,
          role,
          phone,
          avatarStorageId: uploadedImageStorageId || undefined,
          campusId: config.showCampusAssignment ? selectedCampusId : undefined,
          status: selectedStatus as
            | "active"
            | "inactive"
            | "on_leave"
            | "terminated",
        });

        toast.success(`${entityName} created successfully`, {
          description: `"${firstName} ${lastName}" has been created successfully.`,
        });

        resetFormState(form);
        setIsOpen(false);
        router.refresh();
      }
    } catch (error) {
      let errorMessage = `Failed to save ${entityNameLower}. Please try again.`;

      if (error instanceof Error) {
        if (
          error.message.includes("duplicate") ||
          error.message.includes("unique")
        ) {
          errorMessage = `A ${entityNameLower} with this email already exists.`;
        } else if (
          error.message.includes("permission") ||
          error.message.includes("unauthorized")
        ) {
          errorMessage = `You don't have permission to manage this ${entityNameLower}.`;
        } else if (
          error.message.includes("network") ||
          error.message.includes("fetch")
        ) {
          errorMessage = "Network error. Please check your connection.";
        } else {
          errorMessage = error.message;
        }
      }

      toast.error(`Error saving ${entityNameLower}`, {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;

    try {
      setIsSubmitting(true);
      await deleteUserWithClerk({ userId: user._id });

      toast.success(`${entityName} deleted successfully`, {
        description: `"${user.fullName}" has been deleted.`,
      });

      resetImageState();
      setIsOpen(false);
      setShowDeleteAlert(false);
      router.push(`/${locale}/admin/${config.plural}`);
      router.refresh();
    } catch (error) {
      let errorMessage = `Failed to delete ${entityNameLower}. Please try again.`;

      if (error instanceof Error) {
        if (
          error.message.includes("permission") ||
          error.message.includes("unauthorized")
        ) {
          errorMessage = `You don't have permission to delete this ${entityNameLower}.`;
        } else if (error.message.includes("not found")) {
          errorMessage = `${entityName} not found. It may have been already deleted.`;
        } else {
          errorMessage = error.message;
        }
      }

      toast.error(`Error deleting ${entityNameLower}`, {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const defaultTrigger = isEditing ? (
    <Button className="gap-2 cursor-pointer">
      <Edit className="h-4 w-4" />
      {`Edit ${entityNameLower}`}
    </Button>
  ) : (
    <Button className="bg-sidebar-accent h-9 dark:text-white gap-2">
      <Plus className="h-4 w-4" />
      <span className="hidden md:inline">{`Add ${entityName}`}</span>
    </Button>
  );

  return (
    <>
      <EntityDialog
        trigger={trigger || defaultTrigger}
        title={isEditing ? `Edit ${entityName}` : `Create New ${entityName}`}
        onSubmit={handleSubmit}
        submitLabel={isEditing ? "Save changes" : `Create ${entityName}`}
        isSubmitting={isSubmitting}
        open={isOpen}
        onOpenChange={setIsOpen}
        leftActions={
          isEditing ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => setShowDeleteAlert(true)}
              className="gap-2 min-w-[120px] whitespace-nowrap"
            >
              <Trash2 className="h-4 w-4" />
              {`Delete ${entityName}`}
            </Button>
          ) : undefined
        }
      >
        <div className="grid gap-6">
          <input type="hidden" name="campusId" value={selectedCampusId || ""} />
          <input type="hidden" name="status" value={selectedStatus} />
          <input type="hidden" name="role" value={role} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-3">
              <Label htmlFor="firstName">First Name {!isEditing && "*"}</Label>
              <Input
                id="firstName"
                name="firstName"
                defaultValue={user?.firstName || ""}
                placeholder={isEditing ? "" : "e.g., John, Maria"}
                required
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="lastName">Last Name {!isEditing && "*"}</Label>
              <Input
                id="lastName"
                name="lastName"
                defaultValue={user?.lastName || ""}
                placeholder={isEditing ? "" : "e.g., Smith, Garcia"}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-3">
              <Label htmlFor="email">Email {!isEditing && "*"}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={user?.email || ""}
                placeholder={
                  isEditing ? "" : "e.g., john.smith@alefuniversity.edu"
                }
                required
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={user?.phone || ""}
                placeholder={isEditing ? "" : "e.g., +1 (555) 123-4567"}
              />
            </div>
          </div>

          <div className="grid gap-3">
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              name="role"
              value={entityName}
              disabled
              className="bg-muted"
            />
            <p className="text-sm text-muted-foreground">
              The role is assigned when the user is created
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium border-b pb-2">
              {entityName} Image
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-3">
                <Label>{isEditing ? "Current Image" : "Preview"}</Label>
                <AspectRatio ratio={1} className="bg-muted rounded-lg">
                  {imagePreview ? (
                    <Image
                      src={imagePreview}
                      alt={`${entityName} preview`}
                      fill
                      className="h-full w-full rounded-lg object-cover"
                    />
                  ) : existingAvatarUrl && !deleteExistingImage ? (
                    <Image
                      src={existingAvatarUrl}
                      alt={`Current ${entityNameLower} avatar`}
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

              <div className="space-y-4 lg:col-span-2">
                <div className="space-y-3">
                  <Label>
                    {isEditing
                      ? "Upload New Image"
                      : `Upload ${entityName} Image`}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {`Choose a square image that represents the ${entityNameLower}. Recommended size: 400x400px or larger.`}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
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

                  {existingAvatarUrl &&
                    !deleteExistingImage &&
                    !imagePreview &&
                    isEditing && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setDeleteExistingImage(true);
                          setSelectedImage(null);
                          setImagePreview(null);
                        }}
                        className="gap-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Current Image
                      </Button>
                    )}
                </div>

                {selectedImage && (
                  <div className="text-sm text-muted-foreground">
                    Selected: {selectedImage.name} (
                    {Math.round(selectedImage.size / 1024)}KB)
                  </div>
                )}

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

          {config.showCampusAssignment && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium border-b pb-2">
                Campus Assignment
              </h4>
              <div className="grid gap-3">
                <Label>Assigned Campus</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                    >
                      {selectedCampus ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span className="font-medium">
                            {selectedCampus.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          Select a campus
                        </span>
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
                            className={
                              selectedCampusId === campus._id ? "bg-accent" : ""
                            }
                          >
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                <span className="font-medium">
                                  {campus.name}
                                </span>
                                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                  {campus.status}
                                </span>
                              </div>
                              {campus.address?.city &&
                                campus.address?.state && (
                                  <span className="text-sm text-muted-foreground ml-6">
                                    {campus.address.city},{" "}
                                    {campus.address.state}
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
          )}

          <div className="space-y-4">
            <h4 className="text-sm font-medium border-b pb-2">Status</h4>
            <div className="grid gap-3">
              <Label htmlFor="status">
                {entityName} Status {!isEditing && "*"}
              </Label>
              <SelectDropdown
                options={statusOptions.map((option) => ({ ...option }))}
                value={selectedStatus}
                onValueChange={setSelectedStatus}
                placeholder="Select status..."
                label={`${entityName} Status Options`}
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
              {`This action cannot be undone. This will permanently delete the ${entityNameLower} "${user?.fullName}" and remove all associated data.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive !text-white text-destructive-foreground hover:bg-destructive/90"
            >
              {`Delete ${entityName}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
