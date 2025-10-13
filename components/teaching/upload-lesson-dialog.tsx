"use client"

import { useState, useEffect } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Upload, FileUp, Loader2, Trash2, FileCheck, Circle } from "lucide-react"
import { toast } from "sonner"
import { useCurrentUser } from "@/hooks/use-current-user"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface TeacherDialogProps {
  lesson?: {
    id: string
    title: string
  }
  assignmentId?: Id<"teacher_assignments">
  trigger?: React.ReactNode
}

export function TeacherDialog({ lesson, assignmentId, trigger }: TeacherDialogProps) {
  const { user } = useCurrentUser()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedGradeCode, setSelectedGradeCode] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Query to get assignment details with grades
  const assignmentData = useQuery(
    api.progress.getAssignmentLessonProgress,
    assignmentId ? { assignmentId } : "skip"
  )

  // Get grades from assignment data
  const grades = assignmentData?.grades || []
  const hasMultipleGrades = grades.length > 1

  // Query to get existing lesson progress (returns array for multi-grade support)
  const lessonProgressRecords = useQuery(
    api.lessons.getLessonProgress,
    user && lesson?.id
      ? {
        lessonId: lesson.id as Id<"curriculum_lessons">,
        teacherId: user._id,
      }
      : "skip"
  )

  // Convex mutations
  const generateUploadUrl = useMutation(api.lessons.generateUploadUrl)
  const saveLessonEvidence = useMutation(api.lessons.saveLessonEvidence)
  const deleteLessonEvidence = useMutation(api.lessons.deleteLessonEvidence)

  // Check which grades have evidence
  const gradesWithEvidence = new Set(
    lessonProgressRecords?.map(p => p.gradeCode).filter(Boolean) || []
  )
  const hasEvidence = lessonProgressRecords && lessonProgressRecords.length > 0

  // Get available grades (those without evidence yet) for upload
  const availableGrades = hasMultipleGrades
    ? grades.filter(g => !gradesWithEvidence.has(g.code))
    : grades

  // Reset file selection and grade when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedFile(null)
      setSelectedGradeCode(null)
    } else if (availableGrades.length === 1) {
      // Auto-select if only one grade available
      setSelectedGradeCode(availableGrades[0].code)
    }
  }, [open, availableGrades])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleDeleteEvidence = async () => {
    if (!user || !lesson?.id) {
      toast.error("Missing required information")
      return
    }

    setIsDeleting(true)

    try {
      await deleteLessonEvidence({
        lessonId: lesson.id as Id<"curriculum_lessons">,
        teacherId: user._id,
      })

      toast.success("Evidence deleted successfully!")
      setShowDeleteConfirm(false)
    } catch (error) {
      console.error("Delete error:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to delete evidence"
      )
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedFile) {
      toast.error("Please select a file to upload")
      return
    }

    if (hasMultipleGrades && !selectedGradeCode) {
      toast.error("Please select a grade")
      return
    }

    if (!user) {
      toast.error("You must be logged in to upload evidence")
      return
    }

    if (!lesson?.id) {
      toast.error("Lesson information is missing")
      return
    }

    if (!assignmentId) {
      toast.error("Assignment information is missing")
      return
    }

    setIsUploading(true)

    try {
      // Step 1: Get upload URL from Convex
      const uploadUrl = await generateUploadUrl()

      // Step 2: Upload file to Convex storage
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      })

      if (!result.ok) {
        throw new Error(`Upload failed: ${result.statusText}`)
      }

      const { storageId } = await result.json()

      // Step 3: Save evidence and mark lesson as completed
      await saveLessonEvidence({
        lessonId: lesson.id as Id<"curriculum_lessons">,
        storageId: storageId as Id<"_storage">,
        teacherId: user._id,
        assignmentId: assignmentId,
        gradeCode: selectedGradeCode || undefined, // Include gradeCode if selected
      })

      const gradeMessage = hasMultipleGrades && selectedGradeCode
        ? ` for ${grades.find(g => g.code === selectedGradeCode)?.name}`
        : ""
      toast.success(`Evidence uploaded successfully${gradeMessage}! Lesson marked as completed.`)

      // Reset form and close dialog
      setSelectedFile(null)
      setSelectedGradeCode(null)
      setOpen(false)
    } catch (error) {
      console.error("Upload error:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to upload evidence"
      )
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancel = () => {
    if (!isUploading && !isDeleting) {
      setSelectedFile(null)
      setOpen(false)
    }
  }

  const defaultTrigger = (
    <Button variant="ghost" size="sm" className="gap-2">
      <Upload className="h-4 w-4" />
      <span className="sr-only md:not-sr-only">Upload</span>
    </Button>
  )

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader className="pb-6">
              <DialogTitle className="text-lg font-semibold tracking-tight">
                {hasEvidence ? "Manage Lesson Evidence" : "Upload Lesson Evidence"}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {lesson
                  ? `${hasEvidence ? "View or replace" : "Upload"} completion evidence for "${lesson.title}"`
                  : "Upload your lesson completion evidence"}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6">
              {/* Existing Evidence Display */}
              {hasEvidence && hasMultipleGrades && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium border-b pb-2">Evidence by Grade</h4>
                  <div className="space-y-2">
                    {grades.map((grade) => {
                      const hasGradeEvidence = gradesWithEvidence.has(grade.code)
                      return (
                        <div
                          key={grade.code}
                          className={`border rounded-lg p-3 ${hasGradeEvidence
                              ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                              : "bg-muted/30 border-border"
                            }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              {hasGradeEvidence ? (
                                <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded">
                                  <FileCheck className="h-4 w-4 text-green-700 dark:text-green-400" />
                                </div>
                              ) : (
                                <div className="bg-muted p-2 rounded">
                                  <Circle className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-medium">{grade.name}</p>
                                <p className="text-xs text-muted-foreground">{grade.code}</p>
                              </div>
                            </div>
                            <Badge variant={hasGradeEvidence ? "default" : "outline"} className="text-xs">
                              {hasGradeEvidence ? "Evidence uploaded" : "Pending"}
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {availableGrades.length === 0 && (
                    <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                      ✓ All grades have evidence uploaded
                    </p>
                  )}
                </div>
              )}

              {hasEvidence && !hasMultipleGrades && lessonProgressRecords && lessonProgressRecords.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium border-b pb-2">Current Evidence</h4>
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                          <FileCheck className="h-5 w-5 text-green-700 dark:text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-green-900 dark:text-green-100">
                            Evidence Uploaded
                          </p>
                          <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                            Lesson marked as completed
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={isDeleting}
                        className="gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* File Input - Only shown if there are grades without evidence */}
              {availableGrades.length > 0 && (
                <div className="space-y-4">
                  {hasEvidence && hasMultipleGrades && (
                    <h4 className="text-sm font-medium border-b pb-2">Upload Additional Evidence</h4>
                  )}
                  {!hasEvidence && (
                    <h4 className="text-sm font-medium border-b pb-2">File Upload</h4>
                  )}

                  {/* Grade Selector - Show available grades only */}
                  {availableGrades.length > 0 && (
                    <div className="grid gap-3">
                      <Label htmlFor="grade-select" className="text-sm font-medium">
                        Select Grade
                        {hasMultipleGrades && <span className="text-red-500">*</span>}
                      </Label>
                      <Select
                        value={selectedGradeCode || undefined}
                        onValueChange={(value) => setSelectedGradeCode(value)}
                        disabled={isUploading}
                      >
                        <SelectTrigger id="grade-select">
                          <SelectValue placeholder="Choose a grade..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableGrades.map((grade) => (
                            <SelectItem key={grade.code} value={grade.code}>
                              {grade.name} ({grade.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {hasMultipleGrades
                          ? `Select which grade section this evidence is for. ${gradesWithEvidence.size > 0 ? `${gradesWithEvidence.size} of ${grades.length} grades already have evidence.` : ''}`
                          : `Evidence for ${availableGrades[0]?.name || 'this grade'}`
                        }
                      </p>
                    </div>
                  )}

                  <div className="grid gap-3">
                    <Label htmlFor="file-upload" className="text-sm font-medium">
                      Select File
                      <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="file-upload"
                        type="file"
                        onChange={handleFileChange}
                        className="cursor-pointer"
                        accept="*/*"
                        required
                        disabled={isUploading}
                      />
                    </div>
                    {selectedFile && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <FileUp className="h-3 w-3" />
                        {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-6 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="min-w-[100px]"
                disabled={isUploading || isDeleting}
              >
                {hasEvidence ? "Close" : "Cancel"}
              </Button>
              {!hasEvidence && (
                <Button
                  type="submit"
                  className="bg-deep-koamaru dark:text-white min-w-[100px] gap-2"
                  disabled={!selectedFile || isUploading || (hasMultipleGrades && !selectedGradeCode)}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Add Evidence
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Evidence</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this evidence? This action cannot be undone.
              The lesson will be marked as incomplete.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvidence}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Evidence
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
