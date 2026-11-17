import { z } from "zod";
import { INVITABLE_ROLES } from "@/lib/types/workspace";

export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Workspace name must be at least 2 characters")
    .max(80, "Workspace name must be 80 characters or fewer"),
});

export const updateWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Workspace name must be at least 2 characters")
    .max(80, "Workspace name must be 80 characters or fewer"),
});

export const setActiveWorkspaceSchema = z.object({
  workspaceId: z.string().uuid(),
});

export const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email("Valid email required"),
  role: z.enum(INVITABLE_ROLES),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(INVITABLE_ROLES),
});

export const acceptInvitationSchema = z.object({
  invitationId: z.string().uuid(),
});

export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer"),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
