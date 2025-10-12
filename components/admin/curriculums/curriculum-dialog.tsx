"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectDropdown } from "@/components/ui/select-dropdown";
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
import { Plus, Edit, Trash2, BookOpen, Upload, X, Link as LinkIcon } from "lucide-react";
import { useState, useRef } from "react";
import { EntityDialog } from "@/components/ui/entity-dialog";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

interface CurriculumDialogProps {
  curriculum?: Doc<"curriculums">;
  trigger?: React.ReactNode;
}

export function CurriculumDialog({
  curriculum,
  trigger,
}: CurriculumDialogProps) {
  const isEditing = !!curriculum;
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  // Clerk user
  const { user: clerkUser } = useUser();

  // Get current Convex user
  const currentUser = useQuery(
    api.users.getCurrentUser,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip",
  );

  // Mutations
  const createCurriculumMutation = useMutation(
    api.curriculums.createCurriculum,
  );
  const updateCurriculumMutation = useMutation(
    api.curriculums.updateCurriculum,
  );
  const deleteCurriculumMutation = useMutation(
    api.curriculums.deleteCurriculum,
  );

  // Dialog state
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState<string>(
    curriculum?.status || "",
  );

  // Syllabus file management
  const [selectedSyllabus, setSelectedSyllabus] = useState<File | null>(null);
  const syllabusInputRef = useRef<HTMLInputElement>(null);

  // Resources management
  type Resource = {
    name: string;
    url: string;
    type: string;
  };

  const [resources, setResources] = useState<Resource[]>(
    curriculum?.resources || []
  );
  const [newResourceName, setNewResourceName] = useState("");
  const [newResourceUrl, setNewResourceUrl] = useState("");
  const [newResourceType, setNewResourceType] = useState("");

  // Curriculum status options
  const curriculumStatusOptions = [
    { value: "active", label: "Active" },
    { value: "draft", label: "Draft" },
    { value: "archived", label: "Archived" },
    { value: "deprecated", label: "Deprecated" },
  ];

  // Syllabus file handlers
  const handleSyllabusUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedSyllabus(file);
    }
  };

  const handleSyllabusRemove = () => {
    setSelectedSyllabus(null);
    if (syllabusInputRef.current) {
      syllabusInputRef.current.value = "";
    }
  };

  const triggerSyllabusUpload = () => {
    syllabusInputRef.current?.click();
  };

  // Resource handlers
  const handleAddResource = () => {
    if (!newResourceName.trim() || !newResourceUrl.trim() || !newResourceType.trim()) {
      toast.error("Validation Error", {
        description: "Please fill in all resource fields (name, URL, and type).",
      });
      return;
    }

    const newResource: Resource = {
      name: newResourceName.trim(),
      url: newResourceUrl.trim(),
      type: newResourceType.trim(),
    };

    setResources([...resources, newResource]);
    setNewResourceName("");
    setNewResourceUrl("");
    setNewResourceType("");
  };

  const handleRemoveResource = (index: number) => {
    setResources(resources.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Guardar referencia al formulario ANTES de cualquier operación asíncrona
    const form = event.currentTarget;

    // Validar que tengamos el usuario actual
    if (!currentUser?._id) {
      toast.error("Authentication Error", {
        description: "User not authenticated. Please sign in again.",
      });
      return;
    }

    const formData = new FormData(form);

    // Obtener datos del formulario
    const name = formData.get("name") as string;
    const code = formData.get("code") as string | null;
    const description = formData.get("description") as string | null;
    const numberOfQuarters = formData.get("numberOfQuarters") as string | null;

    // Validación básica
    if (!name?.trim()) {
      toast.error("Validation Error", {
        description: "Curriculum name is required.",
      });
      return;
    }

    if (!isEditing && !selectedStatus) {
      toast.error("Validation Error", {
        description: "Curriculum status is required.",
      });
      return;
    }

    if (
      !numberOfQuarters ||
      parseInt(numberOfQuarters) < 1 ||
      parseInt(numberOfQuarters) > 4
    ) {
      toast.error("Validation Error", {
        description: "Number of quarters must be between 1 and 4.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing) {
        // Actualizar curriculum existente
        if (!curriculum?._id) {
          toast.error("Error", {
            description: "Curriculum ID not found.",
          });
          return;
        }

        const updates: {
          name?: string;
          code?: string;
          description?: string;
          numberOfQuarters?: number;
          status?: "draft" | "active" | "archived" | "deprecated";
          resources?: Array<{
            name: string;
            url: string;
            type: string;
          }>;
        } = {};

        // Solo incluir campos que han cambiado
        if (name.trim() !== curriculum.name) {
          updates.name = name.trim();
        }

        // Code is not editable - skip update
        // if (code?.trim() !== curriculum.code) {
        //   updates.code = code?.trim() || undefined;
        // }

        if (description?.trim() !== (curriculum.description || "")) {
          updates.description = description?.trim() || undefined;
        }

        const newQuarters = numberOfQuarters ? parseInt(numberOfQuarters) : 4;
        if (newQuarters !== curriculum.numberOfQuarters) {
          updates.numberOfQuarters = newQuarters;
        }

        if (selectedStatus !== curriculum.status) {
          updates.status = selectedStatus as
            | "draft"
            | "active"
            | "archived"
            | "deprecated";
        }

        // Check if resources changed
        if (JSON.stringify(resources) !== JSON.stringify(curriculum.resources || [])) {
          updates.resources = resources.length > 0 ? resources : undefined;
        }

        // Note: Syllabus file upload would need to be handled separately with Convex storage
        // For now, we're not implementing the actual file upload in this update

        // Solo hacer la actualización si hay cambios
        if (Object.keys(updates).length > 0) {
          await updateCurriculumMutation({
            curriculumId: curriculum._id,
            updates,
            updatedBy: currentUser._id,
          });

          toast.success("Curriculum updated successfully", {
            description: `"${name}" has been updated.`,
          });

          // Cerrar el dialog automáticamente después del éxito
          setIsOpen(false);

          // Recargar la página para mostrar los cambios
          router.refresh();
        } else {
          toast.info("No changes detected", {
            description: "Please make changes before updating.",
          });
          setIsSubmitting(false);
          return;
        }
      } else {
        // Crear curriculum
        const curriculumData: {
          name: string;
          code?: string;
          description?: string;
          numberOfQuarters: number;
          createdBy: Id<"users">;
          resources?: Array<{
            name: string;
            url: string;
            type: string;
          }>;
        } = {
          name: name.trim(),
          numberOfQuarters: numberOfQuarters ? parseInt(numberOfQuarters) : 4,
          createdBy: currentUser._id,
        };

        // Código opcional
        if (code?.trim()) {
          curriculumData.code = code.trim();
        }

        // Descripción opcional
        if (description?.trim()) {
          curriculumData.description = description.trim();
        }

        // Resources opcional
        if (resources.length > 0) {
          curriculumData.resources = resources;
        }

        // Note: Syllabus file upload would need to be handled separately with Convex storage
        // For now, we're not implementing the actual file upload in creation

        const curriculumId = await createCurriculumMutation(curriculumData);

        toast.success("Curriculum created successfully", {
          description: `"${name}" has been created.`,
        });

        // Resetear formulario
        form.reset();
        setSelectedStatus("");
        setResources([]);
        setSelectedSyllabus(null);
        setNewResourceName("");
        setNewResourceUrl("");
        setNewResourceType("");

        // Cerrar el dialog automáticamente después del éxito
        setIsOpen(false);

        // Recargar la página para mostrar el nuevo curriculum
        router.refresh();
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to save curriculum. Please try again.";
      toast.error("Error", {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!curriculum) return;

    try {
      setIsSubmitting(true);
      await deleteCurriculumMutation({ curriculumId: curriculum._id });

      toast.success("Curriculum deleted successfully", {
        description: `"${curriculum.name}" has been deleted.`,
      });

      // Cerrar el dialog
      setIsOpen(false);
      setShowDeleteAlert(false);

      // Redirigir a la página de listado de curriculums con el locale correcto
      router.push(`/${locale}/admin/curriculums`);
      router.refresh();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to delete curriculum. Please try again.";
      toast.error("Error", {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Default triggers si no se proporciona uno custom
  const defaultTrigger = isEditing ? (
    <Button className="gap-2 cursor-pointer">
      <Edit className="h-4 w-4" />
      Edit curriculum
    </Button>
  ) : (
    <Button className="bg-sidebar-accent h-9 dark:text-white gap-2">
      <Plus className="h-4 w-4" />
      <span className="hidden md:inline">Add Curriculum</span>
    </Button>
  );

  return (
    <>
      <EntityDialog
        trigger={trigger || defaultTrigger}
        title={isEditing ? "Edit Curriculum" : "Create New Curriculum"}
        onSubmit={handleSubmit}
        submitLabel={isEditing ? "Save changes" : "Create Curriculum"}
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
              Delete Curriculum
            </Button>
          ) : undefined
        }
      >
        <div className="grid gap-6">
          {/* Hidden input para status */}
          <input type="hidden" name="status" value={selectedStatus} />

          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium border-b pb-2">
              Basic Information
            </h4>
            <div className="grid gap-4">
              {/* Name and Code - First row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-3">
                  <Label htmlFor="name">
                    Name
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={curriculum?.name || ""}
                    placeholder={isEditing ? "" : "Enter curriculum name"}
                    required
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    name="code"
                    defaultValue={curriculum?.code || ""}
                    placeholder={isEditing ? "" : "Enter curriculum code"}
                    disabled={isEditing}
                    className={isEditing ? "bg-muted cursor-not-allowed" : ""}
                  />
                </div>
              </div>

              {/* Description - Full width */}
              <div className="grid gap-3">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={curriculum?.description || ""}
                  placeholder={
                    isEditing
                      ? ""
                      : "Provide a brief description of the curriculum..."
                  }
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-3">
                  <Label htmlFor="numberOfQuarters">
                    Number of Quarters
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="numberOfQuarters"
                    name="numberOfQuarters"
                    type="number"
                    min="1"
                    max="4"
                    defaultValue={curriculum?.numberOfQuarters || 4}
                    placeholder={
                      isEditing ? "" : "Enter number of quarters (1-4)"
                    }
                    required
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="status">
                    Status
                    <span className="text-red-500">*</span>
                  </Label>
                  <SelectDropdown
                    options={curriculumStatusOptions}
                    value={selectedStatus}
                    onValueChange={(value) => setSelectedStatus(value)}
                    placeholder="Select status..."
                    label="Status Options"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Syllabus Document */}
          {/* <div className="space-y-4">
          <h4 className="text-sm font-medium border-b pb-2">Syllabus</h4>
          <div className="grid gap-4">
            <div className="grid gap-3">
              <p className="text-sm text-muted-foreground">
                Upload the official syllabus document for this curriculum (PDF, DOC, DOCX).
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={triggerSyllabusUpload}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {selectedSyllabus ? "Change File" : "Upload Syllabus"}
                </Button>

                {selectedSyllabus && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSyllabusRemove}
                    className="gap-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                )}
              </div>

              {selectedSyllabus && (
                <div className="text-sm text-muted-foreground">
                  Selected: {selectedSyllabus.name} (
                  {Math.round(selectedSyllabus.size / 1024)}KB)
                </div>
              )}

              {curriculum?.syllabusStorageId && !selectedSyllabus && (
                <div className="text-sm text-muted-foreground">
                  Current syllabus document is stored in the system.
                </div>
              )}

              <input
                ref={syllabusInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleSyllabusUpload}
                className="hidden"
              />
            </div>
          </div>
        </div> */}

          {/* Resources */}
          {/* <div className="space-y-4">
          <h4 className="text-sm font-medium border-b pb-2">Resources</h4>
          <div className="grid gap-4">
            {resources.length > 0 && (
              <div className="space-y-3">
                <Label>Current Resources ({resources.length})</Label>
                <div className="space-y-2">
                  {resources.map((resource, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50"
                    >
                      <LinkIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {resource.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {resource.url}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Type: {resource.type}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveResource(index)}
                        className="flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )} */}

          {/* Add New Resource */}
          {/* <div className="space-y-3">
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="resourceName" className="text-sm">
                    Name
                  </Label>
                  <Input
                    id="resourceName"
                    value={newResourceName}
                    onChange={(e) => setNewResourceName(e.target.value)}
                    placeholder="Enter resource name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="resourceUrl" className="text-sm">
                    URL
                  </Label>
                  <Input
                    id="resourceUrl"
                    value={newResourceUrl}
                    onChange={(e) => setNewResourceUrl(e.target.value)}
                    placeholder="Enter resource URL"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="resourceType" className="text-sm">
                    Type
                  </Label>
                  <Input
                    id="resourceType"
                    value={newResourceType}
                    onChange={(e) => setNewResourceType(e.target.value)}
                    placeholder="Enter resource type (e.g., Book, Article)"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddResource}
                  className="gap-2 self-start"
                >
                  <Plus className="h-4 w-4" />
                  Add Resource
                </Button>
              </div>
            </div> */}
          {/* </div> */}
          {/* </div> */}
        </div>
      </EntityDialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the curriculum
              &quot;{curriculum?.name}&quot; and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive !text-white text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Curriculum
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
