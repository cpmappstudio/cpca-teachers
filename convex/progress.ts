/**
 * Progress tracking queries and mutations
 * Handles lesson progress for individual teachers
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

/**
 * Get teacher's curriculum assignments with actual progress
 * This shows the teacher's individual progress, not just curriculum info
 */
export const getTeacherAssignmentsWithProgress = query({
    args: {
        teacherId: v.id("users"),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        // Get all teacher assignments
        const assignments = await ctx.db
            .query("teacher_assignments")
            .withIndex("by_teacher_active", (q) =>
                q.eq("teacherId", args.teacherId)
                    .eq("isActive", args.isActive ?? true)
            )
            .collect();

        // Build detailed response for each assignment
        const assignmentsWithProgress = await Promise.all(
            assignments.map(async (assignment) => {
                // Get curriculum details
                const curriculum = await ctx.db.get(assignment.curriculumId);
                if (!curriculum) return null;

                // Get campus details
                const campus = await ctx.db.get(assignment.campusId);

                // Get grade details if available
                let grade = null;
                if (assignment.gradeId) {
                    const gradeDoc = await ctx.db.get(assignment.gradeId);
                    if (gradeDoc) {
                        grade = {
                            id: gradeDoc._id,
                            name: gradeDoc.name,
                            level: gradeDoc.level,
                            code: gradeDoc.code,
                        };
                    }
                }

                // Get all lessons for this curriculum
                const lessons = await ctx.db
                    .query("curriculum_lessons")
                    .withIndex("by_curriculum_active", (q) =>
                        q.eq("curriculumId", curriculum._id).eq("isActive", true)
                    )
                    .collect();

                // Get lesson progress for this teacher and assignment
                const progressRecords = await ctx.db
                    .query("lesson_progress")
                    .withIndex("by_assignment_status", (q) =>
                        q.eq("assignmentId", assignment._id)
                    )
                    .collect();

                // Calculate progress statistics
                const totalLessons = lessons.length;
                const completedLessons = progressRecords.filter(
                    p => p.status === "completed"
                ).length;
                const inProgressLessons = progressRecords.filter(
                    p => p.status === "in_progress"
                ).length;
                const progressPercentage = totalLessons > 0
                    ? Math.round((completedLessons / totalLessons) * 100)
                    : 0;

                // Get last completed lesson date
                const completedProgress = progressRecords
                    .filter(p => p.completedAt)
                    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
                const lastLessonDate = completedProgress[0]?.completedAt;

                // Progress by quarter
                const progressByQuarter = lessons.reduce((acc, lesson) => {
                    const quarter = lesson.quarter;
                    if (!acc[quarter]) {
                        acc[quarter] = {
                            total: 0,
                            completed: 0,
                            inProgress: 0,
                            notStarted: 0,
                        };
                    }
                    acc[quarter].total++;

                    const progress = progressRecords.find(p => p.lessonId === lesson._id);
                    if (progress) {
                        if (progress.status === "completed") {
                            acc[quarter].completed++;
                        } else if (progress.status === "in_progress") {
                            acc[quarter].inProgress++;
                        } else {
                            acc[quarter].notStarted++;
                        }
                    } else {
                        acc[quarter].notStarted++;
                    }

                    return acc;
                }, {} as Record<number, {
                    total: number;
                    completed: number;
                    inProgress: number;
                    notStarted: number;
                }>);

                return {
                    // Assignment info
                    _id: assignment._id,
                    assignmentId: assignment._id,
                    assignmentType: assignment.assignmentType,
                    assignmentStatus: assignment.status,
                    academicYear: assignment.academicYear,
                    startDate: assignment.startDate,
                    endDate: assignment.endDate,

                    // Curriculum info
                    curriculumId: curriculum._id,
                    curriculumName: curriculum.name,
                    curriculumCode: curriculum.code,
                    curriculumStatus: curriculum.status,
                    numberOfQuarters: curriculum.numberOfQuarters,

                    // Campus info
                    campusId: assignment.campusId,
                    campusName: campus?.name || "Unknown Campus",

                    // Grade info
                    grade,

                    // Progress summary
                    progressSummary: {
                        totalLessons,
                        completedLessons,
                        inProgressLessons,
                        notStartedLessons: totalLessons - completedLessons - inProgressLessons,
                        progressPercentage,
                        lastLessonDate,
                        lastUpdated: Date.now(),
                    },

                    // Progress by quarter
                    progressByQuarter,

                    // For compatibility with existing component
                    name: curriculum.name,
                    code: curriculum.code,
                    status: curriculum.status,
                    lessonsCount: totalLessons,
                    quarters: curriculum.numberOfQuarters,
                };
            })
        );

        // Filter out null values and return
        return assignmentsWithProgress.filter((a): a is NonNullable<typeof a> => a !== null);
    },
});

/**
 * Get detailed progress for a specific assignment
 * Shows all lessons with their individual progress
 */
export const getAssignmentLessonProgress = query({
    args: {
        assignmentId: v.id("teacher_assignments"),
    },
    handler: async (ctx, args) => {
        // Get the assignment
        const assignment = await ctx.db.get(args.assignmentId);
        if (!assignment) {
            throw new Error("Assignment not found");
        }

        // Get curriculum
        const curriculum = await ctx.db.get(assignment.curriculumId);
        if (!curriculum) {
            throw new Error("Curriculum not found");
        }

        // Get all lessons for this curriculum
        const lessons = await ctx.db
            .query("curriculum_lessons")
            .withIndex("by_curriculum_active", (q) =>
                q.eq("curriculumId", curriculum._id).eq("isActive", true)
            )
            .collect();

        // Get progress for each lesson
        const lessonsWithProgress = await Promise.all(
            lessons.map(async (lesson) => {
                // Find progress record for this lesson
                const progress = await ctx.db
                    .query("lesson_progress")
                    .withIndex("by_teacher_lesson", (q) =>
                        q.eq("teacherId", assignment.teacherId).eq("lessonId", lesson._id)
                    )
                    .first();

                return {
                    // Lesson info
                    lessonId: lesson._id,
                    title: lesson.title,
                    description: lesson.description,
                    quarter: lesson.quarter,
                    orderInQuarter: lesson.orderInQuarter,
                    isMandatory: lesson.isMandatory,
                    objectives: lesson.objectives,
                    resources: lesson.resources,

                    // Progress info
                    progress: progress ? {
                        progressId: progress._id,
                        status: progress.status,
                        completedAt: progress.completedAt,
                        scheduledDate: progress.scheduledDate,
                        evidencePhotoStorageId: progress.evidencePhotoStorageId,
                        evidenceDocumentStorageId: progress.evidenceDocumentStorageId,
                        activitiesPerformed: progress.activitiesPerformed,
                        lessonPlan: progress.lessonPlan,
                        notes: progress.notes,
                        actualDurationMinutes: progress.actualDurationMinutes,
                        studentAttendance: progress.studentAttendance,
                        isVerified: progress.isVerified,
                        verifiedBy: progress.verifiedBy,
                        verifiedAt: progress.verifiedAt,
                        updatedAt: progress.updatedAt,
                    } : null,
                };
            })
        );

        return {
            assignment,
            curriculum,
            lessons: lessonsWithProgress,
        };
    },
});

/**
 * Create or update lesson progress
 */
export const updateLessonProgress = mutation({
    args: {
        teacherId: v.id("users"),
        lessonId: v.id("curriculum_lessons"),
        assignmentId: v.id("teacher_assignments"),
        status: v.union(
            v.literal("not_started"),
            v.literal("in_progress"),
            v.literal("completed"),
            v.literal("skipped"),
            v.literal("rescheduled")
        ),
        evidencePhotoStorageId: v.optional(v.id("_storage")),
        evidenceDocumentStorageId: v.optional(v.id("_storage")),
        activitiesPerformed: v.optional(v.string()),
        lessonPlan: v.optional(v.string()),
        notes: v.optional(v.string()),
        scheduledDate: v.optional(v.number()),
        actualDurationMinutes: v.optional(v.number()),
        studentAttendance: v.optional(v.object({
            present: v.number(),
            absent: v.number(),
            total: v.number(),
        })),
    },
    handler: async (ctx, args) => {
        // Get lesson and assignment info
        const lesson = await ctx.db.get(args.lessonId);
        if (!lesson) {
            throw new Error("Lesson not found");
        }

        const assignment = await ctx.db.get(args.assignmentId);
        if (!assignment) {
            throw new Error("Assignment not found");
        }

        // Check if progress already exists
        const existingProgress = await ctx.db
            .query("lesson_progress")
            .withIndex("by_teacher_lesson", (q) =>
                q.eq("teacherId", args.teacherId).eq("lessonId", args.lessonId)
            )
            .first();

        const now = Date.now();
        const completedAt = args.status === "completed" ? now : undefined;

        if (existingProgress) {
            // Update existing progress
            await ctx.db.patch(existingProgress._id, {
                status: args.status,
                evidencePhotoStorageId: args.evidencePhotoStorageId,
                evidenceDocumentStorageId: args.evidenceDocumentStorageId,
                activitiesPerformed: args.activitiesPerformed,
                lessonPlan: args.lessonPlan,
                notes: args.notes,
                scheduledDate: args.scheduledDate,
                actualDurationMinutes: args.actualDurationMinutes,
                studentAttendance: args.studentAttendance,
                completedAt: completedAt || existingProgress.completedAt,
                updatedAt: now,
                lastModifiedBy: args.teacherId,
            });

            return existingProgress._id;
        } else {
            // Create new progress record
            const progressId = await ctx.db.insert("lesson_progress", {
                teacherId: args.teacherId,
                lessonId: args.lessonId,
                assignmentId: args.assignmentId,
                curriculumId: lesson.curriculumId,
                campusId: assignment.campusId,
                quarter: lesson.quarter,
                status: args.status,
                evidencePhotoStorageId: args.evidencePhotoStorageId,
                evidenceDocumentStorageId: args.evidenceDocumentStorageId,
                activitiesPerformed: args.activitiesPerformed,
                lessonPlan: args.lessonPlan,
                notes: args.notes,
                scheduledDate: args.scheduledDate,
                actualDurationMinutes: args.actualDurationMinutes,
                studentAttendance: args.studentAttendance,
                completedAt,
                isVerified: false,
                createdAt: now,
                updatedAt: now,
                lastModifiedBy: args.teacherId,
            });

            return progressId;
        }
    },
});

/**
 * Get lesson progress by teacher and quarter
 */
export const getTeacherProgressByQuarter = query({
    args: {
        teacherId: v.id("users"),
        quarter: v.number(),
    },
    handler: async (ctx, args) => {
        const progressRecords = await ctx.db
            .query("lesson_progress")
            .withIndex("by_teacher_quarter_status", (q) =>
                q.eq("teacherId", args.teacherId).eq("quarter", args.quarter)
            )
            .collect();

        return progressRecords;
    },
});

/**
 * Delete lesson progress (admin only)
 */
export const deleteLessonProgress = mutation({
    args: {
        progressId: v.id("lesson_progress"),
    },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.progressId);
    },
});

/**
 * Create a teacher assignment
 * This creates a new assignment record linking a teacher to a curriculum
 */
export const createTeacherAssignment = mutation({
    args: {
        teacherId: v.id("users"),
        curriculumId: v.id("curriculums"),
        campusId: v.id("campuses"),
        gradeId: v.optional(v.id("grades")),
        academicYear: v.string(),
        assignmentType: v.union(
            v.literal("primary"),
            v.literal("substitute"),
            v.literal("assistant"),
            v.literal("co_teacher")
        ),
        assignedBy: v.id("users"),
    },
    handler: async (ctx, args) => {
        // Check if assignment already exists
        const existingAssignment = await ctx.db
            .query("teacher_assignments")
            .withIndex("by_teacher_campus", (q) =>
                q.eq("teacherId", args.teacherId)
                    .eq("campusId", args.campusId)
                    .eq("isActive", true)
            )
            .filter((q) => q.eq(q.field("curriculumId"), args.curriculumId))
            .first();

        if (existingAssignment) {
            throw new Error("This teacher is already assigned to this curriculum at this campus");
        }

        // Get curriculum to calculate total lessons
        const curriculum = await ctx.db.get(args.curriculumId);
        if (!curriculum) {
            throw new Error("Curriculum not found");
        }

        // Get total lessons for this curriculum
        const lessons = await ctx.db
            .query("curriculum_lessons")
            .withIndex("by_curriculum_active", (q) =>
                q.eq("curriculumId", args.curriculumId).eq("isActive", true)
            )
            .collect();

        const now = Date.now();

        // Create the assignment
        const assignmentId = await ctx.db.insert("teacher_assignments", {
            teacherId: args.teacherId,
            curriculumId: args.curriculumId,
            campusId: args.campusId,
            gradeId: args.gradeId,
            academicYear: args.academicYear,
            startDate: now,
            assignmentType: args.assignmentType,
            progressSummary: {
                totalLessons: lessons.length,
                completedLessons: 0,
                progressPercentage: 0,
                lastUpdated: now,
            },
            isActive: true,
            status: "active",
            assignedAt: now,
            assignedBy: args.assignedBy,
        });

        return assignmentId;
    },
});

/**
 * Remove a teacher assignment
 * This marks the assignment as inactive
 */
export const removeTeacherAssignment = mutation({
    args: {
        assignmentId: v.id("teacher_assignments"),
    },
    handler: async (ctx, args) => {
        const assignment = await ctx.db.get(args.assignmentId);
        if (!assignment) {
            throw new Error("Assignment not found");
        }

        // Mark as inactive instead of deleting
        await ctx.db.patch(args.assignmentId, {
            isActive: false,
            status: "cancelled",
            updatedAt: Date.now(),
        });

        return args.assignmentId;
    },
});

/**
 * Update assignment progress summary
 * This should be called after lesson progress is updated
 */
export const updateAssignmentProgressSummary = mutation({
    args: {
        assignmentId: v.id("teacher_assignments"),
    },
    handler: async (ctx, args) => {
        const assignment = await ctx.db.get(args.assignmentId);
        if (!assignment) {
            throw new Error("Assignment not found");
        }

        // Get all lessons for this curriculum
        const lessons = await ctx.db
            .query("curriculum_lessons")
            .withIndex("by_curriculum_active", (q) =>
                q.eq("curriculumId", assignment.curriculumId).eq("isActive", true)
            )
            .collect();

        // Get progress records for this assignment
        const progressRecords = await ctx.db
            .query("lesson_progress")
            .withIndex("by_assignment_status", (q) =>
                q.eq("assignmentId", args.assignmentId)
            )
            .collect();

        const totalLessons = lessons.length;
        const completedLessons = progressRecords.filter(
            p => p.status === "completed"
        ).length;
        const progressPercentage = totalLessons > 0
            ? Math.round((completedLessons / totalLessons) * 100)
            : 0;

        // Get last completed lesson date
        const completedProgress = progressRecords
            .filter(p => p.completedAt)
            .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
        const lastLessonDate = completedProgress[0]?.completedAt;

        // Update the assignment
        await ctx.db.patch(args.assignmentId, {
            progressSummary: {
                totalLessons,
                completedLessons,
                progressPercentage,
                lastLessonDate,
                lastUpdated: Date.now(),
            },
            updatedAt: Date.now(),
        });
    },
});

/**
 * Get storage URL for evidence files (images or PDFs)
 */
export const getStorageUrl = query({
    args: {
        storageId: v.id("_storage"),
    },
    handler: async (ctx, args) => {
        return await ctx.storage.getUrl(args.storageId);
    },
});
