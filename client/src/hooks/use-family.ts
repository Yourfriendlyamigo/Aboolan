import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateMemberRequest, type UpdateMemberRequest, type FamilyMemberResponse } from "@shared/routes";
import { z } from "zod";

// Fetch all family members
export function useFamilyMembers() {
  return useQuery({
    queryKey: [api.family.list.path],
    queryFn: async () => {
      const res = await fetch(api.family.list.path);
      if (!res.ok) throw new Error("Failed to fetch family tree");
      return api.family.list.responses[200].parse(await res.json());
    },
  });
}

// Fetch single member
export function useFamilyMember(id: number) {
  return useQuery({
    queryKey: [api.family.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.family.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch family member");
      return api.family.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

// Create new member
export function useCreateFamilyMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateMemberRequest) => {
      const validated = api.family.create.input.parse(data);
      const res = await fetch(api.family.create.path, {
        method: api.family.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.family.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create family member");
      }
      return api.family.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.family.list.path] });
    },
  });
}

// Update member
export function useUpdateFamilyMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateMemberRequest) => {
      const validated = api.family.update.input.parse(updates);
      const url = buildUrl(api.family.update.path, { id });
      const res = await fetch(url, {
        method: api.family.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 404) throw new Error("Member not found");
        throw new Error("Failed to update member");
      }
      return api.family.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.family.list.path] });
    },
  });
}

// Delete member
export function useDeleteFamilyMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.family.delete.path, { id });
      const res = await fetch(url, { method: api.family.delete.method });
      if (res.status === 404) throw new Error("Member not found");
      if (!res.ok) throw new Error("Failed to delete member");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.family.list.path] });
    },
  });
}
