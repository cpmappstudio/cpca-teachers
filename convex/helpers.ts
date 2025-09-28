// // ################################################################################
// // # File: helpers.ts                                                             #
// // # Project: CPCA Teachers - Teacher Progress Tracking System                    #
// // # Description: Business logic helpers for teacher progress tracking            #
// // # Creation date: 09/22/2025                                                    #
// // ################################################################################

// /**
//  * CPCA TEACHERS: Business Logic Helpers
//  *
//  * Following Convex best practices:
//  * - Pure TypeScript functions for business logic
//  * - Reusable across queries, mutations, and actions
//  * - Type-safe with proper context typing
//  * - No direct exports of query/mutation/action from this file
//  *
//  * Organized by domain:
//  * 1. Progress calculations
//  * 2. Teacher management
//  * 3. Campus metrics
//  * 4. Curriculum and lesson management
//  * 5. Assignment validation
//  * 6. User data access
//  * 7. Activity tracking
//  */

// import { QueryCtx, MutationCtx, DatabaseReader, DatabaseWriter } from "./_generated/server";
// import { Doc, Id } from "./_generated/dataModel";
// import type {
//     TeacherProgress,
//     CampusMetrics,
//     CurriculumProgress,
//     LessonWithProgress,
//     TeacherAssignmentWithDetails,
//     TeacherMetrics,
//     QuarterProgress,
//     AssignmentValidation,
//     TeacherDashboard,
//     AdminDashboard,
//     CampusSummary,
//     CurriculumSummary,
//     ProgressByQuarter,
// } from "./types";

// // Type aliases for cleaner function signatures
// type DbReader = QueryCtx["db"] | DatabaseReader;
// type DbWriter = MutationCtx["db"] | DatabaseWriter;

// // ============================================================================
// // PROGRESS CALCULATION HELPERS
// // ============================================================================

// /**
//  * Calculate teacher's overall progress across all assignments
//  */
// export async function calculateTeacherProgress(
//     db: DbReader,
//     teacherId: Id<"users">
// ): Promise<TeacherProgress> {
//     // Get all active assignments for the teacher
//     const assignments = await db
//         .query("teacher_assignments")
//         .withIndex("by_teacher_active", q =>
//             q.eq("teacherId", teacherId).eq("isActive", true)
//         )
//         .collect();

//     let totalLessons = 0;
//     let completedLessons = 0;
//     const curriculumProgresses: CurriculumProgress[] = [];

//     for (const assignment of assignments) {
//         const progress = await calculateAssignmentProgress(db, assignment._id);
//         curriculumProgresses.push(progress);
//         totalLessons += progress.totalLessons;
//         completedLessons += progress.completedLessons;
//     }

//     const progressPercentage = totalLessons > 0
//         ? Math.round((completedLessons / totalLessons) * 100)
//         : 0;

//     return {
//         teacherId,
//         totalLessons,
//         completedLessons,
//         progressPercentage,
//         curriculumProgresses,
//         lastUpdated: Date.now(),
//     };
// }

// /**
//  * Calculate progress for a specific teacher assignment
//  */
// export async function calculateAssignmentProgress(
//     db: DbReader,
//     assignmentId: Id<"teacher_assignments">
// ): Promise<CurriculumProgress> {
//     const assignment = await db.get(assignmentId);
//     if (!assignment) {
//         throw new Error("Assignment not found");
//     }

//     const curriculum = await db.get(assignment.curriculumId);
//     if (!curriculum) {
//         throw new Error("Curriculum not found");
//     }

//     // Get all lessons for this curriculum
//     const lessons = await db
//         .query("curriculum_lessons")
//         .withIndex("by_curriculum_active", q =>
//             q.eq("curriculumId", assignment.curriculumId).eq("isActive", true)
//         )
//         .collect();

//     // Get progress for each lesson
//     const lessonProgresses = await db
//         .query("lesson_progress")
//         .withIndex("by_assignment_status", q =>
//             q.eq("assignmentId", assignmentId)
//         )
//         .collect();

//     // Create a map for quick lookup
//     const progressMap = new Map(
//         lessonProgresses.map(p => [p.lessonId, p])
//     );

//     // Calculate progress by quarter
//     const quarterProgress: ProgressByQuarter = {};

//     for (let quarter = 1; quarter <= curriculum.numberOfQuarters; quarter++) {
//         const quarterLessons = lessons.filter(l => l.quarter === quarter);
//         const completed = quarterLessons.filter(l => {
//             const progress = progressMap.get(l._id);
//             return progress?.status === "completed";
//         }).length;

//         quarterProgress[quarter] = {
//             quarter,
//             totalLessons: quarterLessons.length,
//             completedLessons: completed,
//             progressPercentage: quarterLessons.length > 0
//                 ? Math.round((completed / quarterLessons.length) * 100)
//                 : 0,
//         };
//     }

//     const totalLessons = lessons.length;
//     const completedLessons = lessonProgresses.filter(p => p.status === "completed").length;
//     const progressPercentage = totalLessons > 0
//         ? Math.round((completedLessons / totalLessons) * 100)
//         : 0;

//     return {
//         curriculumId: assignment.curriculumId,
//         curriculumName: curriculum.name,
//         assignmentId,
//         totalLessons,
//         completedLessons,
//         progressPercentage,
//         quarterProgress,
//         lastLessonDate: lessonProgresses
//             .filter(p => p.completedAt)
//             .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))[0]?.completedAt,
//     };
// }

// /**
//  * Get lessons with progress for a specific assignment
//  */
// export async function getLessonsWithProgress(
//     db: DbReader,
//     assignmentId: Id<"teacher_assignments">,
//     quarter?: number
// ): Promise<LessonWithProgress[]> {
//     const assignment = await db.get(assignmentId);
//     if (!assignment) return [];

//     // Get curriculum lessons
//     let lessonsQuery = db
//         .query("curriculum_lessons")
//         .withIndex("by_curriculum_active", q =>
//             q.eq("curriculumId", assignment.curriculumId).eq("isActive", true)
//         );

//     const lessons = await lessonsQuery.collect();

//     // Filter by quarter if specified
//     const filteredLessons = quarter
//         ? lessons.filter(l => l.quarter === quarter)
//         : lessons;

//     // Get progress for these lessons
//     const lessonProgresses = await db
//         .query("lesson_progress")
//         .withIndex("by_assignment_status", q =>
//             q.eq("assignmentId", assignmentId)
//         )
//         .collect();

//     const progressMap = new Map(
//         lessonProgresses.map(p => [p.lessonId, p])
//     );

//     // Combine lessons with their progress
//     const lessonsWithProgress: LessonWithProgress[] = filteredLessons.map(lesson => ({
//         lesson,
//         progress: progressMap.get(lesson._id) || null,
//     }));

//     // Sort by quarter and order
//     lessonsWithProgress.sort((a, b) => {
//         if (a.lesson.quarter !== b.lesson.quarter) {
//             return a.lesson.quarter - b.lesson.quarter;
//         }
//         return a.lesson.orderInQuarter - b.lesson.orderInQuarter;
//     });

//     return lessonsWithProgress;
// }

// // ============================================================================
// // CAMPUS METRICS HELPERS
// // ============================================================================

// /**
//  * Calculate metrics for a campus
//  */
// export async function calculateCampusMetrics(
//     db: DbReader,
//     campusId: Id<"campuses">
// ): Promise<CampusMetrics> {
//     // Get all teachers in this campus
//     const teachers = await db
//         .query("users")
//         .withIndex("by_campus_active", q =>
//             q.eq("campusId", campusId).eq("isActive", true)
//         )
//         .filter(q => q.eq(q.field("role"), "teacher"))
//         .collect();

//     const totalTeachers = teachers.length;
//     const activeTeachers = teachers.filter(t => t.status === "active").length;

//     // Calculate average progress
//     let totalProgress = 0;
//     for (const teacher of teachers) {
//         if (teacher.progressMetrics) {
//             totalProgress += teacher.progressMetrics.progressPercentage;
//         }
//     }

//     const averageProgress = totalTeachers > 0
//         ? Math.round(totalProgress / totalTeachers)
//         : 0;

//     return {
//         totalTeachers,
//         activeTeachers,
//         averageProgress,
//         lastUpdated: Date.now(),
//     };
// }

// /**
//  * Get campus summary with teacher list
//  */
// export async function getCampusSummary(
//     db: DbReader,
//     campusId: Id<"campuses">
// ): Promise<CampusSummary | null> {
//     const campus = await db.get(campusId);
//     if (!campus) return null;

//     const teachers = await db
//         .query("users")
//         .withIndex("by_campus_status", q =>
//             q.eq("campusId", campusId)
//         )
//         .filter(q => q.eq(q.field("role"), "teacher"))
//         .collect();

//     const teacherMetrics: TeacherMetrics[] = [];
//     for (const teacher of teachers) {
//         const progress = await calculateTeacherProgress(db, teacher._id);
//         teacherMetrics.push({
//             teacher,
//             progress,
//             assignments: await getTeacherActiveAssignments(db, teacher._id),
//         });
//     }

//     const metrics = await calculateCampusMetrics(db, campusId);

//     return {
//         campus,
//         metrics,
//         teachers: teacherMetrics,
//     };
// }

// // ============================================================================
// // TEACHER MANAGEMENT HELPERS
// // ============================================================================

// /**
//  * Get teacher's active assignments with details
//  */
// export async function getTeacherActiveAssignments(
//     db: DbReader,
//     teacherId: Id<"users">
// ): Promise<TeacherAssignmentWithDetails[]> {
//     const assignments = await db
//         .query("teacher_assignments")
//         .withIndex("by_teacher_active", q =>
//             q.eq("teacherId", teacherId).eq("isActive", true)
//         )
//         .filter(q => q.eq(q.field("status"), "active"))
//         .collect();

//     const assignmentDetails: TeacherAssignmentWithDetails[] = [];

//     for (const assignment of assignments) {
//         const [curriculum, campus, grade] = await Promise.all([
//             db.get(assignment.curriculumId),
//             db.get(assignment.campusId),
//             assignment.gradeId ? db.get(assignment.gradeId) : null,
//         ]);

//         if (curriculum && campus) {
//             const progress = await calculateAssignmentProgress(db, assignment._id);

//             assignmentDetails.push({
//                 assignment,
//                 curriculum,
//                 campus,
//                 grade: grade || undefined,
//                 progress,
//             });
//         }
//     }

//     return assignmentDetails;
// }

// /**
//  * Update teacher's cached progress metrics
//  */
// export async function updateTeacherMetrics(
//     db: DbWriter,
//     teacherId: Id<"users">
// ): Promise<void> {
//     const progress = await calculateTeacherProgress(db, teacherId);

//     await db.patch(teacherId, {
//         progressMetrics: {
//             totalLessons: progress.totalLessons,
//             completedLessons: progress.completedLessons,
//             progressPercentage: progress.progressPercentage,
//             lastUpdated: Date.now(),
//         },
//         updatedAt: Date.now(),
//     });
// }

// /**
//  * Get teacher dashboard data
//  */
// export async function getTeacherDashboard(
//     db: DbReader,
//     teacherId: Id<"users">
// ): Promise<TeacherDashboard | null> {
//     const teacher = await db.get(teacherId);
//     if (!teacher || teacher.role !== "teacher") return null;

//     const assignments = await getTeacherActiveAssignments(db, teacherId);
//     const progress = await calculateTeacherProgress(db, teacherId);

//     // Get recent lesson activity
//     const recentLessons = await db
//         .query("lesson_progress")
//         .withIndex("by_teacher_quarter_status", q =>
//             q.eq("teacherId", teacherId)
//         )
//         .order("desc")
//         .take(10);

//     const upcomingLessons: LessonWithProgress[] = [];
//     for (const assignment of assignments) {
//         const lessons = await getLessonsWithProgress(db, assignment.assignment._id);
//         const notStarted = lessons.filter(l =>
//             !l.progress || l.progress.status === "not_started"
//         );
//         upcomingLessons.push(...notStarted.slice(0, 5));
//     }

//     return {
//         teacher,
//         assignments,
//         overallProgress: progress,
//         recentActivity: recentLessons,
//         upcomingLessons: upcomingLessons.slice(0, 10),
//     };
// }

// // ============================================================================
// // CURRICULUM AND LESSON HELPERS
// // ============================================================================

// /**
//  * Get curriculum summary with metrics
//  */
// export async function getCurriculumSummary(
//     db: DbReader,
//     curriculumId: Id<"curriculums">
// ): Promise<CurriculumSummary | null> {
//     const curriculum = await db.get(curriculumId);
//     if (!curriculum) return null;

//     // Get all lessons
//     const lessons = await db
//         .query("curriculum_lessons")
//         .withIndex("by_curriculum_active", q =>
//             q.eq("curriculumId", curriculumId).eq("isActive", true)
//         )
//         .collect();

//     // Get all assignments
//     const assignments = await db
//         .query("teacher_assignments")
//         .withIndex("by_curriculum", q =>
//             q.eq("curriculumId", curriculumId).eq("isActive", true)
//         )
//         .collect();

//     // Get assigned teachers
//     const teachers: Doc<"users">[] = [];
//     for (const assignment of assignments) {
//         const teacher = await db.get(assignment.teacherId);
//         if (teacher) teachers.push(teacher);
//     }

//     // Get associated grades
//     const gradeAssociations = await db
//         .query("curriculum_grades")
//         .withIndex("by_curriculum", q =>
//             q.eq("curriculumId", curriculumId).eq("isActive", true)
//         )
//         .collect();

//     const grades: Doc<"grades">[] = [];
//     for (const association of gradeAssociations) {
//         const grade = await db.get(association.gradeId);
//         if (grade) grades.push(grade);
//     }

//     // Calculate overall progress
//     let totalProgress = 0;
//     let activeAssignments = 0;
//     for (const assignment of assignments) {
//         if (assignment.status === "active") {
//             activeAssignments++;
//             const progress = await calculateAssignmentProgress(db, assignment._id);
//             totalProgress += progress.progressPercentage;
//         }
//     }

//     const averageProgress = activeAssignments > 0
//         ? Math.round(totalProgress / activeAssignments)
//         : 0;

//     return {
//         curriculum,
//         totalLessons: lessons.length,
//         assignedTeachers: teachers,
//         grades,
//         averageProgress,
//         lessonsByQuarter: groupLessonsByQuarter(lessons),
//     };
// }

// /**
//  * Group lessons by quarter
//  */
// function groupLessonsByQuarter(
//     lessons: Doc<"curriculum_lessons">[]
// ): Record<number, Doc<"curriculum_lessons">[]> {
//     const grouped: Record<number, Doc<"curriculum_lessons">[]> = {};

//     for (const lesson of lessons) {
//         if (!grouped[lesson.quarter]) {
//             grouped[lesson.quarter] = [];
//         }
//         grouped[lesson.quarter].push(lesson);
//     }

//     // Sort lessons within each quarter
//     for (const quarter in grouped) {
//         grouped[quarter].sort((a, b) => a.orderInQuarter - b.orderInQuarter);
//     }

//     return grouped;
// }

// /**
//  * Validate if a lesson can be marked as completed
//  */
// export function validateLessonCompletion(
//     progress: Doc<"lesson_progress">
// ): boolean {
//     // Lesson must have evidence (photo or document)
//     const hasEvidence = !!progress.evidencePhoto || !!progress.evidenceDocument;

//     // Must have either activities performed or lesson plan
//     const hasContent = !!progress.activitiesPerformed || !!progress.lessonPlan;

//     return hasEvidence && hasContent;
// }

// // ============================================================================
// // ASSIGNMENT VALIDATION HELPERS
// // ============================================================================

// /**
//  * Validate if a teacher can be assigned to a curriculum
//  */
// export async function validateTeacherAssignment(
//     db: DbReader,
//     teacherId: Id<"users">,
//     curriculumId: Id<"curriculums">,
//     campusId: Id<"campuses">
// ): Promise<AssignmentValidation> {
//     const reasons: string[] = [];
//     const warnings: string[] = [];

//     const teacher = await db.get(teacherId);
//     if (!teacher) {
//         return {
//             isValid: false,
//             reasons: ["Teacher not found"],
//             warnings: [],
//         };
//     }

//     if (teacher.role !== "teacher") {
//         reasons.push("User is not a teacher");
//     }

//     if (!teacher.isActive) {
//         reasons.push("Teacher is not active");
//     }

//     if (teacher.campusId !== campusId) {
//         warnings.push("Teacher is from a different campus");
//     }

//     // Check for duplicate assignment
//     const existingAssignment = await db
//         .query("teacher_assignments")
//         .withIndex("by_teacher_active", q =>
//             q.eq("teacherId", teacherId).eq("isActive", true)
//         )
//         .filter(q =>
//             q.and(
//                 q.eq(q.field("curriculumId"), curriculumId),
//                 q.eq(q.field("status"), "active")
//             )
//         )
//         .first();

//     if (existingAssignment) {
//         reasons.push("Teacher is already assigned to this curriculum");
//     }

//     // Check teacher workload
//     const activeAssignments = await db
//         .query("teacher_assignments")
//         .withIndex("by_teacher_active", q =>
//             q.eq("teacherId", teacherId).eq("isActive", true)
//         )
//         .filter(q => q.eq(q.field("status"), "active"))
//         .collect();

//     if (activeAssignments.length >= 10) {
//         warnings.push("Teacher has a high workload (10+ active assignments)");
//     }

//     return {
//         isValid: reasons.length === 0,
//         reasons,
//         warnings,
//     };
// }

// // ============================================================================
// // USER DATA ACCESS HELPERS
// // ============================================================================

// /**
//  * Get user by clerk ID
//  */
// export async function getUserByClerkId(
//     db: DbReader,
//     clerkId: string
// ): Promise<Doc<"users"> | null> {
//     return await db
//         .query("users")
//         .withIndex("by_clerk_id", q => q.eq("clerkId", clerkId))
//         .first();
// }

// /**
//  * Get active teachers count
//  */
// export async function getActiveTeachersCount(db: DbReader): Promise<number> {
//     const teachers = await db
//         .query("users")
//         .withIndex("by_role_active", q =>
//             q.eq("role", "teacher").eq("isActive", true)
//         )
//         .collect();
//     return teachers.length;
// }

// /**
//  * Get active campuses count
//  */
// export async function getActiveCampusesCount(db: DbReader): Promise<number> {
//     const campuses = await db
//         .query("campuses")
//         .withIndex("by_active", q => q.eq("isActive", true))
//         .collect();
//     return campuses.length;
// }

// /**
//  * Get active curriculums count
//  */
// export async function getActiveCurriculumsCount(db: DbReader): Promise<number> {
//     const curriculums = await db
//         .query("curriculums")
//         .withIndex("by_active", q => q.eq("isActive", true))
//         .collect();
//     return curriculums.length;
// }

// // ============================================================================
// // ADMIN DASHBOARD HELPERS
// // ============================================================================

// /**
//  * Get admin dashboard data
//  */
// export async function getAdminDashboard(db: DbReader): Promise<AdminDashboard> {
//     const [totalCampuses, totalTeachers, totalCurriculums] = await Promise.all([
//         getActiveCampusesCount(db),
//         getActiveTeachersCount(db),
//         getActiveCurriculumsCount(db),
//     ]);

//     // Get all campuses with metrics
//     const campuses = await db
//         .query("campuses")
//         .withIndex("by_active", q => q.eq("isActive", true))
//         .collect();

//     const campusSummaries: CampusSummary[] = [];
//     let totalProgress = 0;
//     let campusCount = 0;

//     for (const campus of campuses) {
//         const summary = await getCampusSummary(db, campus._id);
//         if (summary) {
//             campusSummaries.push(summary);
//             if (summary.metrics.averageProgress > 0) {
//                 totalProgress += summary.metrics.averageProgress;
//                 campusCount++;
//             }
//         }
//     }

//     const overallProgress = campusCount > 0
//         ? Math.round(totalProgress / campusCount)
//         : 0;

//     // Get recent activity
//     const recentActivity = await db
//         .query("activity_logs")
//         .withIndex("by_created")
//         .order("desc")
//         .take(20);

//     // Get teachers needing attention (low progress)
//     const allTeachers = await db
//         .query("users")
//         .withIndex("by_role_active", q =>
//             q.eq("role", "teacher").eq("isActive", true)
//         )
//         .collect();

//     const teachersNeedingAttention = allTeachers.filter(t =>
//         t.progressMetrics && t.progressMetrics.progressPercentage < 50
//     );

//     return {
//         totalCampuses,
//         totalTeachers,
//         totalCurriculums,
//         overallProgress,
//         campusSummaries,
//         recentActivity,
//         teachersNeedingAttention,
//     };
// }

// // ============================================================================
// // ACTIVITY TRACKING HELPERS
// // ============================================================================

// /**
//  * Log an activity
//  */
// export async function logActivity(
//     db: DbWriter,
//     userId: Id<"users">,
//     action: string,
//     entityType: string,
//     entityId: string,
//     metadata?: any
// ): Promise<void> {
//     await db.insert("activity_logs", {
//         userId,
//         action,
//         entityType,
//         entityId,
//         metadata,
//         createdAt: Date.now(),
//     });
// }

// /**
//  * Get user's recent activity
//  */
// export async function getUserRecentActivity(
//     db: DbReader,
//     userId: Id<"users">,
//     limit: number = 10
// ): Promise<Doc<"activity_logs">[]> {
//     return await db
//         .query("activity_logs")
//         .withIndex("by_user", q => q.eq("userId", userId))
//         .order("desc")
//         .take(limit);
// }

// // ============================================================================
// // BATCH UPDATE HELPERS
// // ============================================================================

// /**
//  * Update campus metrics for all campuses
//  */
// export async function updateAllCampusMetrics(db: DbWriter): Promise<void> {
//     const campuses = await db
//         .query("campuses")
//         .withIndex("by_active", q => q.eq("isActive", true))
//         .collect();

//     for (const campus of campuses) {
//         const metrics = await calculateCampusMetrics(db, campus._id);
//         await db.patch(campus._id, {
//             metrics,
//             updatedAt: Date.now(),
//         });
//     }
// }

// /**
//  * Update curriculum metrics
//  */
// export async function updateCurriculumMetrics(
//     db: DbWriter,
//     curriculumId: Id<"curriculums">
// ): Promise<void> {
//     const summary = await getCurriculumSummary(db, curriculumId);
//     if (!summary) return;

//     await db.patch(curriculumId, {
//         metrics: {
//             totalLessons: summary.totalLessons,
//             assignedTeachers: summary.assignedTeachers.length,
//             averageProgress: summary.averageProgress,
//             lastUpdated: Date.now(),
//         },
//         updatedAt: Date.now(),
//     });
// }

// /**
//  * Bulk update teacher assignments progress
//  */
// export async function updateAssignmentProgress(
//     db: DbWriter,
//     assignmentId: Id<"teacher_assignments">
// ): Promise<void> {
//     const progress = await calculateAssignmentProgress(db, assignmentId);

//     await db.patch(assignmentId, {
//         progressSummary: {
//             totalLessons: progress.totalLessons,
//             completedLessons: progress.completedLessons,
//             progressPercentage: progress.progressPercentage,
//             lastLessonDate: progress.lastLessonDate,
//             lastUpdated: Date.now(),
//         },
//         updatedAt: Date.now(),
//     });

//     // Also update teacher metrics
//     const assignment = await db.get(assignmentId);
//     if (assignment) {
//         await updateTeacherMetrics(db, assignment.teacherId);
//     }
// }