
import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const familyMembers = pgTable("family_members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  parentId: integer("parent_id"), // Can be null for the root nodes (grandparents)
  motherName: text("mother_name"), // Optional: mother's name
  phoneNumber: text("phone_number"),
  isDeceased: boolean("is_deceased").default(false).notNull(),
  position: integer("position").default(0).notNull(), // For ordering siblings
  // For tree visualization, it helps to know generation/level, but we can compute it or store it.
  // We'll compute it on the frontend or backend recursion.
});

export const familyMembersRelations = relations(familyMembers, ({ one, many }) => ({
  parent: one(familyMembers, {
    fields: [familyMembers.parentId],
    references: [familyMembers.id],
    relationName: "parent_child",
  }),
  children: many(familyMembers, {
    relationName: "parent_child",
  }),
}));

export const insertFamilyMemberSchema = createInsertSchema(familyMembers).omit({ id: true });

export type FamilyMember = typeof familyMembers.$inferSelect;
export type InsertFamilyMember = z.infer<typeof insertFamilyMemberSchema>;

// API Types
export type CreateMemberRequest = InsertFamilyMember;
export type UpdateMemberRequest = Partial<InsertFamilyMember>;

// A tree node structure for the frontend to consume easily
export interface FamilyTreeNode extends FamilyMember {
  children?: FamilyTreeNode[];
  level?: number; // Helper for coloring
}
