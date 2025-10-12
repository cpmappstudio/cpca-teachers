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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, X, ChevronDown, User, GraduationCap } from "lucide-react";
import { useState, useRef, useEffect } from "react";
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

  const { user: clerkUser } = useUser();
  const currentUser = useQuery(
    api.users.getCurrentUser,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip",
  );

  const createCurriculumMutation = useMutation(api.curriculums.createCurriculum);
  const updateCurriculumMutation = useMutation(api.curriculums.updateCurriculum);
  const deleteCurriculumMutation = useMutation(api.curriculums.deleteCurriculum);

  const allCampuses = useQuery(api.campuses.getCampuses, { isActive: true });
  const availableCampuses = allCampuses || [];

  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>(curriculum?.status || "");

  // Múltiples campus assignments
  type CampusAssignment = {
    campusId: Id<"campuses"> | "";
    teacherIds: Id<"users">[];
    gradeCodes: string[];
  };

  const [campusAssignments, setCampusAssignments] = useState<CampusAssignment[]>([
    { campusId: "", teacherIds: [], gradeCodes: [] }
  ]);

  // Initialize campusAssignments when editing
  useEffect(() => {
    if (curriculum?.campusAssignments && curriculum.campusAssignments.length > 0) {
      const initialAssignments = curriculum.campusAssignments.map(ca => ({
        campusId: ca.campusId,
        teacherIds: ca.assignedTeachers,
        gradeCodes: ca.gradeCodes,
      }));
      setCampusAssignments(initialAssignments);
    }
  }, [curriculum]);

  const curriculumStatusOptions = [
    { value: "active", label: "Active" },
    { value: "draft", label: "Draft" },
    { value: "archived", label: "Archived" },
    { value: "deprecated", label: "Deprecated" },
  ];

  const handleAddCampusAssignment = () => {
    setCampusAssignments([...campusAssignments, { campusId: "", teacherIds: [], gradeCodes: [] }]);
  };

  const handleRemoveCampusAssignment = (index: number) => {
    setCampusAssignments(campusAssignments.filter((_, i) => i !== index));
  };

  const handleCampusChange = (index: number, campusId: Id<"campuses"> | "") => {
    const newAssignments = [...campusAssignments];
    newAssignments[index] = { campusId, teacherIds: [], gradeCodes: [] };
    setCampusAssignments(newAssignments);
  };

  const handleTeacherToggle = (index: number, teacherId: Id<"users">) => {
    const newAssignments = [...campusAssignments];
    const currentTeachers = newAssignments[index].teacherIds;
    newAssignments[index].teacherIds = currentTeachers.includes(teacherId)
      ? currentTeachers.filter(id => id !== teacherId)
      : [...currentTeachers, teacherId];
    setCampusAssignments(newAssignments);
  };

  const handleGradeToggle = (index: number, gradeCode: string) => {
    const newAssignments = [...campusAssignments];
    const currentGrades = newAssignments[index].gradeCodes;
    newAssignments[index].gradeCodes = currentGrades.includes(gradeCode)
      ? currentGrades.filter(code => code !== gradeCode)
      : [...currentGrades, gradeCode];
    setCampusAssignments(newAssignments);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;

    if (!currentUser?._id) {
      toast.error("Authentication Error", {
        description: "User not authenticated. Please sign in again.",
      });
      return;
    }

    const formData = new FormData(form);
    const name = formData.get("name") as string;
    const code = formData.get("code") as string | null;
    const description = formData.get("description") as string | null;
    const numberOfQuarters = formData.get("numberOfQuarters") as string | null;

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

    if (!numberOfQuarters || parseInt(numberOfQuarters) < 1 || parseInt(numberOfQuarters) > 4) {
      toast.error("Validation Error", {
        description: "Number of quarters must be between 1 and 4.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing) {
        if (!curriculum?._id) {
          toast.error("Error", { description: "Curriculum ID not found." });
          return;
        }

        const updates: any = {};

        if (name.trim() !== curriculum.name) {
          updates.name = name.trim();
        }

        if (code?.trim() !== (curriculum.code || "")) {
          updates.code = code?.trim() || undefined;
        }

        if (description?.trim() !== (curriculum.description || "")) {
          updates.description = description?.trim() || undefined;
        }

        const newQuarters = numberOfQuarters ? parseInt(numberOfQuarters) : 4;
        if (newQuarters !== curriculum.numberOfQuarters) {
          updates.numberOfQuarters = newQuarters;
        }

        if (selectedStatus !== curriculum.status) {
          updates.status = selectedStatus as "draft" | "active" | "archived" | "deprecated";
        }

        // Campus assignments - compare before and after filtering
        const currentAssignments = curriculum.campusAssignments || [];
        const validAssignments = campusAssignments
          .filter(a => a.campusId && a.campusId !== "")
          .map(a => ({
            campusId: a.campusId as Id<"campuses">,
            assignedTeachers: a.teacherIds,
            gradeCodes: a.gradeCodes
          }));

        // Improved comparison: compare sets of (campusId, teacherId) pairs
        const currentPairs = new Set(
          currentAssignments.flatMap(ca =>
            ca.assignedTeachers.map(tid => `${ca.campusId}|${tid}`)
          )
        );

        const newPairs = new Set(
          validAssignments.flatMap(ca =>
            ca.assignedTeachers.map(tid => `${ca.campusId}|${tid}`)
          )
        );

        // Also compare grade assignments
        const currentGradePairs = new Set(
          currentAssignments.flatMap(ca =>
            ca.gradeCodes.map(gc => `${ca.campusId}|${gc}`)
          )
        );

        const newGradePairs = new Set(
          validAssignments.flatMap(ca =>
            ca.gradeCodes.map(gc => `${ca.campusId}|${gc}`)
          )
        );

        const teachersChanged = currentPairs.size !== newPairs.size ||
          [...currentPairs].some(pair => !newPairs.has(pair)) ||
          [...newPairs].some(pair => !currentPairs.has(pair));

        const gradesChanged = currentGradePairs.size !== newGradePairs.size ||
          [...currentGradePairs].some(pair => !newGradePairs.has(pair)) ||
          [...newGradePairs].some(pair => !currentGradePairs.has(pair));

        const campusCountChanged = validAssignments.length !== currentAssignments.length;

        const assignmentsChanged = teachersChanged || gradesChanged || campusCountChanged;

        if (assignmentsChanged) {
          // Use null to explicitly clear the field, undefined won't work
          updates.campusAssignments = validAssignments.length > 0 ? validAssignments : null;
        }

        if (Object.keys(updates).length > 0) {
          await updateCurriculumMutation({
            curriculumId: curriculum._id,
            updates,
            updatedBy: currentUser._id,
          });
          toast.success("Curriculum updated successfully", {
            description: `"${name}" has been updated.`,
          });
          setIsOpen(false);
          router.refresh();
        } else {
          toast.info("No changes detected");
          setIsSubmitting(false);
          return;
        }
      } else {
        const curriculumData: any = {
          name: name.trim(),
          numberOfQuarters: numberOfQuarters ? parseInt(numberOfQuarters) : 4,
          status: selectedStatus as "draft" | "active" | "archived" | "deprecated",
          createdBy: currentUser._id,
        };

        if (code?.trim()) {
          curriculumData.code = code.trim();
        }

        if (description?.trim()) {
          curriculumData.description = description.trim();
        }

        // Campus assignments
        const validAssignments = campusAssignments
          .filter(a => a.campusId && a.campusId !== "")
          .map(a => ({
            campusId: a.campusId as Id<"campuses">,
            assignedTeachers: a.teacherIds,
            gradeCodes: a.gradeCodes
          }));

        if (validAssignments.length > 0) {
          curriculumData.campusAssignments = validAssignments;
        }

        await createCurriculumMutation(curriculumData);

        toast.success("Curriculum created successfully", {
          description: `"${name}" has been created.`,
        });

        form.reset();
        setSelectedStatus("");
        setCampusAssignments([{ campusId: "", teacherIds: [], gradeCodes: [] }]);
        setIsOpen(false);
        router.refresh();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save curriculum.";
      toast.error("Error", { description: errorMessage });
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

      setIsOpen(false);
      setShowDeleteAlert(false);
      router.push(`/${locale}/admin/curriculums`);
      router.refresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete curriculum.";
      toast.error("Error", { description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const defaultTrigger = isEditing ? (
    <Button variant="ghost" size="sm" className="gap-2 hover:text-white cursor-pointer hover:bg-sidebar-accent/90  bg-sidebar-accent text-white">
      <Edit className="h-4 w-4" />
      Edit curriculum
    </Button>
  ) : (
    <Button className="bg-sidebar-accent h-9 dark:text-white gap-2">
      <Plus className="h-4 w-4" />
      <span className="hidden md:inline">Add Curriculum</span>
    </Button>
  );

  // Campus Config Component (inline)
  const CampusConfig = ({
    assignment,
    index,
    selectedCampus,
    campusGrades,
  }: {
    assignment: CampusAssignment;
    index: number;
    selectedCampus: Doc<"campuses"> | undefined;
    campusGrades: { code: string; name: string }[];
  }) => {
    const teachers = useQuery(
      api.campuses.getTeachersByCampus,
      assignment.campusId ? { campusId: assignment.campusId } : "skip"
    ) || [];

    return (
      <div className="border-2 border-muted rounded-lg p-4 space-y-4 bg-muted/30">
        <h4 className="text-sm font-medium border-b pb-2">
          Configuration for {selectedCampus?.name}
        </h4>

        {/* Teachers Section */}
        <div className="space-y-3">
          <Label>Teachers</Label>

          {/* Teacher Dropdown */}
          {teachers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No teachers available for this campus</p>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="text-muted-foreground">Choose teachers...</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80 max-h-80 overflow-y-auto" align="start">
                <DropdownMenuLabel>Available Teachers ({teachers.length})</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {teachers.map((teacher) => {
                  const isSelected = assignment.teacherIds.includes(teacher._id);
                  return (
                    <DropdownMenuItem
                      key={teacher._id}
                      onSelect={(e) => {
                        e.preventDefault();
                        handleTeacherToggle(index, teacher._id);
                      }}
                      className={`${isSelected ? "bg-accent" : ""} cursor-pointer`}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <User className="h-4 w-4" />
                        <span className="font-medium">{teacher.fullName}</span>
                        {isSelected && (
                          <Badge variant="secondary" className="text-xs ml-auto">Selected</Badge>
                        )}
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Selected Teachers Badges - DEBAJO del dropdown */}
          {assignment.teacherIds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {assignment.teacherIds.map((teacherId) => {
                const teacher = teachers.find(t => t._id === teacherId);
                if (!teacher) return null;
                return (
                  <Badge
                    key={teacherId}
                    variant="outline"
                    className="flex items-center gap-2 px-3 py-1.5"
                  >
                    <User className="h-3 w-3" />
                    <span>{teacher.fullName}</span>
                    <button
                      type="button"
                      onClick={() => handleTeacherToggle(index, teacherId)}
                      className="ml-1 rounded-full hover:bg-muted p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}
        </div>

        {/* Grades Section */}
        {campusGrades.length > 0 && (
          <div className="space-y-3">
            <Label>Grades</Label>

            {/* Grade Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="text-muted-foreground">Choose grades...</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80 max-h-80 overflow-y-auto" align="start">
                <DropdownMenuLabel>Available Grades ({campusGrades.length})</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {campusGrades.map((grade) => {
                  const isSelected = assignment.gradeCodes.includes(grade.code);
                  return (
                    <DropdownMenuItem
                      key={grade.code}
                      onSelect={(e) => {
                        e.preventDefault();
                        handleGradeToggle(index, grade.code);
                      }}
                      className={`${isSelected ? "bg-accent" : ""} cursor-pointer`}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <GraduationCap className="h-4 w-4" />
                        <span className="font-medium">{grade.name}</span>
                        <span className="text-xs text-muted-foreground">({grade.code})</span>
                        {isSelected && (
                          <Badge variant="secondary" className="text-xs ml-auto">Selected</Badge>
                        )}
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Selected Grades Badges - DEBAJO del dropdown */}
            {assignment.gradeCodes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {assignment.gradeCodes.map((gradeCode) => {
                  const grade = campusGrades.find(g => g.code === gradeCode);
                  if (!grade) return null;
                  return (
                    <Badge
                      key={gradeCode}
                      variant="outline"
                      className="flex items-center gap-2 px-3 py-1.5"
                    >
                      <GraduationCap className="h-3 w-3" />
                      <span>{grade.name}</span>
                      <button
                        type="button"
                        onClick={() => handleGradeToggle(index, gradeCode)}
                        className="ml-1 rounded-full hover:bg-muted p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

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
          <input type="hidden" name="status" value={selectedStatus} />

          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium border-b pb-2">Basic Information</h4>
            <div className="grid gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-3">
                  <Label htmlFor="name">Name<span className="text-red-500">*</span></Label>
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

              <div className="grid gap-3">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={curriculum?.description || ""}
                  placeholder={isEditing ? "" : "Provide a brief description..."}
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-3">
                  <Label htmlFor="numberOfQuarters">Number of Quarters<span className="text-red-500">*</span></Label>
                  <Input
                    id="numberOfQuarters"
                    name="numberOfQuarters"
                    type="number"
                    min="1"
                    max="4"
                    defaultValue={curriculum?.numberOfQuarters || 4}
                    placeholder={isEditing ? "" : "Enter number of quarters (1-4)"}
                    required
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="status">Status<span className="text-red-500">*</span></Label>
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

          {/* Campus & Teachers - MULTIPLE */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium border-b pb-2">Campus & Teachers</h4>

            {campusAssignments.map((assignment, index) => {
              const selectedCampus = availableCampuses.find(c => c._id === assignment.campusId);
              const campusGrades = selectedCampus?.grades || [];

              // Get campuses already assigned (excluding current)
              const assignedCampusIds = campusAssignments
                .map((a, i) => i !== index ? a.campusId : null)
                .filter(id => id && id !== "");
              const availableForThis = availableCampuses.filter(
                campus => !assignedCampusIds.includes(campus._id)
              );

              return (
                <div key={index} className="space-y-3">
                  {/* Campus Selector */}
                  <div className="flex items-start gap-3">
                    <div className="flex-1 grid gap-3">
                      <Label>Campus {campusAssignments.length > 1 ? `${index + 1}` : ""}</Label>
                      <SelectDropdown
                        options={availableForThis.map(campus => ({
                          value: campus._id,
                          label: `${campus.name}${campus.code ? ` (${campus.code})` : ''}`
                        }))}
                        value={assignment.campusId || ""}
                        onValueChange={(value) => handleCampusChange(index, value as Id<"campuses">)}
                        placeholder="Choose a campus..."
                        label="Campus Options"
                      />
                    </div>

                    {/* Remove button - only show if more than one campus */}
                    {campusAssignments.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCampusAssignment(index)}
                        className="mt-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Campus Configuration Box */}
                  {assignment.campusId && <CampusConfig assignment={assignment} index={index} selectedCampus={selectedCampus} campusGrades={campusGrades} />}
                </div>
              );
            })}

            {/* Add Another Campus Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleAddCampusAssignment}
              className="w-full gap-2"
              disabled={
                // Deshabilitar si hay algún campus sin seleccionar
                campusAssignments.some(a => a.campusId === "") ||
                // O si ya se seleccionaron todos los campuses disponibles
                campusAssignments.filter(a => a.campusId !== "").length >= availableCampuses.length
              }
            >
              <Plus className="h-4 w-4" />
              Add Another Campus
            </Button>
          </div>
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
