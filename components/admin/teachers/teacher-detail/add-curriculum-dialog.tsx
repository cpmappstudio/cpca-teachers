"use client"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ChevronDown, BookOpen, FileText, X, ListCheck, GraduationCap, Users } from "lucide-react"
import { useState, useEffect } from "react"
import { useQuery, useMutation, useConvex } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { EntityDialog } from "@/components/ui/entity-dialog"
import { toast } from "sonner"
import { CurriculumDialog } from "@/components/admin/curriculums/curriculum-dialog"
import { getAvailableGroupsForGrade } from "@/lib/grade-utils"

interface AddCurriculumDialogProps {
    teacherId: string
}

export function AddCurriculumDialog({ teacherId }: AddCurriculumDialogProps) {
    const convex = useConvex()
    const [selectedCurriculumIds, setSelectedCurriculumIds] = useState<Id<"curriculums">[]>([])
    const [initialCurriculumIds, setInitialCurriculumIds] = useState<Id<"curriculums">[]>([])

    // Estado para grades y grupos por curriculum
    // Map: curriculumId -> array de gradeCodes seleccionados
    const [selectedGradesByCurriculum, setSelectedGradesByCurriculum] = useState<Map<Id<"curriculums">, string[]>>(new Map())
    // Map: curriculumId -> Map: gradeCode -> array de groupCodes seleccionados
    const [selectedGroupsByCurriculum, setSelectedGroupsByCurriculum] = useState<Map<Id<"curriculums">, Map<string, string[]>>>(new Map())

    // Estados iniciales para detectar cambios en grades/grupos
    const [initialGradesByCurriculum, setInitialGradesByCurriculum] = useState<Map<Id<"curriculums">, string[]>>(new Map())
    const [initialGroupsByCurriculum, setInitialGroupsByCurriculum] = useState<Map<Id<"curriculums">, Map<string, string[]>>>(new Map())

    // Query para obtener información del teacher (necesitamos su campusId)
    const teacher = useQuery(api.users.getUser, { userId: teacherId as Id<"users"> })

    // Query para obtener información del campus (necesitamos los grades con numberOfGroups)
    const campus = useQuery(
        api.campuses.getCampus,
        teacher?.campusId ? { campusId: teacher.campusId } : "skip"
    )

    // Query para obtener curriculums disponibles
    const allCurriculums = useQuery(api.curriculums.getCurriculums, { isActive: true })
    // Show both active and draft curriculums (exclude archived and deprecated)
    const availableCurriculums = allCurriculums?.filter(curriculum =>
        curriculum.status === "active" || curriculum.status === "draft"
    ) || []

    // Query para obtener curriculums ya asignados al profesor
    const teacherCurriculums = useQuery(api.curriculums.getCurriculumsByTeacherNew, {
        teacherId: teacherId as Id<"users">,
        isActive: true,
    })

    // Query para obtener los teacher_assignments con grades/groups asignados
    const teacherAssignmentsDetails = useQuery(
        api.curriculums.getTeacherAssignmentsDetails,
        teacher?.campusId ? {
            teacherId: teacherId as Id<"users">,
            campusId: teacher.campusId
        } : "skip"
    )

    // Mutations
    const addTeacherToCurriculum = useMutation(api.curriculums.addTeacherToCurriculum)
    const removeTeacherFromCurriculum = useMutation(api.curriculums.removeTeacherFromCurriculum)
    const updateTeacherAssignmentGrades = useMutation(api.curriculums.updateTeacherAssignmentGrades)

    // Inicializar con los curriculums ya asignados al profesor
    useEffect(() => {
        if (teacherCurriculums && teacherAssignmentsDetails && campus) {
            const curriculumIds = teacherCurriculums.map(c => c._id)
            setSelectedCurriculumIds(curriculumIds)
            setInitialCurriculumIds(curriculumIds)

            // Inicializar grades y grupos desde los teacher_assignments existentes
            const initialGradesMap = new Map<Id<"curriculums">, string[]>();
            const initialGroupsMap = new Map<Id<"curriculums">, Map<string, string[]>>();

            teacherAssignmentsDetails.forEach(assignment => {
                const assignedGrades = assignment.assignedGrades || [];
                const assignedGroupCodes = assignment.assignedGroupCodes || [];

                // Guardar grades asignados
                initialGradesMap.set(assignment.curriculumId, assignedGrades);

                // Reconstruir el mapa de grupos por grade
                const gradeGroupsMap = new Map<string, string[]>();
                assignedGrades.forEach(gradeCode => {
                    // Filtrar los group codes que pertenecen a este grade
                    const groupsForGrade = assignedGroupCodes.filter(gc => gc.startsWith(gradeCode + "-"));
                    gradeGroupsMap.set(gradeCode, groupsForGrade);
                });

                initialGroupsMap.set(assignment.curriculumId, gradeGroupsMap);
            });

            // Establecer estados actuales e iniciales
            setSelectedGradesByCurriculum(initialGradesMap);
            setInitialGradesByCurriculum(new Map(initialGradesMap));

            setSelectedGroupsByCurriculum(initialGroupsMap);
            setInitialGroupsByCurriculum(new Map(initialGroupsMap));
        }
    }, [teacherCurriculums, teacherAssignmentsDetails, campus])

    const selectedCurriculums = availableCurriculums.filter(curriculum =>
        selectedCurriculumIds.includes(curriculum._id)
    )

    const handleCurriculumToggle = (curriculumId: Id<"curriculums">) => {
        const isCurrentlySelected = selectedCurriculumIds.includes(curriculumId);

        if (isCurrentlySelected) {
            // Deseleccionar curriculum y limpiar sus grades/groups
            setSelectedCurriculumIds(prev => prev.filter(id => id !== curriculumId))
            setSelectedGradesByCurriculum(prev => {
                const newMap = new Map(prev);
                newMap.delete(curriculumId);
                return newMap;
            });
            setSelectedGroupsByCurriculum(prev => {
                const newMap = new Map(prev);
                newMap.delete(curriculumId);
                return newMap;
            });
        } else {
            // Seleccionar curriculum
            setSelectedCurriculumIds(prev => [...prev, curriculumId])

            // Inicializar con todos los grades del curriculum seleccionados por defecto
            const curriculum = availableCurriculums.find(c => c._id === curriculumId);
            if (curriculum && teacher?.campusId) {
                const campusAssignment = curriculum.campusAssignments?.find(
                    ca => ca.campusId === teacher.campusId
                );

                if (campusAssignment) {
                    const gradeCodes = campusAssignment.gradeCodes;
                    setSelectedGradesByCurriculum(prev => {
                        const newMap = new Map(prev);
                        newMap.set(curriculumId, gradeCodes);
                        return newMap;
                    });

                    // Inicializar con todos los grupos de cada grade seleccionados por defecto
                    const gradeGroupsMap = new Map<string, string[]>();
                    gradeCodes.forEach(gradeCode => {
                        if (campus?.grades) {
                            const groups = getAvailableGroupsForGrade(campus, gradeCode);
                            gradeGroupsMap.set(gradeCode, groups.map(g => g.code));
                        }
                    });

                    setSelectedGroupsByCurriculum(prev => {
                        const newMap = new Map(prev);
                        newMap.set(curriculumId, gradeGroupsMap);
                        return newMap;
                    });
                }
            }
        }
    }

    const handleRemoveCurriculum = (curriculumId: Id<"curriculums">) => {
        setSelectedCurriculumIds(prev => prev.filter(id => id !== curriculumId))
        setSelectedGradesByCurriculum(prev => {
            const newMap = new Map(prev);
            newMap.delete(curriculumId);
            return newMap;
        });
        setSelectedGroupsByCurriculum(prev => {
            const newMap = new Map(prev);
            newMap.delete(curriculumId);
            return newMap;
        });
    }

    const handleGradeToggle = (curriculumId: Id<"curriculums">, gradeCode: string) => {
        const currentGrades = selectedGradesByCurriculum.get(curriculumId) || [];
        const isSelected = currentGrades.includes(gradeCode);

        if (isSelected) {
            // Deseleccionar grade y limpiar sus grupos
            setSelectedGradesByCurriculum(prev => {
                const newMap = new Map(prev);
                newMap.set(curriculumId, currentGrades.filter(g => g !== gradeCode));
                return newMap;
            });

            setSelectedGroupsByCurriculum(prev => {
                const newMap = new Map(prev);
                const curriculumGroups = newMap.get(curriculumId) || new Map();
                curriculumGroups.delete(gradeCode);
                newMap.set(curriculumId, curriculumGroups);
                return newMap;
            });
        } else {
            // Seleccionar grade y todos sus grupos por defecto
            setSelectedGradesByCurriculum(prev => {
                const newMap = new Map(prev);
                newMap.set(curriculumId, [...currentGrades, gradeCode]);
                return newMap;
            });

            if (campus?.grades) {
                const groups = getAvailableGroupsForGrade(campus, gradeCode);
                setSelectedGroupsByCurriculum(prev => {
                    const newMap = new Map(prev);
                    const curriculumGroups = newMap.get(curriculumId) || new Map();
                    curriculumGroups.set(gradeCode, groups.map(g => g.code));
                    newMap.set(curriculumId, curriculumGroups);
                    return newMap;
                });
            }
        }
    }

    const handleGroupToggle = (curriculumId: Id<"curriculums">, gradeCode: string, groupCode: string) => {
        setSelectedGroupsByCurriculum(prev => {
            // Crear una copia profunda del Map
            const newMap = new Map(prev);

            // Obtener o crear el Map de grupos del curriculum
            const curriculumGroups = new Map(newMap.get(curriculumId) || new Map());

            // Obtener la lista actual de grupos para este grade
            const currentGroups = curriculumGroups.get(gradeCode) || [];

            const isSelected = currentGroups.includes(groupCode);

            if (isSelected) {
                // Deseleccionar: remover el grupo
                const updatedGroups = currentGroups.filter((g: string) => g !== groupCode);
                curriculumGroups.set(gradeCode, updatedGroups);
            } else {
                // Seleccionar: agregar el grupo
                curriculumGroups.set(gradeCode, [...currentGroups, groupCode]);
            }

            // Actualizar el Map principal con la copia modificada
            newMap.set(curriculumId, curriculumGroups);
            return newMap;
        });
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        try {
            // Validar que cada curriculum seleccionado tenga al menos un grade y un grupo
            for (const curriculumId of selectedCurriculumIds) {
                const grades = selectedGradesByCurriculum.get(curriculumId) || [];
                const groupsMap = selectedGroupsByCurriculum.get(curriculumId);

                if (grades.length === 0) {
                    const curriculum = availableCurriculums.find(c => c._id === curriculumId);
                    toast.error("Missing grade selection", {
                        description: `Please select at least one grade for "${curriculum?.name}"`
                    });
                    return;
                }

                // Verificar que cada grade tenga al menos un grupo seleccionado
                for (const gradeCode of grades) {
                    const groups = groupsMap?.get(gradeCode) || [];
                    if (groups.length === 0) {
                        const curriculum = availableCurriculums.find(c => c._id === curriculumId);
                        toast.error("Missing group selection", {
                            description: `Please select at least one group for grade "${gradeCode}" in "${curriculum?.name}"`
                        });
                        return;
                    }
                }
            }

            // Determinar qué curriculums añadir y cuáles remover
            const curriculumsToAdd = selectedCurriculumIds.filter(id => !initialCurriculumIds.includes(id))
            const curriculumsToRemove = initialCurriculumIds.filter(id => !selectedCurriculumIds.includes(id))

            // Detectar curriculums con cambios en grades/groups (no añadidos ni removidos)
            const curriculumsToUpdate = selectedCurriculumIds.filter(curriculumId => {
                // Solo considerar curriculums que ya existían
                if (!initialCurriculumIds.includes(curriculumId)) return false;

                // Comparar grades
                const currentGrades = selectedGradesByCurriculum.get(curriculumId) || [];
                const initialGrades = initialGradesByCurriculum.get(curriculumId) || [];
                const gradesChanged = JSON.stringify([...currentGrades].sort()) !== JSON.stringify([...initialGrades].sort());

                // Comparar groups
                const currentGroupsMap = selectedGroupsByCurriculum.get(curriculumId);
                const initialGroupsMap = initialGroupsByCurriculum.get(curriculumId);

                // Convertir Maps a arrays ordenados para comparación
                const currentGroupsArray = Array.from(currentGroupsMap?.entries() || [])
                    .map(([grade, groups]) => [grade, [...groups].sort()] as [string, string[]])
                    .sort((a, b) => (a[0] as string).localeCompare(b[0] as string));
                const initialGroupsArray = Array.from(initialGroupsMap?.entries() || [])
                    .map(([grade, groups]) => [grade, [...groups].sort()] as [string, string[]])
                    .sort((a, b) => (a[0] as string).localeCompare(b[0] as string));
                const groupsChanged = JSON.stringify(currentGroupsArray) !== JSON.stringify(initialGroupsArray);

                return gradesChanged || groupsChanged;
            });

            // Verificar que el teacher tiene un campus asignado para poder añadir curriculums
            if (curriculumsToAdd.length > 0 && !teacher?.campusId) {
                toast.error("Cannot assign curriculums", {
                    description: "This teacher must be assigned to a campus before adding curriculums."
                })
                return
            }

            // Verificar conflictos para curriculums nuevos y actualizados
            const curriculumsToCheck = [...curriculumsToAdd, ...curriculumsToUpdate];
            for (const curriculumId of curriculumsToCheck) {
                const curriculum = availableCurriculums.find(c => c._id === curriculumId);
                const groupsMap = selectedGroupsByCurriculum.get(curriculumId) || new Map();

                // Recolectar todos los group codes
                const allGroupCodes: string[] = [];
                groupsMap.forEach((groups) => {
                    allGroupCodes.push(...groups);
                });

                // Verificar conflictos
                try {
                    const conflicts = await convex.query(api.curriculums.checkTeacherAssignmentConflicts, {
                        curriculumId,
                        campusId: teacher!.campusId!,
                        groupCodes: allGroupCodes,
                        excludeTeacherId: teacherId as Id<"users">,
                    });

                    if (conflicts.length > 0) {
                        // Construir mensaje de error con detalles
                        const conflictMessages = conflicts.map(conflict => {
                            const groups = conflict.conflictingGroups.map(code => {
                                const parts = code.split('-');
                                return `${parts[0]} - Group ${parts[1]}`;
                            }).join(', ');
                            return `${conflict.teacherName} is already assigned to: ${groups}`;
                        });

                        toast.error(`Assignment conflict in "${curriculum?.name}"`, {
                            description: conflictMessages.join(' | '),
                            duration: 8000,
                        });
                        return;
                    }
                } catch (error) {
                    console.error("Error checking conflicts:", error);
                    toast.error("Error checking conflicts", {
                        description: "Could not verify if there are assignment conflicts. Please try again."
                    });
                    return;
                }
            }

            // Añadir teacher a los curriculums seleccionados
            await Promise.all(
                curriculumsToAdd.map(curriculumId => {
                    const grades = selectedGradesByCurriculum.get(curriculumId) || [];
                    const groupsMap = selectedGroupsByCurriculum.get(curriculumId) || new Map();

                    // Recolectar todos los group codes de todos los grades
                    const allGroupCodes: string[] = [];
                    grades.forEach(gradeCode => {
                        const groups = groupsMap.get(gradeCode) || [];
                        allGroupCodes.push(...groups);
                    });

                    return addTeacherToCurriculum({
                        curriculumId,
                        teacherId: teacherId as Id<"users">,
                        campusId: teacher!.campusId!,
                        assignedGrades: grades,
                        assignedGroupCodes: allGroupCodes,
                    });
                })
            )

            // Actualizar assignments con cambios en grades/groups
            await Promise.all(
                curriculumsToUpdate.map(async curriculumId => {
                    const assignment = teacherAssignmentsDetails?.find(a => a.curriculumId === curriculumId);
                    if (!assignment) return;

                    const grades = selectedGradesByCurriculum.get(curriculumId) || [];
                    const groupsMap = selectedGroupsByCurriculum.get(curriculumId) || new Map();

                    // Recolectar todos los group codes de todos los grades
                    const allGroupCodes: string[] = [];
                    grades.forEach(gradeCode => {
                        const groups = groupsMap.get(gradeCode) || [];
                        allGroupCodes.push(...groups);
                    });

                    return updateTeacherAssignmentGrades({
                        assignmentId: assignment._id,
                        assignedGrades: grades,
                        assignedGroupCodes: allGroupCodes,
                    });
                })
            )

            // Remover teacher de los curriculums deseleccionados
            await Promise.all(
                curriculumsToRemove.map(curriculumId =>
                    removeTeacherFromCurriculum({
                        curriculumId,
                        teacherId: teacherId as Id<"users">,
                    })
                )
            )

            if (curriculumsToAdd.length > 0 || curriculumsToRemove.length > 0 || curriculumsToUpdate.length > 0) {
                const message = []
                if (curriculumsToAdd.length > 0) {
                    message.push(`${curriculumsToAdd.length} curriculum${curriculumsToAdd.length === 1 ? '' : 's'} added`)
                }
                if (curriculumsToUpdate.length > 0) {
                    message.push(`${curriculumsToUpdate.length} curriculum${curriculumsToUpdate.length === 1 ? '' : 's'} updated`)
                }
                if (curriculumsToRemove.length > 0) {
                    message.push(`${curriculumsToRemove.length} curriculum${curriculumsToRemove.length === 1 ? '' : 's'} removed`)
                }

                toast.success("Curriculums updated successfully", {
                    description: message.join(', ') + '.'
                })
            } else {
                toast.info("No changes detected", {
                    description: "No curriculums were added, updated, or removed."
                })
            }

            // Actualizar los estados iniciales
            setInitialCurriculumIds(selectedCurriculumIds)
            setInitialGradesByCurriculum(new Map(selectedGradesByCurriculum))
            setInitialGroupsByCurriculum(new Map(selectedGroupsByCurriculum))
        } catch {
            toast.error("Error updating curriculums", {
                description: "There was a problem updating the curriculums. Please try again."
            })
        }
    }

    const trigger = (
        <Button className="bg-sidebar-accent h-9 dark:text-white gap-2">
            <ListCheck className="h-4 w-4" />
            <span className="hidden md:inline">Update Curriculums</span>
        </Button>
    )

    return (
        <EntityDialog
            trigger={trigger}
            title="Add Curriculums to Teacher"
            onSubmit={handleSubmit}
            submitLabel="Update Curriculums"
            maxWidth="700px"
        >
            <div className="grid gap-6">


                {/* Curriculum Selection */}
                <div className="space-y-4">
                    <h4 className="text-sm font-medium border-b pb-2">Available Curriculums</h4>
                    <div className="grid gap-3">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full justify-between">
                                    <span className="text-muted-foreground">
                                        Choose curriculums to add...
                                    </span>
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-80 max-h-80 overflow-y-auto" align="start">
                                <DropdownMenuLabel>Available Curriculums ({availableCurriculums.length})</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {availableCurriculums.map((curriculum) => {
                                    const isSelected = selectedCurriculumIds.includes(curriculum._id)
                                    return (
                                        <DropdownMenuItem
                                            key={curriculum._id}
                                            onClick={() => handleCurriculumToggle(curriculum._id)}
                                            className={`${isSelected ? "bg-accent" : ""} cursor-pointer`}
                                        >
                                            <div className="flex flex-col gap-1 w-full">
                                                <div className="flex items-center gap-2">
                                                    <BookOpen className="h-4 w-4" />
                                                    <span className="font-medium">{curriculum.name}</span>
                                                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                                        {curriculum.code}
                                                    </span>
                                                    {isSelected && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            Selected
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between ml-6">
                                                    <span className="text-sm text-muted-foreground">
                                                        {curriculum.metrics?.totalLessons || 0} lessons • {curriculum.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </DropdownMenuItem>
                                    )
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Selected Curriculums Display */}
                {selectedCurriculums.length > 0 && (
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium border-b pb-2">
                            Selected Curriculums & Grade Assignments ({selectedCurriculums.length})
                        </h4>
                        <div className="space-y-6">
                            {selectedCurriculums.map((curriculum) => {
                                const campusAssignment = curriculum.campusAssignments?.find(
                                    ca => ca.campusId === teacher?.campusId
                                );
                                const availableGrades = campusAssignment?.gradeCodes || [];
                                const selectedGrades = selectedGradesByCurriculum.get(curriculum._id) || [];
                                const selectedGroupsMap = selectedGroupsByCurriculum.get(curriculum._id) || new Map();

                                return (
                                    <div key={curriculum._id} className="border rounded-lg p-4 space-y-4">
                                        {/* Curriculum Header */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <BookOpen className="h-4 w-4" />
                                                <span className="font-medium">{curriculum.name}</span>
                                                <Badge variant="secondary" className="text-xs">
                                                    {curriculum.code}
                                                </Badge>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveCurriculum(curriculum._id)}
                                                className="rounded-full hover:bg-muted p-1.5"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>

                                        {/* Grades Selection */}
                                        <div className="space-y-3">
                                            <Label className="text-sm flex items-center gap-2">
                                                <GraduationCap className="h-4 w-4" />
                                                Grades to Teach
                                            </Label>
                                            <div className="grid grid-cols-2 gap-3 pl-6">
                                                {availableGrades.map((gradeCode) => {
                                                    const isGradeSelected = selectedGrades.includes(gradeCode);
                                                    const grade = campus?.grades?.find(g => g.code === gradeCode);

                                                    return (
                                                        <div key={gradeCode} className="space-y-2">
                                                            {/* Grade Checkbox */}
                                                            <div className="flex items-center space-x-2">
                                                                <Checkbox
                                                                    id={`${curriculum._id}-${gradeCode}`}
                                                                    checked={isGradeSelected}
                                                                    onCheckedChange={() => handleGradeToggle(curriculum._id, gradeCode)}
                                                                />
                                                                <label
                                                                    htmlFor={`${curriculum._id}-${gradeCode}`}
                                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                                >
                                                                    {grade?.name || gradeCode}
                                                                </label>
                                                            </div>

                                                            {/* Groups Selection (shown when grade is selected) */}
                                                            {isGradeSelected && campus && (
                                                                <div className="pl-6 space-y-1.5">
                                                                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                                                        <Users className="h-3 w-3" />
                                                                        Groups:
                                                                    </Label>
                                                                    {getAvailableGroupsForGrade(campus, gradeCode).map((group) => {
                                                                        const isGroupSelected = selectedGroupsMap.get(gradeCode)?.includes(group.code) || false;

                                                                        return (
                                                                            <div key={group.code} className="flex items-center space-x-2">
                                                                                <Checkbox
                                                                                    id={`${curriculum._id}-${group.code}`}
                                                                                    checked={isGroupSelected}
                                                                                    onCheckedChange={() => handleGroupToggle(curriculum._id, gradeCode, group.code)}
                                                                                />
                                                                                <label
                                                                                    htmlFor={`${curriculum._id}-${group.code}`}
                                                                                    className="text-xs leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                                                >
                                                                                    Group {group.code.split('-')[1]}
                                                                                </label>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Summary */}
                                        <div className="pt-2 border-t text-xs text-muted-foreground">
                                            {selectedGrades.length > 0 ? (
                                                <span>
                                                    Teaching {selectedGrades.length} grade{selectedGrades.length !== 1 ? 's' : ''}
                                                    {' • '}
                                                    {Array.from(selectedGroupsMap.values()).reduce((sum, groups) => sum + groups.length, 0)} group
                                                    {Array.from(selectedGroupsMap.values()).reduce((sum, groups) => sum + groups.length, 0) !== 1 ? 's' : ''}
                                                </span>
                                            ) : (
                                                <span className="text-destructive">⚠️ Please select at least one grade</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                {/* Create New Curriculum Option */}
                <div className="space-y-4">
                    <h4 className="text-sm font-medium border-b pb-2">Don&apos;t see the curriculum you need?</h4>
                    <div className="flex flex-col gap-3">
                        <p className="text-sm text-muted-foreground">
                            If the curriculum you want to assign isn&apos;t in the system yet, you can create a new curriculum.
                        </p>
                        <CurriculumDialog
                            trigger={
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="gap-2 self-start"
                                >
                                    <FileText className="h-4 w-4" />
                                    Create Curriculum
                                </Button>
                            }
                        />
                    </div>
                </div>
            </div>
        </EntityDialog>
    )
}