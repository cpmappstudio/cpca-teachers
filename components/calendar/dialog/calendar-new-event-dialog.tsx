"use client";

import { useState, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { Plus, X } from "lucide-react";
import { EntityDialog } from "@/components/ui/entity-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z
  .object({
    course: z.string().min(1, "Course is required"),
    lesson: z.string().min(1, "Lesson is required"),
    start: z.string().min(1, "Start date is required"),
    end: z.string().min(1, "End date is required"),
    color: z.string(),
    grades: z.array(z.string()).min(1, "At least one grade is required"),
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

// Mock data for courses (curriculums)
const mockCourses = [
  {
    id: "course1",
    name: "English Language Arts",
    code: "ELA-101",
    grades: [
      { code: "9", name: "9th Grade", groups: ["9-A", "9-B", "9-C"] },
      { code: "10", name: "10th Grade", groups: ["10-A", "10-B"] },
      { code: "11", name: "11th Grade", groups: ["11-A", "11-B", "11-C"] },
    ],
    lessons: [
      { id: "lesson1-1", name: "Introduction to Literature" },
      { id: "lesson1-2", name: "Essay Writing Fundamentals" },
      { id: "lesson1-3", name: "Poetry Analysis" },
    ],
  },
  {
    id: "course2",
    name: "Mathematics",
    code: "MATH-201",
    grades: [
      { code: "9", name: "9th Grade", groups: ["9-A", "9-B"] },
      { code: "10", name: "10th Grade", groups: ["10-A", "10-B", "10-C"] },
    ],
    lessons: [
      { id: "lesson2-1", name: "Algebraic Expressions" },
      { id: "lesson2-2", name: "Quadratic Equations" },
      { id: "lesson2-3", name: "Trigonometry Basics" },
      { id: "lesson2-4", name: "Calculus Introduction" },
    ],
  },
  {
    id: "course3",
    name: "Science",
    code: "SCI-301",
    grades: [
      { code: "10", name: "10th Grade", groups: ["10-A", "10-B"] },
      { code: "11", name: "11th Grade", groups: ["11-A", "11-B"] },
      { code: "12", name: "12th Grade", groups: ["12-A"] },
    ],
    lessons: [
      { id: "lesson3-1", name: "Cell Biology" },
      { id: "lesson3-2", name: "Chemical Reactions" },
      { id: "lesson3-3", name: "Physics of Motion" },
    ],
  },
];

// Convert to dropdown options
const courseOptions = mockCourses.map((course) => ({
  value: course.id,
  label: `${course.name} (${course.code})`,
}));

export default function CalendarNewEventDialog() {
  const { newEventDialogOpen, setNewEventDialogOpen, date, events, setEvents } =
    useCalendarContext();

  // State for standards management
  const [standards, setStandards] = useState<string[]>([]);
  const [standardInput, setStandardInput] = useState("");

  // State for selected grades (multiple selection)
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      course: "",
      lesson: "",
      start: date.toISOString(),
      end: date.toISOString(),
      color: "blue",
      grades: [],
      standards: [],
      objectives: "",
      additionalInfo: "",
    },
  });

  // Watch the selected course to update dependent fields
  const selectedCourseId = form.watch("course");

  // Get the selected course data
  const selectedCourse = useMemo(() => {
    return mockCourses.find((c) => c.id === selectedCourseId);
  }, [selectedCourseId]);

  // Get lesson options based on selected course
  const lessonOptions = useMemo(() => {
    if (!selectedCourse) return [];
    return selectedCourse.lessons.map((lesson) => ({
      value: lesson.id,
      label: lesson.name,
    }));
  }, [selectedCourse]);

  // Reset dependent fields when course changes
  const handleCourseChange = (courseId: string) => {
    form.setValue("course", courseId);
    form.setValue("lesson", ""); // Reset lesson when course changes
    form.setValue("grades", []); // Reset grades in form when course changes
    setSelectedGrades([]); // Reset grades state when course changes
  };

  // Handle grade toggle
  const handleGradeToggle = (gradeCode: string) => {
    setSelectedGrades((prev) => {
      const newGrades = prev.includes(gradeCode)
        ? prev.filter((g) => g !== gradeCode)
        : [...prev, gradeCode];
      form.setValue("grades", newGrades);
      return newGrades;
    });
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("Form submitted with values:", values);
    const newEvent = {
      id: crypto.randomUUID(),
      start: new Date(values.start),
      end: new Date(values.end),
      color: values.color,
      course: values.course,
      grades: values.grades,
      standards: values.standards,
      objectives: values.objectives,
      additionalInfo: values.additionalInfo,
      lesson: values.lesson,
    };

    console.log("New event created:", newEvent);
    setEvents([...events, newEvent]);
    setNewEventDialogOpen(false);
    form.reset();
    setStandards([]);
    setSelectedGrades([]);
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

  // Debug: ver errores de validación
  console.log("Form errors:", form.formState.errors);

  return (
    <EntityDialog
      trigger="Add New Event"
      title="Create New Event"
      onSubmit={form.handleSubmit(onSubmit, (errors) => {
        console.log("Validation errors:", errors);
      })}
      submitLabel="Create Event"
      isSubmitting={false}
      open={newEventDialogOpen}
      onOpenChange={setNewEventDialogOpen}
    >
      <Form {...form}>
        <div className="grid gap-6">
          {/* Course & Lesson Selection */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium border-b pb-2">
              Basic information
            </h4>
            <div className="grid gap-4">
              {/* Course Selection */}
              <FormField
                control={form.control}
                name="course"
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
                        label="Available Courses"
                        searchable
                        searchPlaceholder="Search courses..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Lesson Selection - Only show when course is selected */}
              {selectedCourse && (
                <FormField
                  control={form.control}
                  name="lesson"
                  render={({ field }) => (
                    <FormItem className="grid gap-3">
                      <Label>
                        Lesson <span className="text-red-500">*</span>
                      </Label>
                      <FormControl>
                        <SelectDropdown
                          options={lessonOptions}
                          value={field.value || ""}
                          onValueChange={field.onChange}
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

              {/* Grades Selection - Only show when course is selected */}
              {selectedCourse && (
                <div className="grid gap-3">
                  <Label>
                    Grades <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex flex-wrap gap-3">
                    {selectedCourse.grades.map((grade) => (
                      <div
                        key={grade.code}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`grade-${grade.code}`}
                          checked={selectedGrades.includes(grade.code)}
                          onCheckedChange={() => handleGradeToggle(grade.code)}
                        />
                        <label
                          htmlFor={`grade-${grade.code}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {grade.name}
                        </label>
                      </div>
                    ))}
                  </div>
                  {selectedGrades.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedGrades.map((gradeCode) => {
                        const grade = selectedCourse.grades.find(
                          (g) => g.code === gradeCode,
                        );
                        return (
                          <Badge key={gradeCode} variant="secondary">
                            {grade?.name || gradeCode}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
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
            <h4 className="text-sm font-medium border-b pb-2">Standards <span className="text-red-500">*</span> </h4>
            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
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
            <h4 className="text-sm font-medium border-b pb-2">Schedule <span className="text-red-500">*</span> </h4>
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

          <div className="space-y-4">
            <h4 className="text-sm font-medium border-b pb-2">Customization</h4>
            <div className="grid grid-cols-1 sm:grid-cols-1 gap-4"></div>
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
        </div>
      </Form>
    </EntityDialog>
  );
}
