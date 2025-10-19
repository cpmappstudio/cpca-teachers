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

                // Get grade names from curriculum campus assignments
                const campusAssignment = curriculum.campusAssignments?.find(
                    ca => ca.campusId === assignment.campusId
                );
                const gradeCodes = campusAssignment?.gradeCodes || [];

                // Use assigned grades to teacher, fallback to all curriculum grades
                const assignedGrades = assignment.assignedGrades || gradeCodes;
                const gradeNames = campus?.grades
                    ?.filter(g => assignedGrades.includes(g.code))
                    .map(g => g.name) || [];

                // Get all lessons for this curriculum
                const allLessons = await ctx.db
                    .query("curriculum_lessons")
                    .withIndex("by_curriculum_active", (q) =>
                        q.eq("curriculumId", curriculum._id).eq("isActive", true)
                    )
                    .collect();

                // Filter lessons based on assigned grades (only show lessons for grades assigned to teacher)
                const lessons = allLessons.filter(lesson => {
                    // If lesson has gradeCodes, check intersection with assigned grades
                    if (lesson.gradeCodes && lesson.gradeCodes.length > 0) {
                        return lesson.gradeCodes.some(gradeCode => assignedGrades.includes(gradeCode));
                    }
                    // If lesson has legacy gradeCode, check if in assigned grades
                    if (lesson.gradeCode) {
                        return assignedGrades.includes(lesson.gradeCode);
                    }
                    // If no grade specified, show to all (applies to all grades)
                    return true;
                });

                // Get lesson progress for this teacher and assignment
                const progressRecords = await ctx.db
                    .query("lesson_progress")
                    .withIndex("by_assignment_status", (q) =>
                        q.eq("assignmentId", assignment._id)
                    )
                    .collect();

                // Calculate progress statistics with granular group-based completion
                const totalLessons = lessons.length;
                const assignedGroupCodes = assignment.assignedGroupCodes || [];
                const hasGroups = assignedGroupCodes.length > 0;
                const totalGrades = gradeNames.length || 1;

                // Calculate total completion as a sum of partial completions
                let totalCompletionScore = 0;
                let completedLessons = 0; // Lessons at 100%
                let inProgressLessons = 0; // Lessons with partial completion

                for (const lesson of lessons) {
                    const lessonProgressRecords = progressRecords.filter(p => p.lessonId === lesson._id);

                    if (hasGroups) {
                        // Group-based: calculate percentage of completed groups
                        const completedGroupsCount = lessonProgressRecords.filter(p =>
                            p.groupCode &&
                            assignedGroupCodes.includes(p.groupCode) &&
                            p.status === "completed" &&
                            (p.evidenceDocumentStorageId || p.evidencePhotoStorageId)
                        ).length;

                        const totalAssignedGroups = assignedGroupCodes.length;
                        const lessonCompletionPercentage = totalAssignedGroups > 0
                            ? (completedGroupsCount / totalAssignedGroups) * 100
                            : 0;

                        // Add this lesson's completion to total score
                        totalCompletionScore += lessonCompletionPercentage;

                        if (lessonCompletionPercentage === 100) {
                            completedLessons++;
                        } else if (lessonCompletionPercentage > 0) {
                            inProgressLessons++;
                        }
                    } else if (totalGrades > 1) {
                        // Legacy multi-grade: calculate percentage of completed grades
                        const completedGradesCount = lessonProgressRecords.filter(p =>
                            p.status === "completed" &&
                            (p.evidenceDocumentStorageId || p.evidencePhotoStorageId)
                        ).length;

                        const lessonCompletionPercentage = totalGrades > 0
                            ? (completedGradesCount / totalGrades) * 100
                            : 0;

                        totalCompletionScore += lessonCompletionPercentage;

                        if (lessonCompletionPercentage === 100) {
                            completedLessons++;
                        } else if (lessonCompletionPercentage > 0) {
                            inProgressLessons++;
                        }
                    } else {
                        // Single grade or no grades specified
                        const lessonProgress = lessonProgressRecords[0];
                        const isCompleted = lessonProgress?.status === "completed" &&
                            (lessonProgress.evidenceDocumentStorageId || lessonProgress.evidencePhotoStorageId);

                        totalCompletionScore += isCompleted ? 100 : 0;

                        if (isCompleted) {
                            completedLessons++;
                        } else if (lessonProgress?.status === "in_progress") {
                            inProgressLessons++;
                        }
                    }
                }

                // Calculate overall percentage: sum of all lesson percentages / total lessons
                const progressPercentage = totalLessons > 0
                    ? Math.round(totalCompletionScore / totalLessons)
                    : 0;                // Get last completed lesson date
                const completedProgress = progressRecords
                    .filter(p => p.completedAt)
                    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
                const lastLessonDate = completedProgress[0]?.completedAt;

                // Progress by quarter (with granular group-based completion)
                const progressByQuarter = lessons.reduce((acc, lesson) => {
                    const quarter = lesson.quarter;
                    if (!acc[quarter]) {
                        acc[quarter] = {
                            total: 0,
                            completed: 0,
                            inProgress: 0,
                            notStarted: 0,
                            completionScore: 0, // Sum of lesson completion percentages
                        };
                    }
                    acc[quarter].total++;

                    const lessonProgressRecords = progressRecords.filter(p => p.lessonId === lesson._id);

                    if (hasGroups) {
                        // Group-based: calculate percentage completion
                        const completedGroupsCount = lessonProgressRecords.filter(p =>
                            p.groupCode &&
                            assignedGroupCodes.includes(p.groupCode) &&
                            p.status === "completed" &&
                            (p.evidenceDocumentStorageId || p.evidencePhotoStorageId)
                        ).length;

                        const totalAssignedGroups = assignedGroupCodes.length;
                        const lessonCompletionPercentage = totalAssignedGroups > 0
                            ? (completedGroupsCount / totalAssignedGroups) * 100
                            : 0;

                        acc[quarter].completionScore += lessonCompletionPercentage;

                        if (lessonCompletionPercentage === 100) {
                            acc[quarter].completed++;
                        } else if (lessonCompletionPercentage > 0) {
                            acc[quarter].inProgress++;
                        } else {
                            acc[quarter].notStarted++;
                        }
                    } else if (totalGrades > 1) {
                        // Legacy multi-grade: calculate percentage completion
                        const completedGradesCount = lessonProgressRecords.filter(p =>
                            p.status === "completed" &&
                            (p.evidenceDocumentStorageId || p.evidencePhotoStorageId)
                        ).length;

                        const lessonCompletionPercentage = totalGrades > 0
                            ? (completedGradesCount / totalGrades) * 100
                            : 0;

                        acc[quarter].completionScore += lessonCompletionPercentage;

                        if (lessonCompletionPercentage === 100) {
                            acc[quarter].completed++;
                        } else if (lessonCompletionPercentage > 0) {
                            acc[quarter].inProgress++;
                        } else {
                            acc[quarter].notStarted++;
                        }
                    } else {
                        // Single grade
                        const progress = lessonProgressRecords[0];
                        const isCompleted = progress?.status === "completed" &&
                            (progress.evidenceDocumentStorageId || progress.evidencePhotoStorageId);

                        acc[quarter].completionScore += isCompleted ? 100 : 0;

                        if (isCompleted) {
                            acc[quarter].completed++;
                        } else if (progress?.status === "in_progress") {
                            acc[quarter].inProgress++;
                        } else {
                            acc[quarter].notStarted++;
                        }
                    }

                    return acc;
                }, {} as Record<number, {
                    total: number;
                    completed: number;
                    inProgress: number;
                    notStarted: number;
                    completionScore: number;
                    percentage?: number; // Calculated percentage
                }>);

                // Calculate percentage for each quarter
                Object.keys(progressByQuarter).forEach(quarterKey => {
                    const quarter = progressByQuarter[Number(quarterKey)];
                    quarter.percentage = quarter.total > 0
                        ? Math.round(quarter.completionScore / quarter.total)
                        : 0;
                }); return {
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
                    gradeNames, // Grade names from curriculum campus assignments
                    assignedGrades: assignment.assignedGrades || [], // Grades assigned to this teacher

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

        // Get campus to access grades
        const campus = await ctx.db.get(assignment.campusId);

        // Get grade names from curriculum campus assignments
        const campusAssignment = curriculum.campusAssignments?.find(
            ca => ca.campusId === assignment.campusId
        );
        const gradeCodes = campusAssignment?.gradeCodes || [];

        // Filter lessons based on assigned grades
        // Only show lessons that match the grades the teacher is assigned to teach
        const assignedGrades = assignment.assignedGrades || gradeCodes;

        // Get grades from campus.grades - ONLY the ones assigned to this teacher
        const grades = campus?.grades
            ?.filter(g => assignedGrades.includes(g.code))
            .map(g => ({
                id: g.code, // Use code as ID since grades are not separate entities
                name: g.name,
                code: g.code,
                level: g.level,
            })) || [];

        // Get all lessons for this curriculum
        const allLessons = await ctx.db
            .query("curriculum_lessons")
            .withIndex("by_curriculum_active", (q) =>
                q.eq("curriculumId", curriculum._id).eq("isActive", true)
            )
            .collect();

        const lessons = allLessons.filter(lesson => {
            // Si la lección tiene gradeCodes (nuevo formato), verificar intersección
            if (lesson.gradeCodes && lesson.gradeCodes.length > 0) {
                return lesson.gradeCodes.some(gradeCode => assignedGrades.includes(gradeCode));
            }
            // Si usa gradeCode legacy (viejo formato), verificar si está en assignedGrades
            if (lesson.gradeCode) {
                return assignedGrades.includes(lesson.gradeCode);
            }
            // Si no tiene grade asignado, mostrarla (aplica a todos)
            return true;
        });

        // Get progress for each lesson (including all grade-specific progress)
        const lessonsWithProgress = await Promise.all(
            lessons.map(async (lesson) => {
                // Find ALL progress records for this lesson (across all grades/groups)
                const allProgressRecords = await ctx.db
                    .query("lesson_progress")
                    .withIndex("by_teacher_lesson", (q) =>
                        q.eq("teacherId", assignment.teacherId).eq("lessonId", lesson._id)
                    )
                    .collect();

                // Calculate overall lesson status based on assigned groups
                // Now uses incremental completion: each group contributes proportionally
                const assignedGroupCodes = assignment.assignedGroupCodes || [];
                const hasGroups = assignedGroupCodes.length > 0;

                let overallStatus: "not_started" | "in_progress" | "completed";
                let completionPercentage = 0;
                let completedGroups = 0;
                let totalGroups = 0;
                let completedGrades = 0;
                let totalGrades = 0;

                if (hasGroups) {
                    // Check completion by groups with incremental progress
                    completedGroups = allProgressRecords.filter(p =>
                        p.groupCode &&
                        assignedGroupCodes.includes(p.groupCode) &&
                        p.status === "completed" &&
                        (p.evidenceDocumentStorageId || p.evidencePhotoStorageId)
                    ).length;

                    totalGroups = assignedGroupCodes.length;
                    completionPercentage = totalGroups > 0
                        ? Math.round((completedGroups / totalGroups) * 100)
                        : 0;

                    // Status based on completion percentage
                    if (completionPercentage === 0) {
                        overallStatus = "not_started";
                    } else if (completionPercentage === 100) {
                        overallStatus = "completed";
                    } else {
                        overallStatus = "in_progress";
                    }
                } else {
                    // Legacy: Check by grades (backward compatibility)
                    totalGrades = grades.length || 1;
                    completedGrades = allProgressRecords.filter(p =>
                        p.status === "completed" &&
                        (p.evidenceDocumentStorageId || p.evidencePhotoStorageId)
                    ).length;

                    completionPercentage = totalGrades > 0
                        ? Math.round((completedGrades / totalGrades) * 100)
                        : 0;

                    if (completionPercentage === 0) {
                        overallStatus = "not_started";
                    } else if (completionPercentage === 100) {
                        overallStatus = "completed";
                    } else {
                        overallStatus = "in_progress";
                    }
                }                // Group progress by grade/group
                const progressByGrade = allProgressRecords.map(p => ({
                    gradeCode: p.gradeCode,
                    groupCode: p.groupCode, // Include groupCode for group-based tracking
                    gradeName: grades.find(g => g.code === p.gradeCode)?.name,
                    progressId: p._id,
                    status: p.status,
                    completedAt: p.completedAt,
                    scheduledDate: p.scheduledDate,
                    evidencePhotoStorageId: p.evidencePhotoStorageId,
                    evidenceDocumentStorageId: p.evidenceDocumentStorageId,
                    activitiesPerformed: p.activitiesPerformed,
                    lessonPlan: p.lessonPlan,
                    notes: p.notes,
                    actualDurationMinutes: p.actualDurationMinutes,
                    studentAttendance: p.studentAttendance,
                    isVerified: p.isVerified,
                    verifiedBy: p.verifiedBy,
                    verifiedAt: p.verifiedAt,
                    updatedAt: p.updatedAt,
                }));

                // For backward compatibility, return the first progress record as main progress
                const mainProgress = allProgressRecords[0];

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

                    // Grade assignment (for filtering)
                    gradeCodes: lesson.gradeCodes,
                    gradeCode: lesson.gradeCode,

                    // Overall status (considering all grades/groups)
                    overallStatus,
                    completionPercentage,
                    completedGrades,
                    totalGrades,
                    completedGroups, // For group-based tracking
                    totalGroups, // For group-based tracking

                    // Progress by grade (for multi-grade curriculums)
                    progressByGrade,

                    // Main progress info (for backward compatibility)
                    progress: mainProgress ? {
                        progressId: mainProgress._id,
                        status: mainProgress.status,
                        completedAt: mainProgress.completedAt,
                        scheduledDate: mainProgress.scheduledDate,
                        evidencePhotoStorageId: mainProgress.evidencePhotoStorageId,
                        evidenceDocumentStorageId: mainProgress.evidenceDocumentStorageId,
                        activitiesPerformed: mainProgress.activitiesPerformed,
                        lessonPlan: mainProgress.lessonPlan,
                        notes: mainProgress.notes,
                        actualDurationMinutes: mainProgress.actualDurationMinutes,
                        studentAttendance: mainProgress.studentAttendance,
                        isVerified: mainProgress.isVerified,
                        verifiedBy: mainProgress.verifiedBy,
                        verifiedAt: mainProgress.verifiedAt,
                        updatedAt: mainProgress.updatedAt,
                    } : null,
                };
            })
        );

        return {
            assignment,
            curriculum,
            lessons: lessonsWithProgress,
            grades, // Return grades for multi-grade support
            assignedGroupCodes: assignment.assignedGroupCodes || [], // Groups assigned to teacher
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
