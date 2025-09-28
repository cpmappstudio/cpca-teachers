/**
 * Funciones de autenticación y sincronización con Clerk
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Obtener información del usuario actual desde Convex
 */
export const getCurrentUser = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            return null;
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .first();

        return user;
    },
});

/**
 * Sincronizar rol de usuario con Clerk
 * Esta función debe ser llamada después de crear o actualizar un usuario
 */
export const syncUserRoleWithClerk = mutation({
    args: {
        clerkId: v.string(),
    },
    handler: async (ctx, args) => {
        // Verificar que quien ejecuta tiene permisos
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        // Obtener usuario desde Convex
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .first();

        if (!user) {
            throw new Error("Usuario no encontrado");
        }

        // Aquí deberías usar la API de Clerk para actualizar los metadata
        // Por ahora, solo retornamos la información del usuario
        console.log(`Usuario ${user.email} tiene rol: ${user.role}`);

        return {
            clerkId: user.clerkId,
            role: user.role,
            email: user.email,
        };
    },
});

/**
 * Hook para ser usado en webhooks de Clerk
 * Sincroniza usuarios automáticamente cuando se crean/actualizan en Clerk
 */
export const handleClerkWebhook = mutation({
    args: {
        eventType: v.string(),
        userId: v.string(),
        email: v.optional(v.string()),
        firstName: v.optional(v.string()),
        lastName: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        switch (args.eventType) {
            case "user.created":
                // Si el usuario ya existe en Convex, no hacer nada
                const existingUser = await ctx.db
                    .query("users")
                    .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.userId))
                    .first();

                if (existingUser) {
                    console.log(`Usuario ${args.email} ya existe en Convex`);
                    return existingUser._id;
                }

                // Si no existe, crear con rol por defecto (pending)
                const newUserId = await ctx.db.insert("users", {
                    clerkId: args.userId,
                    email: args.email || "",
                    firstName: args.firstName || "",
                    lastName: args.lastName || "",
                    fullName: `${args.firstName || ""} ${args.lastName || ""}`.trim(),
                    role: "teacher", // Rol por defecto
                    isActive: true,
                    status: "active",
                    createdAt: Date.now(),
                });

                return newUserId;

            case "user.updated":
                // Actualizar información básica del usuario
                const userToUpdate = await ctx.db
                    .query("users")
                    .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.userId))
                    .first();

                if (userToUpdate) {
                    await ctx.db.patch(userToUpdate._id, {
                        email: args.email || userToUpdate.email,
                        firstName: args.firstName || userToUpdate.firstName,
                        lastName: args.lastName || userToUpdate.lastName,
                        fullName: `${args.firstName || userToUpdate.firstName} ${args.lastName || userToUpdate.lastName}`.trim(),
                        updatedAt: Date.now(),
                    });
                }

                return userToUpdate?._id;

            default:
                console.log(`Evento no manejado: ${args.eventType}`);
                return null;
        }
    },
});