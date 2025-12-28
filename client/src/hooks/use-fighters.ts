import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type FighterInput } from "@shared/routes";

// GET /api/fighters
export function useFighters() {
  return useQuery({
    queryKey: [api.fighters.list.path],
    queryFn: async () => {
      const res = await fetch(api.fighters.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch fighters");
      return api.fighters.list.responses[200].parse(await res.json());
    },
  });
}

// POST /api/fighters
export function useCreateFighter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: FighterInput) => {
      const res = await fetch(api.fighters.create.path, {
        method: api.fighters.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.fighters.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create fighter");
      }
      return api.fighters.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.fighters.list.path] }),
  });
}

// DELETE /api/fighters/:id
export function useDeleteFighter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.fighters.delete.path, { id });
      const res = await fetch(url, {
        method: api.fighters.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete fighter");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.fighters.list.path] }),
  });
}
