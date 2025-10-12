"use client"

import { Button } from "@/components/ui/button"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { toast } from "sonner"
import { Database } from "lucide-react"
import { useState } from "react"

export function MigrateAssignmentsButton() {
    const [isRunning, setIsRunning] = useState(false)
    const migrate = useMutation(api.admin.migrateTeacherAssignments)

    const handleMigrate = async () => {
        if (!confirm("¿Estás seguro de que deseas ejecutar la migración? Esto creará teacher_assignments para todas las asignaciones existentes.")) {
            return
        }

        setIsRunning(true)
        try {
            const result = await migrate({})
            toast.success("Migración completada", {
                description: result.message
            })
        } catch (error) {
            toast.error("Error en la migración", {
                description: error instanceof Error ? error.message : "Error desconocido"
            })
        } finally {
            setIsRunning(false)
        }
    }

    return (
        <Button
            onClick={handleMigrate}
            disabled={isRunning}
            variant="outline"
            className="gap-2"
        >
            <Database className="h-4 w-4" />
            {isRunning ? "Migrando..." : "Migrar Teacher Assignments"}
        </Button>
    )
}
