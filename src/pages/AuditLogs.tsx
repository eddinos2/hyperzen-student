import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Search, AlertTriangle, Shield, LogIn, User, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { AuditDetailDrawer } from '@/components/audit/AuditDetailDrawer';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';

export default function AuditLogs() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [hideSystemLogs, setHideSystemLogs] = useState(true); // Masquer les logs système par défaut
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { isAdmin } = useUserRole();

  // Tables système à filtrer
  const systemTables = ['audit_log', 'login_attempts', 'password_history', 'user_password_status'];

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', debouncedSearch, actionFilter, tableFilter, hideSystemLogs],
    queryFn: async () => {
      let query = supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (debouncedSearch) {
        query = query.or(`table_name.ilike.%${debouncedSearch}%,action.ilike.%${debouncedSearch}%`);
      }

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      if (tableFilter !== 'all') {
        query = query.eq('table_name', tableFilter);
      }

      if (hideSystemLogs) {
        // Masquer les événements système: garder uniquement les actions avec un utilisateur
        query = query.not('user_id', 'is', null);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Récupérer les profils (gestionnaires/admins) ET les élèves
      const userIds = [...new Set(data?.map(log => log.user_id).filter(Boolean) || [])];
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, nom, prenom, email, role')
          .in('user_id', userIds);

        const { data: eleves } = await supabase
          .from('eleves')
          .select('user_id, nom, prenom, email, immatriculation')
          .in('user_id', userIds)
          .not('user_id', 'is', null);

        // Créer des maps
        const profilesMap = new Map(profiles?.map(p => [p.user_id, { ...p, type: 'staff' }]) || []);
        const elevesMap = new Map(eleves?.map(e => [e.user_id, { ...e, type: 'eleve' }]) || []);

        return data?.map(log => ({
          ...log,
          user: log.user_id ? (profilesMap.get(log.user_id) || elevesMap.get(log.user_id)) : null
        }));
      }

      return data?.map(log => ({ ...log, user: null }));
    }
  });

  // Connexions récentes des élèves
  const { data: connexionsEleves } = useQuery({
    queryKey: ['connexions-eleves', isAdmin],
    enabled: !!isAdmin,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('login_attempts')
          .select('*')
          .eq('success', true)
          .order('attempted_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        // Récupérer les infos élèves
        const emails = [...new Set(data?.map(l => l.email) || [])];
        if (emails.length === 0) return [] as any[];

        const { data: eleves } = await supabase
          .from('eleves')
          .select('email, nom, prenom, immatriculation')
          .in('email', emails);

        const elevesMap = new Map(eleves?.map(e => [e.email, e]) || []);

        return data
          ?.map(conn => ({
            ...conn,
            eleve: elevesMap.get(conn.email)
          }))
          .filter(conn => conn.eleve);
      } catch {
        return [] as any[];
      }
    }
  });

  const { data: stats } = useQuery({
    queryKey: ['audit-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('action, table_name')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const actionCounts = data.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        total24h: data.length,
        inserts: actionCounts['INSERT'] || 0,
        updates: actionCounts['UPDATE'] || 0,
        deletes: actionCounts['DELETE'] || 0
      };
    }
  });

  const handleExport = async () => {
    try {
      toast({
        title: 'Export en cours...',
        description: 'Récupération de tous les logs d\'audit',
      });

      // Récupérer TOUS les logs sans limite en paginant
      let allLogs: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, from + pageSize - 1);

        if (debouncedSearch) {
          query = query.or(`table_name.ilike.%${debouncedSearch}%,action.ilike.%${debouncedSearch}%`);
        }

        if (actionFilter !== 'all') {
          query = query.eq('action', actionFilter);
        }

        if (tableFilter !== 'all') {
          query = query.eq('table_name', tableFilter);
        }

        if (hideSystemLogs) {
          query = query.not('user_id', 'is', null);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (data && data.length > 0) {
          allLogs = [...allLogs, ...data];
          from += data.length; // avancer selon le nombre réellement reçu
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      // Enrichir avec les infos utilisateurs
      const userIds = [...new Set(allLogs.map(log => log.user_id).filter(Boolean))];
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, nom, prenom, email, role')
          .in('user_id', userIds);

        const { data: eleves } = await supabase
          .from('eleves')
          .select('user_id, nom, prenom, email, immatriculation')
          .in('user_id', userIds)
          .not('user_id', 'is', null);

        const profilesMap = new Map(profiles?.map(p => [p.user_id, { ...p, type: 'staff' }]) || []);
        const elevesMap = new Map(eleves?.map(e => [e.user_id, { ...e, type: 'eleve' }]) || []);

        allLogs = allLogs.map(log => ({
          ...log,
          user: log.user_id ? (profilesMap.get(log.user_id) || elevesMap.get(log.user_id)) : null
        }));
      }

    const csv = [
      ['Date', 'Email Utilisateur', 'Rôle/Type', 'Action', 'Table', 'ID Enregistrement', 'IP', 'User Agent'],
      ...allLogs.map(log => [
        format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: fr }),
        (log.old_data as any)?.email || (log.new_data as any)?.email || log.user?.email || 'Système',
        log.user ? ((log.user as any).type === 'eleve' ? 'Élève' : (log.user as any).role || 'Staff') : 'Système',
        log.action,
        log.table_name,
        log.record_id || '',
        log.ip_address || '',
        log.user_agent || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();

      toast({
        title: 'Export réussi',
        description: `${allLogs.length} log(s) exporté(s)`,
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
      INSERT: { variant: 'default', label: 'Création' },
      UPDATE: { variant: 'secondary', label: 'Modification' },
      DELETE: { variant: 'destructive', label: 'Suppression' }
    };

    const config = variants[action] || { variant: 'default', label: action };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const isCriticalAction = (log: any) => {
    return (
      log.action === 'DELETE' ||
      (log.table_name === 'user_roles' && log.action !== 'SELECT') ||
      (log.table_name === 'profiles' && log.action === 'UPDATE')
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Journal d'Audit</h1>
            <p className="text-muted-foreground mt-1">
              Traçabilité complète des actions et connexions
            </p>
          </div>
          <Button onClick={handleExport} variant="outline" disabled={!logs || logs.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </Button>
        </div>

        <Tabs defaultValue="actions" className="space-y-6">
          <TabsList>
            <TabsTrigger value="actions">
              <Shield className="h-4 w-4 mr-2" />
              Actions
            </TabsTrigger>
            <TabsTrigger value="connexions">
              <LogIn className="h-4 w-4 mr-2" />
              Connexions Élèves
            </TabsTrigger>
          </TabsList>

          <TabsContent value="actions" className="space-y-6">

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Actions (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total24h || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Créations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats?.inserts || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Modifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{stats?.updates || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-destructive">Suppressions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats?.deletes || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtres */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Filtrer les logs
            </CardTitle>
            <CardDescription>
              Rechercher et filtrer les actions dans le journal d'audit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="hide-system"
                  checked={hideSystemLogs}
                  onCheckedChange={setHideSystemLogs}
                />
                <Label htmlFor="hide-system" className="cursor-pointer">
                  Masquer les logs système (audit_log, login_attempts, etc.)
                </Label>
              </div>
              
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les actions</SelectItem>
                    <SelectItem value="INSERT">Création</SelectItem>
                    <SelectItem value="UPDATE">Modification</SelectItem>
                    <SelectItem value="DELETE">Suppression</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={tableFilter} onValueChange={setTableFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Table" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les tables</SelectItem>
                    <SelectItem value="reglements">Règlements</SelectItem>
                    <SelectItem value="eleves">Élèves</SelectItem>
                    <SelectItem value="dossiers_scolarite">Dossiers</SelectItem>
                    <SelectItem value="user_roles">Rôles</SelectItem>
                    <SelectItem value="profiles">Profils</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table des logs */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <TableSkeleton rows={10} columns={5} />
            ) : logs && logs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Heure</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Détails</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className={isCriticalAction(log) ? 'bg-destructive/5' : ''}>
                      <TableCell className="font-mono text-xs">
                        <div className="flex items-center gap-2">
                          {isCriticalAction(log) && (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          )}
                          {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: fr })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {log.user ? (
                            <>
                              <div className="text-sm font-medium flex items-center gap-2">
                                {(log.user as any).type === 'eleve' && <User className="h-3 w-3 text-blue-500" />}
                                {log.user.prenom} {log.user.nom}
                                {(log.user as any).immatriculation && (
                                  <code className="text-xs bg-blue-100 text-blue-700 px-1 rounded">
                                    {(log.user as any).immatriculation}
                                  </code>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">{log.user.email}</div>
                            </>
                          ) : (log.old_data as any)?.email || (log.new_data as any)?.email ? (
                            <div className="text-sm">
                              {(log.old_data as any)?.email || (log.new_data as any)?.email}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">Système</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.user && (
                          <Badge variant={(log.user as any).type === 'eleve' ? 'secondary' : 'default'}>
                            {(log.user as any).type === 'eleve' ? 'Élève' : (log.user as any).role || 'Staff'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{log.table_name}</code>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="space-y-1 text-xs">
                          {log.ip_address && (
                            <div className="flex items-center gap-1">
                              <span className="font-semibold">IP:</span>
                              <code className="bg-muted px-1 rounded">{String(log.ip_address)}</code>
                            </div>
                          )}
                          {log.user_agent && (
                            <div className="truncate text-muted-foreground" title={log.user_agent}>
                              {log.user_agent.slice(0, 50)}...
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedLog(log);
                            setDrawerOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Voir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Aucun log trouvé
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="connexions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LogIn className="h-5 w-5" />
                  Connexions Élèves Récentes
                </CardTitle>
                <CardDescription>
                  Historique des 50 dernières connexions élèves
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!isAdmin ? (
                  <Alert>
                    <AlertDescription>
                      Accès restreint: seules les personnes avec le rôle administrateur peuvent consulter l'historique des connexions.
                    </AlertDescription>
                  </Alert>
                ) : connexionsEleves && connexionsEleves.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Heure</TableHead>
                        <TableHead>Élève</TableHead>
                        <TableHead>Immatriculation</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead>User Agent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {connexionsEleves.map((conn) => (
                        <TableRow key={conn.id}>
                          <TableCell className="font-mono text-xs">
                            {format(new Date(conn.attempted_at), 'dd/MM/yyyy HH:mm:ss', { locale: fr })}
                          </TableCell>
                          <TableCell className="font-medium">
                            {conn.eleve.prenom} {conn.eleve.nom}
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              {conn.eleve.immatriculation}
                            </code>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {conn.eleve.email}
                          </TableCell>
                          <TableCell>
                            {conn.ip_address && (
                              <code className="text-xs bg-muted px-1 rounded">{String(conn.ip_address)}</code>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="truncate text-xs text-muted-foreground" title={conn.user_agent || ''}>
                              {conn.user_agent?.slice(0, 50)}...
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Aucune connexion trouvée pour le moment
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AuditDetailDrawer 
          log={selectedLog}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
        />
      </div>
    </AppLayout>
  );
}
