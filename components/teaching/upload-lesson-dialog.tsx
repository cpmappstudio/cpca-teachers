"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Upload, FileUp } from "lucide-react"

interface TeacherDialogProps {
  lesson?: {
    id: string
    title: string
  }
  trigger?: React.ReactNode
}

export function TeacherDialog({ lesson, trigger }: TeacherDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [comment, setComment] = useState("")
  const [open, setOpen] = useState(false)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedFile) {
      alert("Please select a file to upload")
      return
    }

    // TODO: Implement actual file upload logic
    console.log("Uploading lesson proof:", {
      lessonId: lesson?.id,
      lessonTitle: lesson?.title,
      file: selectedFile.name,
      fileSize: selectedFile.size,
      fileType: selectedFile.type,
      comment: comment.trim(),
    })

    alert(`File "${selectedFile.name}" would be uploaded here`)

    // Reset form
    setSelectedFile(null)
    setComment("")
    setOpen(false)
  }

  const handleCancel = () => {
    setSelectedFile(null)
    setComment("")
    setOpen(false)
  }

  const defaultTrigger = (
    <Button variant="ghost" size="sm" className="gap-2">
      <Upload className="h-4 w-4" />
      <span className="sr-only md:not-sr-only">Upload</span>
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pb-4">
            <DialogTitle className="text-lg font-semibold tracking-tight">
              Upload Lesson Proof
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {lesson
                ? `Upload your completion proof for "${lesson.title}"`
                : "Upload your lesson completion proof"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-4 md:px-6 py-4">
            {/* File Input */}
            <div className="space-y-2">
              <Label htmlFor="file-upload" className="text-sm font-medium">
                Select File *
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="file-upload"
                  type="file"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
              </div>
              {selectedFile && (
                <p className="text-xs text-muted-foreground">
                  <FileUp className="inline h-3 w-3 mr-1" />
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            {/* Comment Textarea */}
            <div className="space-y-2">
              <Label htmlFor="comment" className="text-sm font-medium">
                Additional Comments (Optional)
              </Label>
              <Textarea
                id="comment"
                placeholder="Add any notes or context about this submission..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="min-w-[100px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-deep-koamaru dark:text-white min-w-[100px] gap-2"
              disabled={!selectedFile}
            >
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
