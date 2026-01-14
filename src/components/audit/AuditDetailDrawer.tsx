import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { User, Calendar, Globe, Monitor, ArrowRight, AlertTriangle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface AuditDetailDrawerProps {
  log: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuditDetailDrawer({ log, open, onOpenChange }: AuditDetailDrawerProps) {
  if (!log) return null;

  const getDiff = () => {
    if (log.action === 'INSERT') {
      const data = (log.new_data as any)?.data || {};
      return Object.entries(data)
        .filter(([key]) => !['id', 'created_at', 'updated_at'].includes(key))
        .map(([key, value]) => ({
          field: key,
          type: 'added',
          newValue: value
        }));
    }

    if (log.action === 'DELETE') {
      const data = (log.old_data as any)?.data || {};
      return Object.entries(data)
        .filter(([key]) => !['id', 'created_at', 'updated_at'].includes(key))
        .map(([key, value]) => ({
          field: key,
          type: 'removed',
          oldValue: value
        }));
    }

    if (log.action === 'UPDATE') {
      const oldData = (log.old_data as any)?.data || {};
      const newData = (log.new_data as any)?.data || {};
      const changes: any[] = [];

      Object.keys({ ...oldData, ...newData }).forEach(key => {
        if (['id', 'created_at', 'updated_at'].includes(key)) return;
        
        const oldVal = oldData[key];
        const newVal = newData[key];

        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changes.push({
            field: key,
            type: 'modified',
            oldValue: oldVal,
            newValue: newVal
          });
        }
      });

      return changes;
    }

    return [];
  };

  const diff = getDiff();

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? '✓' : '✗';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const getActionColor = () => {
    switch (log.action) {
      case 'INSERT': return 'bg-primary/10 text-primary border-primary';
      case 'UPDATE': return 'bg-blue-500/10 text-blue-700 border-blue-500';
      case 'DELETE': return 'bg-destructive/10 text-destructive border-destructive';
      default: return 'bg-muted';
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <div className="overflow-y-auto p-6 pb-8">
          <DrawerHeader className="px-0">
            <div className="flex items-center justify-between mb-2">
              <DrawerTitle className="text-2xl">Détails de l'action</DrawerTitle>
              <Badge className={getActionColor()}>
                {log.action === 'INSERT' && 'Création'}
                {log.action === 'UPDATE' && 'Modification'}
                {log.action === 'DELETE' && 'Suppression'}
                {log.action === 'EVENT' && 'Événement'}
              </Badge>
            </div>
            <DrawerDescription>
              <code className="text-sm bg-muted px-2 py-1 rounded">{log.table_name}</code>
            </DrawerDescription>
          </DrawerHeader>

          {/* Informations contextuelles */}
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">Utilisateur:</span>
                </div>
                {log.user ? (
                  <div className="ml-6 space-y-1">
                    <div className="font-medium">{log.user.prenom} {log.user.nom}</div>
                    <div className="text-sm text-muted-foreground">{log.user.email}</div>
                    {(log.user as any).immatriculation && (
                      <code className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {(log.user as any).immatriculation}
                      </code>
                    )}
                    <Badge variant={(log.user as any).type === 'eleve' ? 'secondary' : 'default'}>
                      {(log.user as any).type === 'eleve' ? 'Élève' : (log.user as any).role || 'Staff'}
                    </Badge>
                  </div>
                ) : (
                  <div className="ml-6 text-sm text-muted-foreground">Système</div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">Date et heure:</span>
                </div>
                <div className="ml-6 font-mono text-sm">
                  {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: fr })}
                </div>
              </div>
            </div>

            {log.ip_address && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-sm">Adresse IP:</span>
                <code className="bg-muted px-2 py-1 rounded text-sm">{String(log.ip_address)}</code>
              </div>
            )}

            {log.user_agent && (
              <div className="flex items-start gap-2">
                <Monitor className="h-4 w-4 text-muted-foreground mt-1" />
                <div className="flex-1">
                  <span className="font-semibold text-sm">Navigateur:</span>
                  <div className="text-sm text-muted-foreground mt-1 break-all">{log.user_agent}</div>
                </div>
              </div>
            )}
          </div>

          <Separator className="my-6" />

          {/* Différences */}
          <div>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              {log.action === 'DELETE' && <AlertTriangle className="h-5 w-5 text-destructive" />}
              Modifications
              {diff.length > 0 && (
                <Badge variant="outline" className="ml-2">{diff.length} champ{diff.length > 1 ? 's' : ''}</Badge>
              )}
            </h3>

            {diff.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucune modification détectée
              </div>
            ) : (
              <div className="space-y-3">
                {diff.map((change, idx) => (
                  <div key={idx} className="border rounded-lg p-4 bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <code className="font-semibold text-sm">{change.field}</code>
                      {change.type === 'added' && (
                        <Badge className="bg-primary/10 text-primary border-primary">Ajouté</Badge>
                      )}
                      {change.type === 'removed' && (
                        <Badge className="bg-destructive/10 text-destructive border-destructive">Supprimé</Badge>
                      )}
                      {change.type === 'modified' && (
                        <Badge className="bg-blue-500/10 text-blue-700 border-blue-500">Modifié</Badge>
                      )}
                    </div>

                    {change.type === 'modified' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        <div>
                          <div className="text-xs font-semibold text-muted-foreground mb-1">Ancienne valeur</div>
                          <div className="bg-red-50 border border-red-200 rounded p-2">
                            <pre className="text-xs text-red-900 whitespace-pre-wrap break-all">
                              {formatValue(change.oldValue)}
                            </pre>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                            <ArrowRight className="h-3 w-3" />
                            Nouvelle valeur
                          </div>
                          <div className="bg-green-50 border border-green-200 rounded p-2">
                            <pre className="text-xs text-green-900 whitespace-pre-wrap break-all">
                              {formatValue(change.newValue)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}

                    {change.type === 'added' && (
                      <div className="mt-3">
                        <div className="bg-green-50 border border-green-200 rounded p-2">
                          <pre className="text-xs text-green-900 whitespace-pre-wrap break-all">
                            {formatValue(change.newValue)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {change.type === 'removed' && (
                      <div className="mt-3">
                        <div className="bg-red-50 border border-red-200 rounded p-2">
                          <pre className="text-xs text-red-900 whitespace-pre-wrap break-all">
                            {formatValue(change.oldValue)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {log.record_id && (
            <div className="mt-6 pt-4 border-t">
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold">ID de l'enregistrement:</span>{' '}
                <code className="bg-muted px-1 rounded">{log.record_id}</code>
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
