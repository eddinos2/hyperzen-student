import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Wrench, AlertTriangle } from 'lucide-react';

export function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Vérifier si l'utilisateur est admin
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      console.log('🔒 MaintenanceGuard - Vérification utilisateur:', user?.id);
      
      if (!user) {
        console.log('🔒 MaintenanceGuard - Pas d\'utilisateur connecté');
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      const isUserAdmin = !!roles;
      console.log('🔒 MaintenanceGuard - Est admin?', isUserAdmin, 'Erreur:', error);
      
      setIsAdmin(isUserAdmin);
      setLoading(false);
    };

    checkAdmin();
  }, []);

  // Récupérer le statut du mode maintenance
  const { data: maintenanceMode } = useQuery({
    queryKey: ['mode-maintenance'],
    queryFn: async () => {
      const { data } = await supabase
        .from('parametres_globaux')
        .select('valeur')
        .eq('cle', 'mode_maintenance')
        .single();
      
      const isMaintenanceActive = data?.valeur === 'true';
      console.log('🔒 MaintenanceGuard - Mode maintenance actif?', isMaintenanceActive);
      
      return isMaintenanceActive;
    },
    refetchInterval: 10000, // Rafraîchir toutes les 10 secondes
    staleTime: 0, // Toujours considérer comme périmé
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">
          <div className="text-6xl mb-4">⚡</div>
        </div>
      </div>
    );
  }

  // Si mode maintenance activé et pas admin
  console.log('🔒 MaintenanceGuard - État final:', { maintenanceMode, isAdmin, shouldBlock: maintenanceMode && !isAdmin });
  
  if (maintenanceMode && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="brutal-card p-8 sm:p-12 max-w-2xl text-center bg-white">
          <div className="mb-6 animate-bounce">
            <Wrench className="w-24 h-24 mx-auto text-warning" />
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-black mb-4">
            MAINTENANCE EN COURS
          </h1>
          
          <p className="text-xl sm:text-2xl font-bold text-muted-foreground mb-6">
            Notre site est actuellement en maintenance
          </p>
          
          <div className="brutal-card p-6 bg-warning/15 mb-6">
            <div className="flex items-center justify-center gap-3 mb-3">
              <AlertTriangle className="w-6 h-6 text-warning" />
              <p className="font-black text-lg">INDISPONIBILITÉ TEMPORAIRE</p>
            </div>
            <p className="font-bold text-sm">
              Nous effectuons des améliorations pour vous offrir une meilleure expérience.
              Le site sera de nouveau accessible très prochainement.
            </p>
          </div>
          
          <p className="text-lg font-bold text-muted-foreground">
            Merci de votre patience ! 🚀
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
