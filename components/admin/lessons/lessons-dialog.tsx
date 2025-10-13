"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectDropdown } from "@/components/ui/select-dropdown";
import { EntityDialog } from "@/components/ui/entity-dialog";
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
import {
  Plus,
  Edit,
  Trash2,
  BookOpen,
  Link2,
  ListChecks,
  FilePlus2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

interface LessonDialogProps {
  lesson?: Doc<"curriculum_lessons">;
  trigger?: React.ReactNode;
  defaultCurriculumId?: Id<"curriculums">;
}

export function LessonsDialog({ lesson, trigger, defaultCurriculumId }: LessonDialogProps) {
  const isEditing = !!lesson;
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

  // Get curriculums from database
  const curriculums = useQuery(api.curriculums.getCurriculums, {
    isActive: true,
  });

  // Mutations
  const createLessonMutation = useMutation(api.lessons.createLesson);
  const updateLessonMutation = useMutation(api.lessons.updateLesson);
  const deleteLessonMutation = useMutation(api.lessons.deleteLesson);

  // Dialog state
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Transform curriculums to options format
  const curriculumOptions =
    curriculums?.map((curriculum) => ({
      value: curriculum._id,
      label: `${curriculum.name}${curriculum.code ? ` (${curriculum.code})` : ""}`,
    })) || [];

  const resourceTypeOptions = [
    { value: "document", label: "Document" },
    { value: "video", label: "Video" },
    { value: "link", label: "External Link" },
    { value: "worksheet", label: "Worksheet" },
  ];

  const [selectedCurriculum, setSelectedCurriculum] = useState<string>(
    lesson?.curriculumId || defaultCurriculumId || "",
  );
  const [selectedQuarter, setSelectedQuarter] = useState<string>(
    lesson?.quarter?.toString() || "",
  );
  const [isMandatory, setIsMandatory] = useState<boolean>(
    lesson?.isMandatory ?? false,
  );

  // List states - Objectives (array of strings)
  const [objectives, setObjectives] = useState<string[]>(
    lesson?.objectives || [],
  );
  const [newObjective, setNewObjective] = useState("");

  // List states - Resources (array of objects)
  const [resources, setResources] = useState<
    { name: string; url: string; type: string; isRequired: boolean }[]
  >(lesson?.resources || []);
  const [newResourceName, setNewResourceName] = useState("");
  const [newResourceUrl, setNewResourceUrl] = useState("");
  const [newResourceType, setNewResourceType] = useState("");
  const [newResourceIsRequired, setNewResourceIsRequired] = useState(true);

  // Reset curriculum when dialog opens with defaultCurriculumId
  useEffect(() => {
    if (isOpen && defaultCurriculumId && !isEditing) {
      setSelectedCurriculum(defaultCurriculumId);
    }
  }, [isOpen, defaultCurriculumId, isEditing]);

  // Get selected curriculum details
  const selectedCurriculumData = curriculums?.find(
    (c) => c._id === selectedCurriculum
  );

  // Get occupied orders for the selected curriculum and quarter
  const occupiedOrders = useQuery(
    api.lessons.getOccupiedOrders,
    selectedCurriculum && selectedQuarter
      ? {
        curriculumId: selectedCurriculum as Id<"curriculums">,
        quarter: parseInt(selectedQuarter),
        excludeLessonId: lesson?._id,
      }
      : "skip"
  );

  // Generate quarter options based on selected curriculum
  const quarterOptions = selectedCurriculumData
    ? Array.from({ length: selectedCurriculumData.numberOfQuarters }, (_, i) => ({
      value: (i + 1).toString(),
      label: `Quarter ${i + 1}`,
    }))
    : [
      { value: "1", label: "Quarter 1" },
      { value: "2", label: "Quarter 2" },
      { value: "3", label: "Quarter 3" },
      { value: "4", label: "Quarter 4" },
    ];

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
    const curriculumId = formData.get("curriculumId") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;
    const quarter = formData.get("quarter") as string;
    const orderInQuarter = formData.get("orderInQuarter") as string;
    const expectedDurationMinutes = formData.get("expectedDurationMinutes") as
      | string
      | null;

    // Validación básica
    if (!curriculumId?.trim()) {
      toast.error("Validation Error", {
        description: "Curriculum is required.",
      });
      return;
    }

    if (!title?.trim()) {
      toast.error("Validation Error", {
        description: "Lesson title is required.",
      });
      return;
    }

    if (!quarter) {
      toast.error("Validation Error", {
        description: "Quarter is required.",
      });
      return;
    }

    if (!orderInQuarter) {
      toast.error("Validation Error", {
        description: "Order in quarter is required.",
      });
      return;
    }

    // Client-side validation: Check if order is already occupied
    const orderNum = parseInt(orderInQuarter);
    if (occupiedOrders && occupiedOrders.includes(orderNum)) {
      toast.error("Validation Error", {
        description: `Position ${orderNum} is already occupied in Quarter ${quarter}. Please choose a different order number. Occupied positions: ${occupiedOrders.join(", ")}`,
      });
      return;
    }

    // Mandatory field validation (always required, both create and edit)
    if (isMandatory === undefined || isMandatory === null) {
      toast.error("Validation Error", {
        description: "Mandatory status is required.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing) {
        // Actualizar lesson existente
        if (!lesson?._id) {
          toast.error("Error", {
            description: "Lesson ID not found.",
          });
          return;
        }

        const updates: {
          title?: string;
          description?: string;
          quarter?: number;
          orderInQuarter?: number;
          expectedDurationMinutes?: number;
          resources?: {
            name: string;
            url: string;
            type: string;
            isRequired: boolean;
          }[];
          objectives?: string[];
          isMandatory?: boolean;
        } = {};

        // Solo incluir campos que han cambiado
        if (title.trim() !== lesson.title) {
          updates.title = title.trim();
        }

        if (description?.trim() !== (lesson.description || "")) {
          updates.description = description?.trim() || undefined;
        }

        const newQuarter = parseInt(quarter);
        if (newQuarter !== lesson.quarter) {
          updates.quarter = newQuarter;
        }

        const newOrder = parseInt(orderInQuarter);
        if (newOrder !== lesson.orderInQuarter) {
          updates.orderInQuarter = newOrder;
        }

        const newDuration = expectedDurationMinutes
          ? parseInt(expectedDurationMinutes)
          : undefined;
        if (newDuration !== lesson.expectedDurationMinutes) {
          updates.expectedDurationMinutes = newDuration;
        }

        // Comparar resources (stringify para comparación profunda)
        if (
          JSON.stringify(resources) !== JSON.stringify(lesson.resources || [])
        ) {
          updates.resources = resources.length > 0 ? resources : undefined;
        }

        // Comparar objectives
        if (
          JSON.stringify(objectives) !== JSON.stringify(lesson.objectives || [])
        ) {
          updates.objectives = objectives.length > 0 ? objectives : undefined;
        }

        if (isMandatory !== lesson.isMandatory) {
          updates.isMandatory = isMandatory;
        }

        // Solo hacer la actualización si hay cambios
        if (Object.keys(updates).length > 0) {
          await updateLessonMutation({
            lessonId: lesson._id,
            updates,
            updatedBy: currentUser._id,
          });

          toast.success("Lesson updated successfully", {
            description: `"${title}" has been updated.`,
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
        // Crear lesson
        const lessonData: {
          curriculumId: Id<"curriculums">;
          title: string;
          description?: string;
          quarter: number;
          orderInQuarter: number;
          expectedDurationMinutes?: number;
          resources?: {
            name: string;
            url: string;
            type: string;
            isRequired: boolean;
          }[];
          objectives?: string[];
          isMandatory?: boolean;
          createdBy: Id<"users">;
        } = {
          curriculumId: curriculumId as Id<"curriculums">,
          title: title.trim(),
          quarter: parseInt(quarter),
          orderInQuarter: parseInt(orderInQuarter),
          createdBy: currentUser._id,
        };

        // Descripción opcional
        if (description?.trim()) {
          lessonData.description = description.trim();
        }

        // Duración esperada opcional
        if (expectedDurationMinutes?.trim()) {
          lessonData.expectedDurationMinutes = parseInt(
            expectedDurationMinutes,
          );
        }

        // Resources opcionales
        if (resources.length > 0) {
          lessonData.resources = resources;
        }

        // Objectives opcionales
        if (objectives.length > 0) {
          lessonData.objectives = objectives;
        }

        // isMandatory
        lessonData.isMandatory = isMandatory;

        const lessonId = await createLessonMutation(lessonData);

        toast.success("Lesson created successfully", {
          description: `"${title}" has been created.`,
        });

        // Resetear formulario
        form.reset();
        setSelectedCurriculum("");
        setSelectedQuarter("");
        setIsMandatory(false);
        setObjectives([]);
        setNewObjective("");
        setResources([]);
        setNewResourceName("");
        setNewResourceUrl("");
        setNewResourceType("");
        setNewResourceIsRequired(true);

        // Cerrar el dialog automáticamente después del éxito
        setIsOpen(false);

        // Recargar la página para mostrar el nuevo lesson
        router.refresh();
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to save lesson. Please try again.";
      toast.error("Error", {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!lesson) return;

    try {
      setIsSubmitting(true);
      await deleteLessonMutation({ lessonId: lesson._id });

      toast.success("Lesson deleted successfully", {
        description: `"${lesson.title}" has been deleted.`,
      });

      // Cerrar el dialog de alerta y el dialog principal
      setShowDeleteAlert(false);
      setIsOpen(false);

      // Redirigir a la página de listado de lessons con el locale correcto
      router.push(`/${locale}/admin/lessons`);
      router.refresh();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to delete lesson. Please try again.";
      toast.error("Error", {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Objectives handlers
  const addObjective = () => {
    if (newObjective.trim()) {
      setObjectives([...objectives, newObjective.trim()]);
      setNewObjective("");
    }
  };

  const removeObjective = (index: number) => {
    setObjectives(objectives.filter((_, i) => i !== index));
  };

  // Resource handlers
  const handleAddResource = () => {
    if (
      !newResourceName.trim() ||
      !newResourceUrl.trim() ||
      !newResourceType.trim()
    ) {
      toast.error("Validation Error", {
        description: "Please fill in all resource fields (name, URL, and type).",
      });
      return;
    }

    const newResource = {
      name: newResourceName.trim(),
      url: newResourceUrl.trim(),
      type: newResourceType.trim(),
      isRequired: newResourceIsRequired,
    };

    setResources([...resources, newResource]);
    setNewResourceName("");
    setNewResourceUrl("");
    setNewResourceType("");
    setNewResourceIsRequired(true);
  };

  const handleRemoveResource = (index: number) => {
    setResources(resources.filter((_, i) => i !== index));
  };

  // Trigger por defecto
  const defaultTrigger = isEditing ? (
    <Button className="gap-2 cursor-pointer">
      <Edit className="h-4 w-4" />
      Edit lesson
    </Button>
  ) : (
    <Button className="bg-sidebar-accent h-9 dark:text-white gap-2">
      <Plus className="h-4 w-4" />
      <span className="hidden md:inline">Add Lesson</span>
    </Button>
  );

  return (
    <>
      <EntityDialog
        trigger={trigger || defaultTrigger}
        title={isEditing ? "Edit Lesson" : "Create New Lesson"}
        onSubmit={handleSubmit}
        submitLabel={isEditing ? "Save changes" : "Create Lesson"}
        open={isOpen}
        onOpenChange={setIsOpen}
        isSubmitting={isSubmitting}
        leftActions={
          isEditing ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => setShowDeleteAlert(true)}
              className="gap-2 min-w-[120px] whitespace-nowrap"
            >
              <Trash2 className="h-4 w-4" />
              Delete Lesson
            </Button>
          ) : undefined
        }
      >
        <div className="grid gap-6">
          {/* Hidden inputs */}
          <input type="hidden" name="curriculumId" value={selectedCurriculum} />
          <input type="hidden" name="quarter" value={selectedQuarter} />
          <input
            type="hidden"
            name="isMandatory"
            value={isMandatory ? "true" : "false"}
          />
          <input
            type="hidden"
            name="objectives"
            value={JSON.stringify(objectives)}
          />
          <input
            type="hidden"
            name="resources"
            value={JSON.stringify(resources)}
          />

          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium border-b pb-2">
              Basic Information
            </h4>
            <div className="grid gap-4">
              {/* Curriculum and Title - First row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-3">
                  <Label htmlFor="curriculumId">
                    Curriculum
                    <span className="text-red-500">*</span>
                  </Label>
                  <SelectDropdown
                    options={curriculumOptions || []}
                    value={selectedCurriculum}
                    onValueChange={(value) => {
                      setSelectedCurriculum(value);
                      // Reset quarter when curriculum changes
                      const newCurriculum = curriculums?.find((c) => c._id === value);
                      if (newCurriculum && selectedQuarter) {
                        const quarterNum = parseInt(selectedQuarter);
                        if (quarterNum > newCurriculum.numberOfQuarters) {
                          setSelectedQuarter("");
                        }
                      }
                    }}
                    placeholder="Select curriculum..."
                    label="Curriculum Options"
                    disabled={(curriculumOptions || []).length === 0}
                  />
                  {(curriculumOptions || []).length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No active curriculums available. Please create one first.
                    </p>
                  )}
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="title">
                    Name
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    name="title"
                    defaultValue={lesson?.title || ""}
                    placeholder={isEditing ? "" : "Enter lesson name"}
                    required
                  />
                </div>
              </div>

              {/* Description - Full width */}
              <div className="grid gap-3">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={lesson?.description || ""}
                  placeholder={
                    isEditing
                      ? ""
                      : "Provide a brief description of the lesson..."
                  }
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* Curriculum Structure */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="grid gap-3">
                  <Label htmlFor="quarter">
                    Quarter
                    <span className="text-red-500">*</span>
                  </Label>
                  <SelectDropdown
                    options={quarterOptions}
                    value={selectedQuarter}
                    onValueChange={(value) => setSelectedQuarter(value)}
                    placeholder={selectedCurriculum ? "Select quarter..." : "Select curriculum first"}
                    label="Quarter Options"
                    disabled={!selectedCurriculum}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="orderInQuarter">
                    Order in Quarter
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="orderInQuarter"
                    name="orderInQuarter"
                    type="number"
                    min={1}
                    defaultValue={lesson?.orderInQuarter || ""}
                    placeholder={selectedQuarter ? "Select order..." : "Select quarter first"}
                    required
                    disabled={!selectedCurriculum || !selectedQuarter}
                  />
                  {occupiedOrders && occupiedOrders.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Occupied positions: {occupiedOrders.join(", ")}
                    </p>
                  )}
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="expectedDurationMinutes">Duration (min)</Label>
                  <Input
                    id="expectedDurationMinutes"
                    name="expectedDurationMinutes"
                    type="number"
                    min={5}
                    step={5}
                    defaultValue={lesson?.expectedDurationMinutes || ""}
                    placeholder={isEditing ? "" : "e.g., 45"}
                  />
                </div>
              </div>

              {/* Mandatory Status */}
              <div className="space-y-2 border rounded-md p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">
                      Mandatory
                      <span className="text-red-500">*</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Indicates if this lesson is required or optional for
                      students.
                    </p>
                  </div>
                  <Switch
                    checked={isMandatory}
                    onCheckedChange={setIsMandatory}
                    aria-label="Toggle mandatory status"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Learning Objectives */}
          {/* <div className="space-y-4">
          <h4 className="text-sm font-medium border-b pb-2">
            Learning Objectives
          </h4>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Add learning objective..."
                value={newObjective}
                onChange={(e) => setNewObjective(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addObjective();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addObjective}>
                Add
              </Button>
            </div>
            {objectives.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No objectives added yet.
              </p>
            )}
            <ul className="space-y-2">
              {objectives.map((obj, index) => (
                <li
                  key={index}
                  className="flex items-start justify-between gap-2 rounded-md border p-2"
                >
                  <span className="text-sm leading-5 flex-1 break-words">
                    {index + 1}. {obj}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => removeObjective(index)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div> */}

          {/* Additional Resources */}
          {/* <div className="space-y-4">
          <h4 className="text-sm font-medium border-b pb-2">Resources</h4>
          <div className="space-y-4">
            <div className="grid gap-4 p-4 border rounded-md bg-muted/20">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="resourceName" className="text-xs">
                    Resource Name
                  </Label>
                  <Input
                    id="resourceName"
                    value={newResourceName}
                    onChange={(e) => setNewResourceName(e.target.value)}
                    placeholder="e.g., Practice Worksheet"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="resourceUrl" className="text-xs">
                    Resource URL
                  </Label>
                  <Input
                    id="resourceUrl"
                    value={newResourceUrl}
                    onChange={(e) => setNewResourceUrl(e.target.value)}
                    placeholder="https://..."
                    type="url"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="resourceType" className="text-xs">
                    Resource Type
                  </Label>
                  <SelectDropdown
                    options={resourceTypeOptions}
                    value={newResourceType}
                    onValueChange={(value) => setNewResourceType(value)}
                    placeholder="Select type..."
                    label="Resource Types"
                  />
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <Label className="text-xs">Required?</Label>
                  <Switch
                    checked={newResourceIsRequired}
                    onCheckedChange={setNewResourceIsRequired}
                    aria-label="Toggle resource requirement"
                  />
                </div>
                <div className="flex items-center justify-end pt-5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddResource}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" /> Add Resource
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {resources.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No resources added yet. Use the form above to add resources.
                </p>
              )}
              {resources.map((res, index) => (
                <div
                  key={index}
                  className="rounded-md border p-3 space-y-2 bg-card"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm truncate">
                          {res.name}
                        </span>
                      </div>
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-primary truncate block ml-5"
                      >
                        {res.url}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5">
                        {res.type}
                      </span>
                      {res.isRequired ? (
                        <span className="text-[10px] rounded-full bg-amber-500/15 text-amber-700 px-2 py-0.5">
                          Required
                        </span>
                      ) : (
                        <span className="text-[10px] rounded-full bg-gray-500/15 text-gray-600 px-2 py-0.5">
                          Optional
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 text-rose-600 hover:text-rose-700"
                      onClick={() => handleRemoveResource(index)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div> */}
        </div>
      </EntityDialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              lesson <strong>&quot;{lesson?.title}&quot;</strong> and all
              associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive !text-white text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Lesson
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
