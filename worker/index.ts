import { api } from "@shared/routes";
import type { FamilyMember, InsertFamilyMember, UpdateMemberRequest } from "@shared/schema";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

type Env = {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
};

const tableName = "family_members";

function toDbMember(member: InsertFamilyMember | UpdateMemberRequest) {
  const payload: Record<string, unknown> = {};
  if ("name" in member && member.name !== undefined) payload.name = member.name;
  if ("parentId" in member && member.parentId !== undefined) payload.parent_id = member.parentId;
  if ("motherName" in member && member.motherName !== undefined) payload.mother_name = member.motherName;
  if ("phoneNumber" in member && member.phoneNumber !== undefined) payload.phone_number = member.phoneNumber;
  if ("isDeceased" in member && member.isDeceased !== undefined) payload.is_deceased = member.isDeceased;
  if ("position" in member && member.position !== undefined) payload.position = member.position;
  return payload;
}

function fromDbMember(row: Record<string, any>): FamilyMember {
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

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
  });
}

async function readJson<T>(request: Request): Promise<T> {
  const text = await request.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

function getSupabase(env: Env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set.");
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const supabase = getSupabase(env);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (path === api.family.list.path && request.method === "GET") {
    const { data, error } = await supabase.from(tableName).select("*");
    if (error) {
      return jsonResponse({ message: error.message }, { status: 500 });
    }
    return jsonResponse((data ?? []).map((row) => fromDbMember(row)));
  }

  if (path.startsWith("/api/family/") && request.method === "GET") {
    const id = Number(path.split("/").pop());
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      return jsonResponse({ message: error.message }, { status: 500 });
    }
    if (!data) {
      return jsonResponse({ message: "Family member not found" }, { status: 404 });
    }
    return jsonResponse(fromDbMember(data));
  }

  if (path === api.family.create.path && request.method === "POST") {
    try {
      const input = api.family.create.input.parse(await readJson(request));
      const { data, error } = await supabase
        .from(tableName)
        .insert(toDbMember(input))
        .select("*")
        .single();
      if (error || !data) {
        throw new Error(error?.message || "Failed to create family member");
      }
      return jsonResponse(fromDbMember(data), { status: 201 });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return jsonResponse(
          { message: err.errors[0].message, field: err.errors[0].path.join(".") },
          { status: 400 },
        );
      }
      return jsonResponse({ message: err instanceof Error ? err.message : "Create failed" }, { status: 400 });
    }
  }

  if (path.startsWith("/api/family/") && request.method === "PUT") {
    try {
      const id = Number(path.split("/").pop());
      const input = api.family.update.input.parse(await readJson(request));
      const { data, error } = await supabase
        .from(tableName)
        .update(toDbMember(input))
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (error) {
        return jsonResponse({ message: error.message }, { status: 500 });
      }
      if (!data) {
        return jsonResponse({ message: "Family member not found" }, { status: 404 });
      }
      return jsonResponse(fromDbMember(data));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return jsonResponse(
          { message: err.errors[0].message, field: err.errors[0].path.join(".") },
          { status: 400 },
        );
      }
      return jsonResponse({ message: err instanceof Error ? err.message : "Update failed" }, { status: 400 });
    }
  }

  if (path.startsWith("/api/family/") && request.method === "DELETE") {
    const id = Number(path.split("/").pop());
    const { error } = await supabase.from(tableName).delete().eq("id", id);
    if (error) {
      return jsonResponse({ message: error.message }, { status: 500 });
    }
    return new Response(null, { status: 204 });
  }

  if (path === api.family.swap.path && request.method === "POST") {
    try {
      const input = api.family.swap.input.parse(await readJson(request));
      const { data: member1, error: error1 } = await supabase
        .from(tableName)
        .select("*")
        .eq("id", input.id1)
        .maybeSingle();
      const { data: member2, error: error2 } = await supabase
        .from(tableName)
        .select("*")
        .eq("id", input.id2)
        .maybeSingle();
      if (error1 || error2) {
        return jsonResponse({ message: error1?.message || error2?.message }, { status: 500 });
      }
      if (!member1 || !member2) {
        return jsonResponse({ message: "One or both members not found" }, { status: 400 });
      }

      const tempPosition = member1.position;
      const { error: updateError1 } = await supabase
        .from(tableName)
        .update({ position: member2.position })
        .eq("id", input.id1);
      if (updateError1) {
        return jsonResponse({ message: updateError1.message }, { status: 500 });
      }
      const { error: updateError2 } = await supabase
        .from(tableName)
        .update({ position: tempPosition })
        .eq("id", input.id2);
      if (updateError2) {
        return jsonResponse({ message: updateError2.message }, { status: 500 });
      }

      const { data: updated1 } = await supabase
        .from(tableName)
        .select("*")
        .eq("id", input.id1)
        .maybeSingle();
      const { data: updated2 } = await supabase
        .from(tableName)
        .select("*")
        .eq("id", input.id2)
        .maybeSingle();

      return jsonResponse({
        member1: updated1 ? fromDbMember(updated1) : null,
        member2: updated2 ? fromDbMember(updated2) : null,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return jsonResponse(
          { message: err.errors[0].message, field: err.errors[0].path.join(".") },
          { status: 400 },
        );
      }
      return jsonResponse({ message: err instanceof Error ? err.message : "Swap failed" }, { status: 400 });
    }
  }

  return jsonResponse({ message: "Not found" }, { status: 404 });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
