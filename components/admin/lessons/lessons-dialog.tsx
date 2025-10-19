"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectDropdown } from "@/components/ui/select-dropdown";
import { EntityDialog } from "@/components/ui/entity-dialog";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  ChevronDown,
  GraduationCap,
  X,
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

  // Dialog state
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [selectedCurriculum, setSelectedCurriculum] = useState<string>(
    lesson?.curriculumId || defaultCurriculumId || "",
  );
  const [selectedQuarter, setSelectedQuarter] = useState<string>(
    lesson?.quarter?.toString() || "",
  );

  // Multi-grade selection (now supports multiple grades per lesson)
  const [selectedGradeCodes, setSelectedGradeCodes] = useState<string[]>(
    lesson?.gradeCodes || (lesson?.gradeCode ? [lesson.gradeCode] : [])
  );

  const [isMandatory, setIsMandatory] = useState<boolean>(
    lesson?.isMandatory ?? false,
  );

  // List states - Objectives (array of strings)
  const [objectives, setObjectives] = useState<string[]>(
    lesson?.objectives || [],
  );

  // List states - Resources (array of objects)
  const [resources, setResources] = useState<
    { name: string; url: string; type: string; isRequired: boolean }[]
  >(lesson?.resources || []);

  // Get curriculums from database
  const curriculums = useQuery(api.curriculums.getCurriculums, {
    isActive: true,
  });

  // Get available grades for selected curriculum
  const availableGrades = useQuery(
    api.curriculums.getCurriculumGrades,
    selectedCurriculum ? { curriculumId: selectedCurriculum as Id<"curriculums"> } : "skip"
  );

  // Mutations
  const createLessonMutation = useMutation(api.lessons.createLesson);
  const updateLessonMutation = useMutation(api.lessons.updateLesson);
  const deleteLessonMutation = useMutation(api.lessons.deleteLesson);

  // Transform curriculums to options format
  const curriculumOptions =
    curriculums?.map((curriculum) => ({
      value: curriculum._id,
      label: `${curriculum.name}${curriculum.code ? ` (${curriculum.code})` : ""}`,
    })) || [];

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

  // Grade selection handlers
  const handleGradeToggle = (gradeCode: string) => {
    setSelectedGradeCodes(prev => {
      if (prev.includes(gradeCode)) {
        // Remover grade
        return prev.filter(code => code !== gradeCode)
      } else {
        // Agregar grade
        return [...prev, gradeCode]
      }
    })
  }

  const handleRemoveGrade = (gradeCode: string) => {
    setSelectedGradeCodes(prev => prev.filter(code => code !== gradeCode))
  }

  // Get selected grades with full info
  const selectedGrades = availableGrades?.filter(grade =>
    selectedGradeCodes.includes(grade.code)
  ) || []

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
    const quarter = formData.get("quarter") as string;
    const description = formData.get("description") as string;

    // Obtener grades del JSON
    const selectedGradeCodesJson = formData.get("selectedGradeCodes") as string;

    let parsedGradeCodes: string[] = [];

    try {
      if (selectedGradeCodesJson) {
        parsedGradeCodes = JSON.parse(selectedGradeCodesJson);
      }
    } catch (e) {
      console.error("Error parsing grade data:", e);
    }

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

    // Validar que se haya seleccionado al menos un grade
    if (!isEditing && parsedGradeCodes.length === 0) {
      toast.error("Validation Error", {
        description: "Please select at least one grade.",
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
          gradeCodes?: string[];
          gradeCode?: string; // Legacy field
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

        // Descripción general
        if (description?.trim() !== (lesson.description || "")) {
          updates.description = description?.trim() || undefined;
        }

        const newQuarter = parseInt(quarter);
        if (newQuarter !== lesson.quarter) {
          updates.quarter = newQuarter;
        }

        // Actualizar gradeCodes (nuevo campo con múltiples grades)
        const currentGradeCodes = lesson.gradeCodes || (lesson.gradeCode ? [lesson.gradeCode] : []);
        if (JSON.stringify(parsedGradeCodes.sort()) !== JSON.stringify(currentGradeCodes.sort())) {
          updates.gradeCodes = parsedGradeCodes.length > 0 ? parsedGradeCodes : undefined;
          // También actualizar el campo legacy
          updates.gradeCode = parsedGradeCodes.length > 0 ? parsedGradeCodes[0] : undefined;
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
        // Crear UNA sola lección asociada a múltiples grades
        const lessonData: {
          curriculumId: Id<"curriculums">;
          title: string;
          description?: string;
          quarter: number;
          gradeCodes?: string[]; // Nuevo: array de grades
          gradeCode?: string; // Legacy: primer grade para compatibilidad
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
          gradeCodes: parsedGradeCodes, // Array de todos los grades seleccionados
          gradeCode: parsedGradeCodes.length > 0 ? parsedGradeCodes[0] : undefined, // Legacy
          createdBy: currentUser._id,
        };

        // Descripción general (ya no es específica por grade)
        if (description?.trim()) {
          lessonData.description = description.trim();
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

        // Call the mutation to create the lesson
        await createLessonMutation(lessonData);

        toast.success("Lesson created successfully", {
          description: `"${title}" has been created for grade${parsedGradeCodes.length > 1 ? 's' : ''}: ${parsedGradeCodes.join(', ')}.`,
        });

        // Resetear formulario
        form.reset();
        setSelectedCurriculum("");
        setSelectedQuarter("");
        setSelectedGradeCodes([]);
        setIsMandatory(false);
        setObjectives([]);
        setResources([]);

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

  // // Objectives handlers
  // const addObjective = () => {
  //   if (newObjective.trim()) {
  //     setObjectives([...objectives, newObjective.trim()]);
  //     setNewObjective("");
  //   }
  // };

  // const removeObjective = (index: number) => {
  //   setObjectives(objectives.filter((_, i) => i !== index));
  // };

  // // Resource handlers
  // const handleAddResource = () => {
  //   if (
  //     !newResourceName.trim() ||
  //     !newResourceUrl.trim() ||
  //     !newResourceType.trim()
  //   ) {
  //     toast.error("Validation Error", {
  //       description: "Please fill in all resource fields (name, URL, and type).",
  //     });
  //     return;
  //   }

  //   const newResource = {
  //     name: newResourceName.trim(),
  //     url: newResourceUrl.trim(),
  //     type: newResourceType.trim(),
  //     isRequired: newResourceIsRequired,
  //   };

  //   setResources([...resources, newResource]);
  //   setNewResourceName("");
  //   setNewResourceUrl("");
  //   setNewResourceType("");
  //   setNewResourceIsRequired(true);
  // };

  // const handleRemoveResource = (index: number) => {
  //   setResources(resources.filter((_, i) => i !== index));
  // };

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
          <input type="hidden" name="selectedGradeCodes" value={JSON.stringify(selectedGradeCodes)} />
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

              {/* Curriculum Structure */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              </div>

              {/* Grade Selection */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium border-b pb-2">Grades</h4>
                <div className="grid gap-3">
                  <Label htmlFor="grades">Select Grades</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                        disabled={!selectedCurriculum || !availableGrades || availableGrades.length === 0}
                      >
                        <span className="text-muted-foreground">
                          {selectedGradeCodes.length > 0
                            ? `${selectedGradeCodes.length} grade${selectedGradeCodes.length > 1 ? 's' : ''} selected`
                            : "Choose grades..."
                          }
                        </span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-80 max-h-80 overflow-y-auto" align="start">
                      <DropdownMenuLabel>Available Grades ({availableGrades?.length || 0})</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {availableGrades && availableGrades.length > 0 ? (
                        availableGrades.map((grade) => {
                          const isSelected = selectedGradeCodes.includes(grade.code)
                          return (
                            <DropdownMenuItem
                              key={grade.code}
                              onClick={() => handleGradeToggle(grade.code)}
                              className={`${isSelected ? "bg-accent" : ""} cursor-pointer`}
                            >
                              <div className="flex items-center gap-2 w-full">
                                <GraduationCap className="h-4 w-4" />
                                <span className="font-medium">{grade.name}</span>
                                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                  {grade.code}
                                </span>
                                {isSelected && (
                                  <Badge variant="secondary" className="text-xs ml-auto">
                                    Selected
                                  </Badge>
                                )}
                              </div>
                            </DropdownMenuItem>
                          )
                        })
                      ) : (
                        <DropdownMenuItem disabled>
                          No grades available
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {selectedCurriculum && availableGrades && availableGrades.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No grades available for this curriculum
                    </p>
                  )}
                </div>

                {/* Selected Grades Display */}
                {selectedGrades.length > 0 && (
                  <div className="space-y-4">
                    <Label className="text-sm font-medium">Selected Grades ({selectedGrades.length})</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedGrades.map((grade) => (
                        <Badge
                          key={grade.code}
                          variant="outline"
                          className="flex items-center gap-2 px-3 py-1.5 text-sm"
                        >
                          <GraduationCap className="h-3 w-3" />
                          <span>{grade.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveGrade(grade.code)}
                            className="ml-1 rounded-full hover:bg-muted p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* General Description */}
                <div className="grid gap-2">
                  <Label htmlFor="description">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={lesson?.description || ""}
                    placeholder="Enter lesson description..."
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    This description will apply to all selected grades.
                  </p>
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
