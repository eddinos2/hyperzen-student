import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { Home, Users, FileText, Upload, Settings, AlertTriangle, Calendar, LogOut, AlertCircle, UserCog, GraduationCap, MessageSquare, FileCheck, BarChart3, Shield, Send, ChevronDown, DollarSign, History, Zap, ArrowRightLeft, UserCheck, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { applyTheme, type ThemeName } from '@/lib/themes';
import logo from '@/assets/logo-aurlom-bts.png';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

interface AppLayoutProps {
  children: ReactNode;
}

const AppSidebar = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { open } = useSidebar();
  const [isAdmin, setIsAdmin] = useState(false);
  const [openGroups, setOpenGroups] = useState({
    gestion: true,
    finance: false,
    pilotage: false,
    config: false,
  });

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();
      
      setIsAdmin(!!data);
    };
    checkAdmin();
  }, []);

  const toggleGroup = (group: string) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group as keyof typeof prev] }));
  };

  const gestionItems = [
    { to: '/eleves', icon: Users, label: 'Élèves' },
    { to: '/comptes-eleves', icon: UserCheck, label: 'Comptes Élèves' },
    { to: '/tickets', icon: MessageSquare, label: 'Tickets' },
    { to: '/justificatifs', icon: FileCheck, label: 'Justificatifs' },
  ];

  const financeItems = [
    { to: '/reglements', icon: DollarSign, label: 'Règlements' },
    { to: '/echeances', icon: Calendar, label: 'Échéances' },
    { to: '/retards', icon: AlertCircle, label: 'Retards' },
    { to: '/suivi-documents', icon: FileCheck, label: 'Suivi Documents' },
  ];

  const pilotageItems = [
    { to: '/rapports', icon: BarChart3, label: 'Rapports' },
    { to: '/anomalies', icon: AlertTriangle, label: 'Alertes & Surveillance' },
    { to: '/architecture-live', icon: Activity, label: 'Architecture Live' },
    ...(isAdmin ? [{ to: '/audit-logs', icon: History, label: 'Audit' }] : []),
  ];

  const configItems = [
    { to: '/parametres', icon: Settings, label: 'Paramètres' },
    { to: '/parametres-securite', icon: Shield, label: 'Sécurité' },
    { to: '/gestion-utilisateurs', icon: UserCog, label: 'Utilisateurs' },
    { to: '/import', icon: Upload, label: 'Import CSV' },
    { to: '/migration-annee', icon: ArrowRightLeft, label: 'Migration' },
    { to: '/automatisation', icon: Zap, label: 'Automatisation' },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: 'Déconnexion',
      description: 'À bientôt sur HyperZen',
    });
    navigate('/login');
  };

  return (
    <Sidebar collapsible="icon" className="border-r-4 border-black">
      <SidebarContent className="bg-white">
        <SidebarGroup>
          <div className="flex items-center gap-2 px-2 py-4">
            <img src={logo} alt="Aurlom BTS+" className="h-10 w-auto object-contain" />
            {open && (
              <p className="text-sm font-bold text-muted-foreground">Hyperzen</p>
            )}
          </div>
          <Separator className="bg-black h-0.5" />
        </SidebarGroup>

        {/* Accueil - toujours visible */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/"
                    end
                    className={({ isActive }) =>
                      `rounded-xl transition-all text-black ${isActive ? 'bg-cyan-400 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'hover:bg-gray-100'}`
                    }
                  >
                    <Home className="w-4 h-4" />
                    <span className="font-bold">Accueil</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Groupe: Gestion Élèves */}
        <SidebarGroup>
          <button
            onClick={() => toggleGroup('gestion')}
            className="flex items-center justify-between w-full px-2 py-1 text-xs font-black uppercase text-black hover:text-cyan-600 transition-colors"
          >
            <span>Gestion Élèves</span>
            {open && <ChevronDown className={`w-4 h-4 transition-transform ${openGroups.gestion ? '' : '-rotate-90'}`} />}
          </button>
          {openGroups.gestion && (
            <SidebarGroupContent>
              <SidebarMenu>
                {gestionItems.map(({ to, icon: Icon, label }) => (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={to}
                        className={({ isActive }) =>
                          `rounded-xl transition-all text-black ${isActive ? 'bg-cyan-400 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'hover:bg-gray-100'}`
                        }
                      >
                        <Icon className="w-4 h-4" />
                        <span className="font-bold">{label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>

        {/* Groupe: Finance */}
        <SidebarGroup>
          <button
            onClick={() => toggleGroup('finance')}
            className="flex items-center justify-between w-full px-2 py-1 text-xs font-black uppercase text-black hover:text-green-600 transition-colors"
          >
            <span>Finance</span>
            {open && <ChevronDown className={`w-4 h-4 transition-transform ${openGroups.finance ? '' : '-rotate-90'}`} />}
          </button>
          {openGroups.finance && (
            <SidebarGroupContent>
              <SidebarMenu>
                {financeItems.map(({ to, icon: Icon, label }) => (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={to}
                        className={({ isActive }) =>
                          `rounded-xl transition-all text-black ${isActive ? 'bg-green-400 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'hover:bg-green-50'}`
                        }
                      >
                        <Icon className="w-4 h-4" />
                        <span className="font-bold">{label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>

        {/* Groupe: Pilotage */}
        <SidebarGroup>
          <button
            onClick={() => toggleGroup('pilotage')}
            className="flex items-center justify-between w-full px-2 py-1 text-xs font-black uppercase text-black hover:text-purple-600 transition-colors"
          >
            <span>Pilotage</span>
            {open && <ChevronDown className={`w-4 h-4 transition-transform ${openGroups.pilotage ? '' : '-rotate-90'}`} />}
          </button>
          {openGroups.pilotage && (
            <SidebarGroupContent>
              <SidebarMenu>
                {pilotageItems.map(({ to, icon: Icon, label }) => (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={to}
                        className={({ isActive }) =>
                          `rounded-xl transition-all text-black ${isActive ? 'bg-purple-400 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'hover:bg-purple-50'}`
                        }
                      >
                        <Icon className="w-4 h-4" />
                        <span className="font-bold">{label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>

        {/* Groupe: Configuration (Admin only) */}
        {isAdmin && (
          <SidebarGroup>
            <button
              onClick={() => toggleGroup('config')}
              className="flex items-center justify-between w-full px-2 py-1 text-xs font-black uppercase text-red-600 hover:text-red-700 transition-colors"
            >
              <span>Configuration</span>
              {open && <ChevronDown className={`w-4 h-4 transition-transform ${openGroups.config ? '' : '-rotate-90'}`} />}
            </button>
            {openGroups.config && (
              <SidebarGroupContent>
                <SidebarMenu>
                  {configItems.map(({ to, icon: Icon, label }) => (
                    <SidebarMenuItem key={to}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={to}
                          className={({ isActive }) =>
                            `rounded-xl transition-all text-black ${isActive ? 'bg-red-400 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'hover:bg-red-50'}`
                          }
                        >
                          <Icon className="w-4 h-4" />
                          <span className="font-bold">{label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            )}
          </SidebarGroup>
        )}

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={handleLogout} 
                  className="text-red-600 hover:bg-red-50 font-bold rounded-xl"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Déconnexion</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export const AppLayout = ({ children }: AppLayoutProps) => {
  // Appliquer le thème au chargement
  const { data: parametres } = useQuery({
    queryKey: ['parametres-globaux'],
    queryFn: async () => {
      const { data } = await supabase
        .from('parametres_globaux')
        .select('*');
      
      const params: Record<string, string> = {};
      data?.forEach(p => {
        params[p.cle] = p.valeur;
      });
      return params;
    },
  });

  useEffect(() => {
    if (parametres?.theme) {
      applyTheme(parametres.theme as ThemeName);
    }
  }, [parametres?.theme]);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 p-3 sm:p-6 overflow-x-hidden">
          <div className="mb-4 sticky top-0 z-10 pb-2">
            <SidebarTrigger className="brutal-button bg-white hover:bg-gray-100" />
          </div>
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
};
