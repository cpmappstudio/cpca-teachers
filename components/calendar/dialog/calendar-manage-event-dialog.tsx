import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectDropdown } from "@/components/ui/select-dropdown";
import { Badge } from "@/components/ui/badge";
import { Plus, Save, Trash2, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z
  .object({
    course: z.string().min(1, "Course is required"),
    lesson: z.string().min(1, "Lesson is required"),
    start: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid start date",
    }),
    end: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid end date",
    }),
    color: z.string(),
    grades: z.array(z.string()).min(1, "At least one grade is required"),
    standards: z.array(z.string()).min(1, "At least one standard is required"),
    objectives: z.string().optional(),
    additionalInfo: z.string().optional(),
  })
  .refine(
    (data) => {
      try {
        const start = new Date(data.start);
        const end = new Date(data.end);
        return end >= start;
      } catch {
        return false;
      }
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

export default function CalendarManageEventDialog() {
  const {
    manageEventDialogOpen,
    setManageEventDialogOpen,
    selectedEvent,
    setSelectedEvent,
    events,
    setEvents,
  } = useCalendarContext();

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
      start: "",
      end: "",
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

  useEffect(() => {
    if (selectedEvent) {
      const eventStandards = selectedEvent.standards || [];
      const eventGrades = selectedEvent.grades || [];
      form.reset({
        course: selectedEvent.course || "",
        lesson: selectedEvent.lesson || "",
        start: selectedEvent.start.toISOString(),
        end: selectedEvent.end.toISOString(),
        color: selectedEvent.color,
        grades: eventGrades,
        standards: eventStandards,
        objectives: selectedEvent.objectives || "",
        additionalInfo: selectedEvent.additionalInfo || "",
      });
      setStandards(eventStandards);
      setSelectedGrades(eventGrades);
    }
  }, [selectedEvent, form]);

  // Handle course change - reset dependent fields
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
    if (!selectedEvent) return;

    const updatedEvent = {
      ...selectedEvent,
      course: values.course,
      grades: values.grades,
      start: new Date(values.start),
      end: new Date(values.end),
      color: values.color,
      standards: values.standards,
      objectives: values.objectives,
      additionalInfo: values.additionalInfo,
      lesson: values.lesson,
    };

    setEvents(
      events.map((event) =>
        event.id === selectedEvent.id ? updatedEvent : event,
      ),
    );
    handleClose();
  }

  function handleDelete() {
    if (!selectedEvent) return;
    setEvents(events.filter((event) => event.id !== selectedEvent.id));
    handleClose();
  }

  function handleClose() {
    setManageEventDialogOpen(false);
    setSelectedEvent(null);
    form.reset();
    setStandards([]);
    setStandardInput("");
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

  return (
    <Dialog open={manageEventDialogOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage event</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                            id={`manage-grade-${grade.code}`}
                            checked={selectedGrades.includes(grade.code)}
                            onCheckedChange={() =>
                              handleGradeToggle(grade.code)
                            }
                          />
                          <label
                            htmlFor={`manage-grade-${grade.code}`}
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
              <h4 className="text-sm font-medium border-b pb-2">
                Customization
              </h4>
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

            <DialogFooter className="flex justify-between gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" type="button">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete event</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this event? This action
                      cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button type="submit">
                <Save className="h-4 w-4" />
                Update event
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
