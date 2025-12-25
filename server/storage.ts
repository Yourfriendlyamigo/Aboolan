
import { db } from "./db";
import {
  familyMembers,
  type InsertFamilyMember,
  type UpdateMemberRequest,
  type FamilyMember
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getFamilyMembers(): Promise<FamilyMember[]>;
  getFamilyMember(id: number): Promise<FamilyMember | undefined>;
  createFamilyMember(member: InsertFamilyMember): Promise<FamilyMember>;
  updateFamilyMember(id: number, updates: UpdateMemberRequest): Promise<FamilyMember>;
  deleteFamilyMember(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getFamilyMembers(): Promise<FamilyMember[]> {
    return await db.select().from(familyMembers);
  }

  async getFamilyMember(id: number): Promise<FamilyMember | undefined> {
    const [member] = await db.select().from(familyMembers).where(eq(familyMembers.id, id));
    return member;
  }

  async createFamilyMember(member: InsertFamilyMember): Promise<FamilyMember> {
    const [newMember] = await db.insert(familyMembers).values(member).returning();
    return newMember;
  }

  async updateFamilyMember(id: number, updates: UpdateMemberRequest): Promise<FamilyMember> {
    const [updated] = await db
      .update(familyMembers)
      .set(updates)
      .where(eq(familyMembers.id, id))
      .returning();
    return updated;
  }

  async deleteFamilyMember(id: number): Promise<void> {
    await db.delete(familyMembers).where(eq(familyMembers.id, id));
  }
}

export const storage = new DatabaseStorage();
