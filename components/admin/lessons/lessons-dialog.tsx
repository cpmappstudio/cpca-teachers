"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SelectDropdown } from "@/components/ui/select-dropdown"
import { EntityDialog } from "@/components/ui/entity-dialog"
import { Plus, Edit, Trash2, BookOpen, Link2, ListChecks, FilePlus2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"

interface LessonDialogProps {
  lesson?: {
    id: string
    curriculumId: string
    title: string
    description?: string
    quarter: number
    orderInQuarter: number
    expectedDurationMinutes?: number
    resources?: { name: string; url: string; type: string; isRequired: boolean }[]
    objectives?: string[]
    isActive: boolean
    isMandatory: boolean
  }
  trigger?: React.ReactNode
  curriculumOptions?: { value: string; label: string }[]
}

export function LessonsDialog({ lesson, trigger, curriculumOptions }: LessonDialogProps) {
  const isEditing = !!lesson

  // Mocks iniciales
  const mockCurriculumOptions = curriculumOptions || [
    { value: "curr-001", label: "Mathematics Grade 10" },
    { value: "curr-002", label: "Science Grade 9" },
    { value: "curr-003", label: "History Grade 8" },
  ]

  const quarterOptions = [
    { value: "1", label: "Quarter 1" },
    { value: "2", label: "Quarter 2" },
    { value: "3", label: "Quarter 3" },
    { value: "4", label: "Quarter 4" },
  ]

  const resourceTypeOptions = [
    { value: "document", label: "Document" },
    { value: "video", label: "Video" },
    { value: "link", label: "External Link" },
    { value: "worksheet", label: "Worksheet" },
  ]

  const [selectedCurriculum, setSelectedCurriculum] = useState<string>(
    lesson?.curriculumId || mockCurriculumOptions[0].value
  )
  const [selectedQuarter, setSelectedQuarter] = useState<string>(
    lesson?.quarter?.toString() || "1"
  )
  const [isActive, setIsActive] = useState<boolean>(lesson?.isActive ?? true)
  const [isMandatory, setIsMandatory] = useState<boolean>(lesson?.isMandatory ?? true)

  // List states
  const [objectives, setObjectives] = useState<string[]>(
    lesson?.objectives || ["Understand lesson basics"]
  )
  const [newObjective, setNewObjective] = useState("")

  const [resources, setResources] = useState<
    { name: string; url: string; type: string; isRequired: boolean }[]
  >(
    lesson?.resources || [
      {
        name: "Teacher Guide",
        url: "https://example.com/guide.pdf",
        type: "document",
        isRequired: true,
      },
    ]
  )

  const [editingResourceIndex, setEditingResourceIndex] = useState<number | null>(null)
  const [resourceDraft, setResourceDraft] = useState({
    name: "",
    url: "",
    type: "document",
    isRequired: true,
  })

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    formData.set("curriculumId", selectedCurriculum)
    formData.set("quarter", selectedQuarter)
    formData.set("isActive", isActive ? "true" : "false")
    formData.set("isMandatory", isMandatory ? "true" : "false")
    formData.set("objectives", JSON.stringify(objectives))
    formData.set("resources", JSON.stringify(resources))

    if (isEditing) {
      console.log("Updating lesson with form data:", Object.fromEntries(formData))
    } else {
      console.log("Creating lesson with form data:", Object.fromEntries(formData))
    }
  }

  const handleDelete = () => {
    if (
      lesson &&
      window.confirm(
        `Are you sure you want to delete lesson "${lesson.title}"? This action cannot be undone.`
      )
    ) {
      console.log("Deleting lesson:", lesson.id)
      alert("Lesson deletion would be implemented here")
    }
  }

  // Objectives handlers
  const addObjective = () => {
    if (newObjective.trim()) {
      setObjectives([...objectives, newObjective.trim()])
      setNewObjective("")
    }
  }

  const removeObjective = (index: number) => {
    setObjectives(objectives.filter((_, i) => i !== index))
  }

  // Resource handlers
  const startAddResource = () => {
    setEditingResourceIndex(resources.length)
    setResourceDraft({ name: "", url: "", type: "document", isRequired: true })
  }

  const startEditResource = (index: number) => {
    const resource = resources[index]
    setEditingResourceIndex(index)
    setResourceDraft({ ...resource })
  }

  const cancelResourceEdit = () => {
    setEditingResourceIndex(null)
  }

  const saveResource = () => {
    if (!resourceDraft.name.trim() || !resourceDraft.url.trim()) return

    setResources((prev) => {
      const next = [...prev]
      if (editingResourceIndex === prev.length) {
        next.push(resourceDraft)
      } else if (editingResourceIndex !== null) {
        next[editingResourceIndex] = resourceDraft
      }
      return next
    })
    setEditingResourceIndex(null)
  }

  const removeResource = (index: number) => {
    setResources(resources.filter((_, i) => i !== index))
  }

  // Trigger por defecto
  const defaultTrigger = isEditing ? (
    <Button className="gap-2 cursor-pointer">
      <Edit className="h-4 w-4" />
      Edit lesson
    </Button>
  ) : (
    <Button className="bg-deep-koamaru h-9 dark:text-white gap-2">
      <Plus className="h-4 w-4" />
      <span className="hidden md:inline">Add Lesson</span>
    </Button>
  )

  return (
    <EntityDialog
      trigger={trigger || defaultTrigger}
      title={isEditing ? "Edit Lesson" : "Create New Lesson"}
      description={
        isEditing
          ? "Make changes to the lesson information. Click save when you're done."
          : "Add a new lesson to a curriculum. Fill in the required information and click create."
      }
      onSubmit={handleSubmit}
      submitLabel={isEditing ? "Save changes" : "Create Lesson"}
      leftActions={
        isEditing ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            className="gap-2 bg-rose-100 text-rose-800 hover:bg-rose-200 border-rose-200 dark:bg-rose-900/20 dark:text-rose-200 min-w-[120px] whitespace-nowrap"
          >
            <Trash2 className="h-4 w-4" />
            Delete Lesson
          </Button>
        ) : undefined
      }
    >
      <div className="grid gap-6">
        <input type="hidden" name="curriculumId" value={selectedCurriculum} />
        <input type="hidden" name="quarter" value={selectedQuarter} />
        <input type="hidden" name="isActive" value={isActive ? "true" : "false"} />
        <input type="hidden" name="isMandatory" value={isMandatory ? "true" : "false"} />
        <input type="hidden" name="objectives" value={JSON.stringify(objectives)} />
        <input type="hidden" name="resources" value={JSON.stringify(resources)} />

        {/* Basic Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid gap-3">
            <Label htmlFor="curriculumId">Curriculum *</Label>
            <SelectDropdown
              options={mockCurriculumOptions}
              value={selectedCurriculum}
              onValueChange={(value) => setSelectedCurriculum(value)}
              placeholder="Select curriculum..."
              label="Curriculum Options"
            />
          </div>
          <div className="grid gap-3">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              name="title"
              defaultValue={lesson?.title || ""}
              placeholder={isEditing ? "" : "e.g., Introduction to Algebra"}
              required
            />
          </div>
        </div>

        {/* Description */}
        <div className="grid gap-3">
          <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={lesson?.description || ""}
              placeholder={
                isEditing ? "" : "Provide a brief description of the lesson objectives and scope..."
              }
              rows={4}
              className="resize-none"
            />
        </div>

        {/* Quarter & Ordering */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="grid gap-3">
            <Label htmlFor="quarter">Quarter *</Label>
            <SelectDropdown
              options={quarterOptions}
              value={selectedQuarter}
              onValueChange={(value) => setSelectedQuarter(value)}
              placeholder="Select quarter..."
              label="Quarter Options"
            />
          </div>
          <div className="grid gap-3">
            <Label htmlFor="orderInQuarter">Order in Quarter *</Label>
            <Input
              id="orderInQuarter"
              name="orderInQuarter"
              type="number"
              min={1}
              defaultValue={lesson?.orderInQuarter || 1}
              required
            />
          </div>
          <div className="grid gap-3">
            <Label htmlFor="expectedDurationMinutes">Expected Duration (min)</Label>
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

        {/* Status Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 border rounded-md p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Active Status</Label>
                <p className="text-xs text-muted-foreground">
                  Controls whether this lesson is currently available.
                </p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
                aria-label="Toggle active status"
              />
            </div>
          </div>
          <div className="space-y-2 border rounded-md p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Mandatory</Label>
                <p className="text-xs text-muted-foreground">
                  Indicates if this lesson is required or optional.
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

        {/* Objectives */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium border-b pb-2 flex items-center gap-2">
            <ListChecks className="h-4 w-4" /> Objectives
          </h4>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Add learning objective..."
                value={newObjective}
                onChange={(e) => setNewObjective(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addObjective()
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
        </div>

        {/* Resources */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium border-b pb-2 flex items-center gap-2">
            <FilePlus2 className="h-4 w-4" /> Resources
          </h4>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={startAddResource}
                className="gap-2"
              >
                <Plus className="h-4 w-4" /> Add Resource
              </Button>
            </div>
            <div className="space-y-3">
              {resources.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No resources added yet.
                </p>
              )}
              <ul className="space-y-3">
                {resources.map((res, index) => {
                  const isEditingRow = editingResourceIndex === index
                  return (
                    <li
                      key={index}
                      className="rounded-md border p-3 space-y-3 bg-muted/30"
                    >
                      {isEditingRow ? (
                        <div className="grid gap-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                              <Label className="text-xs">Name *</Label>
                              <Input
                                value={resourceDraft.name}
                                onChange={(e) =>
                                  setResourceDraft({ ...resourceDraft, name: e.target.value })
                                }
                                placeholder="e.g., Student Worksheet"
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label className="text-xs">URL *</Label>
                              <Input
                                value={resourceDraft.url}
                                onChange={(e) =>
                                  setResourceDraft({ ...resourceDraft, url: e.target.value })
                                }
                                placeholder="https://..."
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="grid gap-2">
                              <Label className="text-xs">Type *</Label>
                              <SelectDropdown
                                options={resourceTypeOptions}
                                value={resourceDraft.type}
                                onValueChange={(value) =>
                                  setResourceDraft({ ...resourceDraft, type: value })
                                }
                                placeholder="Select type"
                                label="Resource Types"
                              />
                            </div>
                            <div className="flex items-center gap-3 pt-5">
                              <Label className="text-xs">Required?</Label>
                              <Switch
                                checked={resourceDraft.isRequired}
                                onCheckedChange={(val) =>
                                  setResourceDraft({ ...resourceDraft, isRequired: !!val })
                                }
                                aria-label="Toggle resource requirement"
                              />
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={cancelResourceEdit}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={saveResource}
                                className="bg-deep-koamaru dark:text-white"
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-sm flex items-center gap-2">
                                <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                                {res.name}
                              </span>
                              <span className="text-xs text-muted-foreground break-all">
                                {res.url}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
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
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => startEditResource(index)}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7 text-rose-600 hover:text-rose-700"
                              onClick={() => removeResource(index)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
              {editingResourceIndex === resources.length && (
                <div className="rounded-md border p-3 bg-muted/20">
                  <p className="text-xs text-muted-foreground mb-2">
                    Adding new resource...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </EntityDialog>
  )
}
