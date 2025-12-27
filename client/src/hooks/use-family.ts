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

// Swap members (reorder siblings)
export function useSwapFamilyMembers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id1, id2 }: { id1: number; id2: number }) => {
      const res = await fetch(api.family.swap.path, {
        method: api.family.swap.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id1, id2 }),
      });
      if (!res.ok) throw new Error("Failed to swap members");
      return api.family.swap.responses[200].parse(await res.json());
    },
    onMutate: async ({ id1, id2 }) => {
      await queryClient.cancelQueries({ queryKey: [api.family.list.path] });
      const previous = queryClient.getQueryData<FamilyMemberResponse[]>([
        api.family.list.path,
      ]);
      if (previous) {
        const next = previous.map((member) => ({ ...member }));
        const index1 = next.findIndex((m) => m.id === id1);
        const index2 = next.findIndex((m) => m.id === id2);
        if (index1 !== -1 && index2 !== -1) {
          const temp = next[index1].position;
          next[index1].position = next[index2].position;
          next[index2].position = temp;
        }
        queryClient.setQueryData([api.family.list.path], next);
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData([api.family.list.path], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [api.family.list.path] });
    },
  });
}
