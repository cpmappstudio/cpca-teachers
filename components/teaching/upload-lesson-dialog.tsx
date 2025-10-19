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

import { Upload, FileUp, Loader2, Trash2, FileCheck, Circle, Eye } from "lucide-react"
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
import Image from "next/image"

interface TeacherDialogProps {
  lesson?: {
    id: string
    title: string
  }
  assignmentId?: Id<"teacher_assignments">
  selectedGrade?: string // Current selected grade from the page
  trigger?: React.ReactNode
}

export function TeacherDialog({ lesson, assignmentId, selectedGrade, trigger }: TeacherDialogProps) {
  const { user } = useCurrentUser()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedGroupCode, setSelectedGroupCode] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null) // Track which group to delete
  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false) // For evidence viewer dialog
  const [selectedEvidence, setSelectedEvidence] = useState<{
    storageId: Id<"_storage">,
    type: "image" | "pdf",
    groupName?: string
  } | null>(null) // Track which evidence to view

  // Query to get assignment details with groups
  const assignmentData = useQuery(
    api.progress.getAssignmentLessonProgress,
    assignmentId ? { assignmentId } : "skip"
  )

  // Get groups from assignment data
  const assignedGroupCodes = assignmentData?.assignedGroupCodes || []
  const grades = assignmentData?.grades || []

  // Filter groups by selected grade (if provided from page)
  const filteredGroupCodes = selectedGrade
    ? assignedGroupCodes.filter((groupCode: string) => groupCode.startsWith(selectedGrade + "-"))
    : assignedGroupCodes

  // Build group objects with names
  const groups = filteredGroupCodes.map((groupCode: string) => {
    const [gradeCode, groupNumber] = groupCode.split('-')
    const grade = grades.find(g => g.code === gradeCode)
    return {
      code: groupCode,
      name: `${grade?.name || gradeCode} - Group ${groupNumber}`,
      gradeCode,
      groupNumber
    }
  })
  const hasMultipleGroups = groups.length > 1

  // Query to get existing lesson progress (returns array for multi-group support)
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

  // Check which groups have evidence (only count records that have actual files uploaded)
  const groupsWithEvidence = new Set(
    lessonProgressRecords
      ?.filter(p => p.evidenceDocumentStorageId || p.evidencePhotoStorageId)
      .map(p => p.groupCode)
      .filter(Boolean) || []
  )
  const hasEvidence = lessonProgressRecords?.some(p => p.evidenceDocumentStorageId || p.evidencePhotoStorageId) || false

  // Get available groups (those without evidence yet) for upload
  const availableGroups = hasMultipleGroups
    ? groups.filter(g => !groupsWithEvidence.has(g.code))
    : groups

  // Reset file selection and group when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedFile(null)
      setSelectedGroupCode(null)
    } else if (availableGroups.length === 1) {
      // Auto-select if only one group available
      setSelectedGroupCode(availableGroups[0].code)
    }
  }, [open, availableGroups])

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
        groupCode: groupToDelete || undefined, // Pass groupCode if deleting specific group
      })

      const groupMessage = groupToDelete && hasMultipleGroups
        ? ` for ${groups.find(g => g.code === groupToDelete)?.name}`
        : ""
      toast.success(`Evidence deleted successfully${groupMessage}!`)
      setShowDeleteConfirm(false)
      setGroupToDelete(null)
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

    if (hasMultipleGroups && !selectedGroupCode) {
      toast.error("Please select a group")
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
        groupCode: selectedGroupCode || undefined, // Include groupCode if selected
      })

      const groupMessage = hasMultipleGroups && selectedGroupCode
        ? ` for ${groups.find(g => g.code === selectedGroupCode)?.name}`
        : ""
      toast.success(`Evidence uploaded successfully${groupMessage}! Lesson marked as completed.`)

      // Reset form and close dialog
      setSelectedFile(null)
      setSelectedGroupCode(null)
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
              {hasEvidence && groups.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium border-b pb-2">{hasMultipleGroups ? "Evidence by Group" : "Current Evidence"}</h4>
                  <div className="space-y-2">
                    {groups.map((group) => {
                      const groupProgress = lessonProgressRecords?.find(p => p.groupCode === group.code)
                      const hasGroupEvidence = !!(groupProgress?.evidenceDocumentStorageId || groupProgress?.evidencePhotoStorageId)
                      return (
                        <div
                          key={group.code}
                          className={`border rounded-lg p-3 ${hasGroupEvidence
                            ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                            : "bg-muted/30 border-border"
                            }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {hasGroupEvidence ? (
                                <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded flex-shrink-0">
                                  <FileCheck className="h-4 w-4 text-green-700 dark:text-green-400" />
                                </div>
                              ) : (
                                <div className="bg-muted p-2 rounded flex-shrink-0">
                                  <Circle className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{group.name}</p>
                                <p className="text-xs text-muted-foreground">{group.code}</p>
                                {hasGroupEvidence && groupProgress.completedAt && (
                                  <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                                    Uploaded {new Date(groupProgress.completedAt).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge variant={hasGroupEvidence ? "default" : "outline"} className="text-xs">
                                {hasGroupEvidence ? "Uploaded" : "Pending"}
                              </Badge>
                              {hasGroupEvidence && (
                                <>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const evidenceId = groupProgress.evidenceDocumentStorageId || groupProgress.evidencePhotoStorageId
                                      const evidenceType = groupProgress.evidencePhotoStorageId ? "image" : "pdf"
                                      if (evidenceId) {
                                        setSelectedEvidence({
                                          storageId: evidenceId,
                                          type: evidenceType,
                                          groupName: group.name
                                        })
                                        setEvidenceDialogOpen(true)
                                      }
                                    }}
                                    className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setGroupToDelete(group.code)
                                      setShowDeleteConfirm(true)
                                    }}
                                    disabled={isDeleting}
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {availableGroups.length === 0 && (
                    <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                      ✓ All groups have evidence uploaded
                    </p>
                  )}
                </div>
              )}

              {/* File Input - Only shown if there are groups without evidence */}
              {availableGroups.length > 0 && (
                <div className="space-y-4">
                  {hasEvidence && groups.length > 0 && (
                    <h4 className="text-sm font-medium border-b pb-2">Upload Additional Evidence</h4>
                  )}
                  {!hasEvidence && (
                    <h4 className="text-sm font-medium border-b pb-2">File Upload</h4>
                  )}

                  {/* Group Selector - Show available groups only */}
                  {availableGroups.length > 0 && (
                    <div className="grid gap-3">
                      <Label htmlFor="group-select" className="text-sm font-medium">
                        Select Group
                        {hasMultipleGroups && <span className="text-red-500">*</span>}
                      </Label>
                      <Select
                        value={selectedGroupCode || undefined}
                        onValueChange={(value) => setSelectedGroupCode(value)}
                        disabled={isUploading}
                      >
                        <SelectTrigger id="group-select">
                          <SelectValue placeholder="Choose a group..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableGroups.map((group) => (
                            <SelectItem key={group.code} value={group.code}>
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {hasMultipleGroups
                          ? `Select which group this evidence is for. ${groupsWithEvidence.size > 0 ? `${groupsWithEvidence.size} of ${groups.length} groups already have evidence.` : ''}`
                          : `Evidence for ${availableGroups[0]?.name || 'this group'}`
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
                {availableGroups.length === 0 ? "Close" : "Cancel"}
              </Button>
              {availableGroups.length > 0 && (
                <Button
                  type="submit"
                  className="bg-deep-koamaru dark:text-white min-w-[100px] gap-2"
                  disabled={!selectedFile || isUploading || (hasMultipleGroups && !selectedGroupCode)}
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
              {groupToDelete && hasMultipleGroups
                ? `Are you sure you want to delete the evidence for ${groups.find(g => g.code === groupToDelete)?.name}? This action cannot be undone.`
                : "Are you sure you want to delete this evidence? This action cannot be undone. The lesson will be marked as incomplete."
              }
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

      {/* Evidence Viewer Dialog */}
      <Dialog open={evidenceDialogOpen} onOpenChange={setEvidenceDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] p-0 gap-0">
          <DialogTitle className="sr-only">
            {selectedEvidence?.groupName ? `${selectedEvidence.groupName} Evidence` : "Lesson Evidence"}
          </DialogTitle>
          {selectedEvidence && (
            <div className="p-4">
              <EvidenceViewer
                storageId={selectedEvidence.storageId}
                type={selectedEvidence.type}
                title={selectedEvidence.groupName || "Evidence"}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// Component to view evidence in full size
function EvidenceViewer({
  storageId,
  type,
  title
}: {
  storageId: Id<"_storage">,
  type: "image" | "pdf",
  title: string
}) {
  const url = useQuery(api.progress.getStorageUrl, { storageId });

  if (!url) {
    return <div className="w-full h-96 bg-muted animate-pulse rounded-lg" />;
  }

  if (type === "image") {
    return (
      <div className="w-full space-y-3">
        <div className="relative w-full" style={{ height: 'calc(90vh - 140px)' }}>
          <Image
            src={url}
            alt={title}
            fill
            className="object-contain"
            unoptimized
          />
        </div>
      </div>
    );
  }

  // PDF viewer
  return (
    <div className="w-full space-y-3">
      <iframe
        src={url}
        className="w-full border-0"
        style={{ height: 'calc(90vh - 140px)' }}
        title={title}
      />
    </div>
  );
}
