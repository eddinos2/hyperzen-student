import { ReactNode } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import type { AppRole } from "@/types";

interface ProtectedActionProps {
  children: ReactNode;
  allowedRoles?: AppRole[];
  fallback?: ReactNode;
}

export const ProtectedAction = ({ 
  children, 
  allowedRoles = ['admin', 'finance', 'pedagogie', 'gestionnaire'],
  fallback = null 
}: ProtectedActionProps) => {
  const { roles, isLoading } = useUserRole();

  if (isLoading) return null;

  const hasPermission = roles.some(role => allowedRoles.includes(role));

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
