import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/types";

export const useUserRole = () => {
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["user-roles", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (error) throw error;
      return data.map(r => r.role as AppRole);
    },
    enabled: !!session?.user?.id,
  });

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = hasRole('admin');
  const isLecteur = hasRole('lecteur');
  const canEdit = !isLecteur;

  return {
    roles,
    hasRole,
    isAdmin,
    isLecteur,
    canEdit,
    isLoading,
  };
};
