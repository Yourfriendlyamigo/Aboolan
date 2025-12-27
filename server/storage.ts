
import { supabase } from "./supabase";
import type {
  InsertFamilyMember,
  UpdateMemberRequest,
  FamilyMember,
} from "@shared/schema";

export interface IStorage {
  getFamilyMembers(): Promise<FamilyMember[]>;
  getFamilyMember(id: number): Promise<FamilyMember | undefined>;
  createFamilyMember(member: InsertFamilyMember): Promise<FamilyMember>;
  updateFamilyMember(id: number, updates: UpdateMemberRequest): Promise<FamilyMember | undefined>;
  deleteFamilyMember(id: number): Promise<void>;
  swapMembers(id1: number, id2: number): Promise<{ member1: FamilyMember; member2: FamilyMember }>;
}

export class DatabaseStorage implements IStorage {
  private readonly tableName = "family_members";

  private toDbMember(member: InsertFamilyMember | UpdateMemberRequest) {
    const payload: Record<string, unknown> = {};
    if ("name" in member && member.name !== undefined) payload.name = member.name;
    if ("parentId" in member && member.parentId !== undefined) payload.parent_id = member.parentId;
    if ("motherName" in member && member.motherName !== undefined) payload.mother_name = member.motherName;
    if ("phoneNumber" in member && member.phoneNumber !== undefined) payload.phone_number = member.phoneNumber;
    if ("isDeceased" in member && member.isDeceased !== undefined) payload.is_deceased = member.isDeceased;
    if ("position" in member && member.position !== undefined) payload.position = member.position;
    return payload;
  }

  private fromDbMember(row: Record<string, any>): FamilyMember {
    return {
      id: row.id,
      name: row.name,
      parentId: row.parent_id ?? null,
      motherName: row.mother_name ?? null,
      phoneNumber: row.phone_number ?? null,
      isDeceased: row.is_deceased,
      position: row.position,
    };
  }

  async getFamilyMembers(): Promise<FamilyMember[]> {
    const { data, error } = await supabase.from(this.tableName).select("*");
    if (error) {
      throw new Error(error.message);
    }
    return (data ?? []).map((row) => this.fromDbMember(row));
  }

  async getFamilyMember(id: number): Promise<FamilyMember | undefined> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    return data ? this.fromDbMember(data) : undefined;
  }

  async createFamilyMember(member: InsertFamilyMember): Promise<FamilyMember> {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(this.toDbMember(member))
      .select("*")
      .single();
    if (error || !data) {
      throw new Error(error?.message || "Failed to create family member");
    }
    return this.fromDbMember(data);
  }

  async updateFamilyMember(id: number, updates: UpdateMemberRequest): Promise<FamilyMember | undefined> {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(this.toDbMember(updates))
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    return data ? this.fromDbMember(data) : undefined;
  }

  async deleteFamilyMember(id: number): Promise<void> {
    const { error } = await supabase.from(this.tableName).delete().eq("id", id);
    if (error) {
      throw new Error(error.message);
    }
  }

  async swapMembers(id1: number, id2: number): Promise<{ member1: FamilyMember; member2: FamilyMember }> {
    const member1 = await this.getFamilyMember(id1);
    const member2 = await this.getFamilyMember(id2);
    
    if (!member1 || !member2) {
      throw new Error("One or both members not found");
    }

    // Swap positions
    const tempPosition = member1.position;
    const { error: updateError1 } = await supabase
      .from(this.tableName)
      .update({ position: member2.position })
      .eq("id", id1);
    if (updateError1) {
      throw new Error(updateError1.message);
    }
    const { error: updateError2 } = await supabase
      .from(this.tableName)
      .update({ position: tempPosition })
      .eq("id", id2);
    if (updateError2) {
      throw new Error(updateError2.message);
    }

    const updated1 = await this.getFamilyMember(id1);
    const updated2 = await this.getFamilyMember(id2);
    
    return { member1: updated1!, member2: updated2! };
  }
}

export const storage = new DatabaseStorage();
