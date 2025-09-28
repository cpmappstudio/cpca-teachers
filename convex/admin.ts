/**
 * Funciones administrativas para gestión de usuarios
 * Incluye función especial para crear el primer superadmin
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Función especial para crear el primer superadmin del sistema
 * Solo debe ejecutarse una vez durante la inicialización
 */
export const createInitialSuperAdmin = mutation({
    args: {
        clerkId: v.string(),
        email: v.string(),
        firstName: v.string(),
        lastName: v.string(),
        fullName: v.string(),
        role: v.literal("superadmin"),
        phone: v.optional(v.string()),
        isActive: v.boolean(),
        status: v.union(
            v.literal("active"),
            v.literal("inactive"),
            v.literal("on_leave"),
            v.literal("terminated")
        ),
        createdAt: v.number(),
    },
    handler: async (ctx, args) => {
        // Verificar que no exista ya un superadmin
        const existingSuperAdmin = await ctx.db
            .query("users")
            .withIndex("by_role_active", (q) => q.eq("role", "superadmin").eq("isActive", true))
            .first();

        if (existingSuperAdmin) {
            throw new Error("Ya existe un superadmin en el sistema. No se puede crear otro.");
        }

        // Verificar que no exista un usuario con el mismo clerkId
        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .first();

        if (existingUser) {
            throw new Error("Ya existe un usuario con este Clerk ID.");
        }

        // Crear el superadmin
        const userId = await ctx.db.insert("users", {
            clerkId: args.clerkId,
            email: args.email,
            firstName: args.firstName,
            lastName: args.lastName,
            fullName: args.fullName,
            role: args.role,
            phone: args.phone,
            isActive: args.isActive,
            status: args.status,
            createdAt: args.createdAt,
            // No tiene campusId porque el superadmin puede acceder a todos
        });

        return userId;
    },
});

/**
 * Verificar si ya existe un superadmin en el sistema
 */
export const checkSuperAdminExists = query({
    args: {},
    handler: async (ctx) => {
        const superAdmin = await ctx.db
            .query("users")
            .withIndex("by_role_active", (q) => q.eq("role", "superadmin").eq("isActive", true))
            .first();

        return !!superAdmin;
    },
});

/**
 * Obtener información del superadmin actual
 */
export const getSuperAdminInfo = query({
    args: {},
    handler: async (ctx) => {
        const superAdmin = await ctx.db
            .query("users")
            .withIndex("by_role_active", (q) => q.eq("role", "superadmin").eq("isActive", true))
            .first();

        if (!superAdmin) {
            return null;
        }

        // No devolver información sensible
        return {
            id: superAdmin._id,
            email: superAdmin.email,
            fullName: superAdmin.fullName,
            createdAt: superAdmin.createdAt,
            lastLoginAt: superAdmin.lastLoginAt,
            status: superAdmin.status,
        };
    },
});

/**
 * Obtener usuarios que pueden ser directores de campus
 * Incluye admins y superadmins activos
 */
export const getPotentialDirectors = query({
    args: {},
    handler: async (ctx) => {
        // Obtener admins activos
        const admins = await ctx.db
            .query("users")
            .withIndex("by_role_active", (q) => q.eq("role", "admin").eq("isActive", true))
            .collect();

        // Obtener superadmins activos
        const superadmins = await ctx.db
            .query("users")
            .withIndex("by_role_active", (q) => q.eq("role", "superadmin").eq("isActive", true))
            .collect();

        // Combinar ambos arrays
        const potentialDirectors = [...admins, ...superadmins];

        // Devolver solo la información necesaria para el dropdown
        return potentialDirectors.map(user => ({
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            campusId: user.campusId,
        }));
    },
});