"use client";

import { useState, useMemo, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCalendarContext } from "../calendar-context";
import { DateTimePicker } from "@/components/calendar/form/date-time-picker";
import { ColorPicker } from "@/components/calendar/form/color-picker";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SelectDropdown } from "@/components/ui/select-dropdown";
import { Plus, X, Loader2 } from "lucide-react";
import { EntityDialog } from "@/components/ui/entity-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { SchedulableCurriculum } from "../calendar-types";

const formSchema = z
  .object({
    assignmentId: z.string().min(1, "Course is required"),
    lessonId: z.string().min(1, "Lesson is required"),
    start: z.string().min(1, "Start date is required"),
    end: z.string().min(1, "End date is required"),
    color: z.string(),
    groupCode: z.string().min(1, "Grade/Group is required"),
    standards: z.array(z.string()).min(1, "At least one standard is required"),
    objectives: z.string().optional(),
    additionalInfo: z.string().optional(),
  })
  .refine(
    (data) => {
      const start = new Date(data.start);
      const end = new Date(data.end);
      return end >= start;
    },
    {
      message: "End time must be after start time",
      path: ["end"],
    },
  );

type FormValues = z.infer<typeof formSchema>;

export default function CalendarNewEventDialog() {
  const { newEventDialogOpen, setNewEventDialogOpen, date, teacherId } =
    useCalendarContext();

  // State for standards management
  const [standards, setStandards] = useState<string[]>([]);
  const [standardInput, setStandardInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Convex queries and mutations
  const schedulableLessons = useQuery(
    api.lessons.getSchedulableLessons,
    teacherId ? { teacherId } : "skip"
  );

  const createScheduledLesson = useMutation(api.lessons.createScheduledLesson);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      assignmentId: "",
      lessonId: "",
      start: date.toISOString(),
      end: new Date(date.getTime() + 60 * 60 * 1000).toISOString(),
      color: "blue",
      groupCode: "",
      standards: [],
      objectives: "",
      additionalInfo: "",
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (newEventDialogOpen) {
      form.reset({
        assignmentId: "",
        lessonId: "",
        start: date.toISOString(),
        end: new Date(date.getTime() + 60 * 60 * 1000).toISOString(),
        color: "blue",
        groupCode: "",
        standards: [],
        objectives: "",
        additionalInfo: "",
      });
      setStandards([]);
    }
  }, [newEventDialogOpen, date, form]);

  // Watch the selected assignment to update dependent fields
  const selectedAssignmentId = form.watch("assignmentId");
  const selectedLessonId = form.watch("lessonId");

  // Get the selected curriculum data
  const selectedCurriculum = useMemo(() => {
    if (!schedulableLessons || !selectedAssignmentId) return null;
    return schedulableLessons.find(
      (c: SchedulableCurriculum) => c.assignmentId === selectedAssignmentId
    );
  }, [schedulableLessons, selectedAssignmentId]);

  // Get course options for dropdown
  const courseOptions = useMemo(() => {
    if (!schedulableLessons) return [];
    return schedulableLessons.map((curriculum: SchedulableCurriculum) => ({
      value: curriculum.assignmentId,
      label: `${curriculum.curriculumName}${curriculum.curriculumCode ? ` (${curriculum.curriculumCode})` : ""}`,
    }));
  }, [schedulableLessons]);

  // Get lesson options based on selected course
  const lessonOptions = useMemo(() => {
    if (!selectedCurriculum) return [];
    return selectedCurriculum.lessons.map((lesson) => ({
      value: lesson._id,
      label: `Q${lesson.quarter} - ${lesson.title}${lesson.isFullyScheduled ? " ✓" : ""}`,
      disabled: lesson.isFullyScheduled,
    }));
  }, [selectedCurriculum]);

  // Get combined grade+group options based on selected lesson
  const groupOptions = useMemo(() => {
    if (!selectedCurriculum || !selectedLessonId) return [];
    
    const lesson = selectedCurriculum.lessons.find(
      (l) => l._id === selectedLessonId
    );
    
    const options: { value: string; label: string }[] = [];
    
    selectedCurriculum.grades
      .filter((grade) => {
        // Filter out grades that are fully scheduled
        const isScheduled = lesson?.scheduledGrades.includes(grade.code);
        return !isScheduled;
      })
      .forEach((grade) => {
        if (grade.groups.length > 0) {
          // If grade has groups, create an option for each group
          grade.groups.forEach((groupCode) => {
            const groupNumber = groupCode.split("-")[1] || groupCode;
            options.push({
              value: groupCode,
              label: `${grade.name} - Group ${groupNumber}`,
            });
          });
        } else {
          // If no groups, use grade code as value
          options.push({
            value: grade.code,
            label: grade.name,
          });
        }
      });
    
    return options;
  }, [selectedCurriculum, selectedLessonId]);

  // Reset dependent fields when course changes
  const handleCourseChange = (assignmentId: string) => {
    form.setValue("assignmentId", assignmentId);
    form.setValue("lessonId", "");
    form.setValue("groupCode", "");
  };

  // Reset group when lesson changes
  const handleLessonChange = (lessonId: string) => {
    form.setValue("lessonId", lessonId);
    form.setValue("groupCode", "");
  };

  async function onSubmit(values: FormValues) {
    if (!teacherId) {
      toast.error("User not authenticated");
      return;
    }

    setIsSubmitting(true);

    // Extract gradeCode from groupCode (format: "gradeCode-groupNumber")
    // Example: "1A-1" -> gradeCode: "1A", groupCode: "1A-1"
    // Example: "1A" (no group) -> gradeCode: "1A", groupCode: undefined
    const [extractedGradeCode, groupNumber] = values.groupCode.split("-");
    const finalGroupCode = groupNumber ? values.groupCode : undefined;

    try {
      await createScheduledLesson({
        teacherId,
        lessonId: values.lessonId as Id<"curriculum_lessons">,
        assignmentId: values.assignmentId as Id<"teacher_assignments">,
        gradeCode: extractedGradeCode,
        groupCode: finalGroupCode,
        scheduledStart: new Date(values.start).getTime(),
        scheduledEnd: new Date(values.end).getTime(),
        standards: values.standards,
        lessonPlan: values.objectives,
        notes: values.additionalInfo,
        displayColor: values.color,
      });

      toast.success("Lesson scheduled successfully!");
      setNewEventDialogOpen(false);
      form.reset();
      setStandards([]);
    } catch (error) {
      console.error("Failed to create scheduled lesson:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to schedule lesson"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleAddStandard = () => {
    const trimmedInput = standardInput.trim();
    if (trimmedInput && !standards.includes(trimmedInput)) {
      const newStandards = [...standards, trimmedInput];
      setStandards(newStandards);
      form.setValue("standards", newStandards);
      setStandardInput("");
    }
  };

  const handleRemoveStandard = (standardToRemove: string) => {
    const newStandards = standards.filter((s) => s !== standardToRemove);
    setStandards(newStandards);
    form.setValue("standards", newStandards);
  };

  const handleStandardKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddStandard();
    }
  };

  const isLoadingData = schedulableLessons === undefined;

  return (
    <EntityDialog
      trigger="Add New Event"
      title="Schedule Lesson"
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel={isSubmitting ? "Scheduling..." : "Schedule Lesson"}
      isSubmitting={isSubmitting}
      open={newEventDialogOpen}
      onOpenChange={setNewEventDialogOpen}
    >
      <Form {...form}>
        <div className="grid gap-6">
          {isLoadingData ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading courses...</span>
            </div>
          ) : (
            <>
              {/* Course & Lesson Selection */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium border-b pb-2">
                  Basic information
                </h4>
                <div className="grid gap-4">
                  {/* Course Selection */}
                  <FormField
                    control={form.control}
                    name="assignmentId"
                    render={({ field }) => (
                      <FormItem className="grid gap-3">
                        <Label>
                          Course <span className="text-red-500">*</span>
                        </Label>
                        <FormControl>
                          <SelectDropdown
                            options={courseOptions}
                            value={field.value || ""}
                            onValueChange={handleCourseChange}
                            placeholder="Select a course..."
                            label="Your Courses"
                            searchable
                            searchPlaceholder="Search courses..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Lesson Selection - Only show when course is selected */}
                  {selectedCurriculum && (
                    <FormField
                      control={form.control}
                      name="lessonId"
                      render={({ field }) => (
                        <FormItem className="grid gap-3">
                          <Label>
                            Lesson <span className="text-red-500">*</span>
                          </Label>
                          <FormControl>
                            <SelectDropdown
                              options={lessonOptions}
                              value={field.value || ""}
                              onValueChange={handleLessonChange}
                              placeholder="Select a lesson..."
                              label="Available Lessons"
                              searchable
                              searchPlaceholder="Search lessons..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Grade/Group Selection - Only show when lesson is selected */}
                  {selectedCurriculum && selectedLessonId && groupOptions.length > 0 && (
                    <FormField
                      control={form.control}
                      name="groupCode"
                      render={({ field }) => (
                        <FormItem className="grid gap-3">
                          <Label>
                            Grade / Group <span className="text-red-500">*</span>
                          </Label>
                          <FormControl>
                            <SelectDropdown
                              options={groupOptions}
                              value={field.value || ""}
                              onValueChange={field.onChange}
                              placeholder="Select a grade/group..."
                              label="Available Grades & Groups"
                              searchable
                              searchPlaceholder="Search grades..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Show message when all grades are scheduled */}
                  {selectedCurriculum && selectedLessonId && groupOptions.length === 0 && (
                    <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md">
                      All grades for this lesson are already scheduled. Please select a different lesson.
                    </div>
                  )}
                </div>
              </div>

              {/* Objectives */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium border-b pb-2">Objectives</h4>
                <div className="grid gap-4">
                  <FormField
                    control={form.control}
                    name="objectives"
                    render={({ field }) => (
                      <FormItem className="grid gap-3">
                        <FormControl>
                          <Textarea
                            className="resize-none min-h-[80px]"
                            placeholder="Enter objectives for this lesson..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Standards Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium border-b pb-2">
                  Standards <span className="text-red-500">*</span>
                </h4>
                <div className="grid gap-4">
                  <div className="grid gap-3">
                    <Label htmlFor="standardCode">
                      Code <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="standardCode"
                      placeholder="e.g., ELA.12.R.3.2"
                      value={standardInput}
                      onChange={(e) => setStandardInput(e.target.value)}
                      onKeyDown={handleStandardKeyDown}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2 w-fit"
                    onClick={handleAddStandard}
                    disabled={!standardInput.trim()}
                  >
                    <Plus className="h-4 w-4" />
                    Add Standard
                  </Button>

                  {/* Standards Badges */}
                  {standards.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {standards.map((standard) => (
                        <Badge
                          key={standard}
                          variant="secondary"
                          className="gap-1 pr-1"
                        >
                          {standard}
                          <button
                            type="button"
                            onClick={() => handleRemoveStandard(standard)}
                            className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
                            aria-label={`Remove ${standard}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium border-b pb-2">
                  Additional Information
                </h4>
                <div className="grid gap-4">
                  <FormField
                    control={form.control}
                    name="additionalInfo"
                    render={({ field }) => (
                      <FormItem className="grid gap-3">
                        <FormControl>
                          <Textarea
                            className="resize-none min-h-[80px]"
                            placeholder="Enter any additional notes or information..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Schedule */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium border-b pb-2">
                  Schedule <span className="text-red-500">*</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="start"
                    render={({ field }) => (
                      <FormItem className="grid gap-3">
                        <Label>
                          Start <span className="text-red-500">*</span>
                        </Label>
                        <FormControl>
                          <DateTimePicker field={field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="end"
                    render={({ field }) => (
                      <FormItem className="grid gap-3">
                        <Label>
                          End <span className="text-red-500">*</span>
                        </Label>
                        <FormControl>
                          <DateTimePicker field={field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Color */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium border-b pb-2">Customization</h4>
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem className="grid gap-3">
                      <Label>Color</Label>
                      <FormControl>
                        <ColorPicker field={field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </>
          )}
        </div>
      </Form>
    </EntityDialog>
  );
}
