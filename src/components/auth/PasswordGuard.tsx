import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ForcePasswordChange } from './ForcePasswordChange';

interface PasswordGuardProps {
  children: React.ReactNode;
}

export const PasswordGuard = ({ children }: PasswordGuardProps) => {
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkPasswordStatus();
  }, []);

  const checkPasswordStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);

      // Vérifier le rôle de l'utilisateur
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      // Ne vérifier que pour les admins et gestionnaires (PAS les élèves)
      const isEleveOnly = roles?.every(r => r.role === 'eleve') ?? false;
      
      if (isEleveOnly) {
        setLoading(false);
        return;
      }

      if (roles && roles.length > 0) {
        setUserRole(roles[0].role);
      }

      // Vérifier le statut du mot de passe
      const { data: passwordStatus, error } = await supabase
        .from('user_password_status')
        .select('must_change_password')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // Ignorer "no rows returned"
        console.error('Error checking password status:', error);
      }

      // Si must_change_password est true, afficher le modal
      if (passwordStatus?.must_change_password) {
        setMustChangePassword(true);
      }
    } catch (error) {
      console.error('Error in checkPasswordStatus:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChanged = () => {
    setMustChangePassword(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg font-medium text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (mustChangePassword && userId) {
    return (
      <ForcePasswordChange 
        userId={userId} 
        onPasswordChanged={handlePasswordChanged}
      />
    );
  }

  return <>{children}</>;
};
