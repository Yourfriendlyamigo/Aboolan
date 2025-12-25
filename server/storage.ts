
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
  swapMembers(id1: number, id2: number): Promise<{ member1: FamilyMember; member2: FamilyMember }>;
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

  async swapMembers(id1: number, id2: number): Promise<{ member1: FamilyMember; member2: FamilyMember }> {
    const member1 = await this.getFamilyMember(id1);
    const member2 = await this.getFamilyMember(id2);
    
    if (!member1 || !member2) {
      throw new Error("One or both members not found");
    }

    // Swap positions
    const tempPosition = member1.position;
    await db.update(familyMembers).set({ position: member2.position }).where(eq(familyMembers.id, id1));
    await db.update(familyMembers).set({ position: tempPosition }).where(eq(familyMembers.id, id2));

    const updated1 = await this.getFamilyMember(id1);
    const updated2 = await this.getFamilyMember(id2);
    
    return { member1: updated1!, member2: updated2! };
  }
}

export const storage = new DatabaseStorage();
