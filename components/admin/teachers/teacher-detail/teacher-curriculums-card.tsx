"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Id } from "@/convex/_generated/dataModel";

interface TeacherCurriculumsCardProps {
    teacherId: string;
}

export function TeacherCurriculumsCard({ teacherId }: TeacherCurriculumsCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Assigned curriculums</CardTitle>
                <CardDescription>Courses and subjects this teacher is assigned to.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-32 text-muted-foreground">
                <p>Curriculum assignments table will be implemented here</p>
            </CardContent>
        </Card>
    );
}