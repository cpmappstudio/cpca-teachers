"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FilePlus2, Link2 } from "lucide-react"

interface LessonResourcesCardProps {
  lessonId: string
}

export function LessonResourcesCard({ lessonId }: LessonResourcesCardProps) {
  const mockResources = [
    { name: "Teacher Guide", url: "https://example.com/guide.pdf", type: "document", isRequired: true },
    { name: "Overview Video", url: "https://example.com/video", type: "video", isRequired: false },
    { name: "Reference Article", url: "https://example.com/article", type: "link", isRequired: false },
  ]

  return (
    <Card className="w-full h-full overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold tracking-tight">Resources</CardTitle>
        <CardDescription className="text-sm">Supporting materials linked to this lesson.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-4 md:px-6 pt-0 pb-4">
        {mockResources.length === 0 && (
          <p className="text-sm text-muted-foreground">No resources added.</p>
        )}
  <ul className="space-y-3">
          {mockResources.map((res, index) => (
            <li key={index} className="rounded-md border p-3 bg-muted/30 space-y-1">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="font-medium text-sm flex items-center gap-2">
                    <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                    {res.name}
                  </span>
                  <span className="text-xs text-muted-foreground break-all">{res.url}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] rounded-full bg-primary/10 text-primary px-2 py-0.5">
                    {res.type}
                  </span>
                  {res.isRequired ? (
                    <Badge className="bg-amber-500/15 text-amber-700 px-2 py-0.5 text-[10px] rounded-full">Required</Badge>
                  ) : (
                    <Badge className="bg-gray-500/15 text-gray-600 px-2 py-0.5 text-[10px] rounded-full">Optional</Badge>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
