import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit, Copy, Eye } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface TypeformConfig {
  id: string;
  form_type: string;
  form_name: string;
  description?: string;
  actif: boolean;
  field_mappings: Record<string, any>;
  tarif_scolarite: number;
  statut_dossier: string;
  annee_scolaire: string;
}

export const TypeformConfigManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<TypeformConfig | null>(null);
  const [viewMappings, setViewMappings] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    form_type: '',
    form_name: '',
    description: '',
    actif: true,
    field_mappings: '{}',
    tarif_scolarite: 0,
    statut_dossier: 'en_attente',
    annee_scolaire: '2025_2026',
  });

  const { data: configs } = useQuery({
    queryKey: ['typeform-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('typeform_configs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as TypeformConfig[];
    },
  });

  const createConfig = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('typeform_configs').insert([{
        ...data,
        field_mappings: JSON.parse(data.field_mappings),
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['typeform-configs'] });
      toast({ title: 'Configuration créée' });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const updateConfig = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase.from('typeform_configs').update({
        ...data,
        field_mappings: JSON.parse(data.field_mappings),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['typeform-configs'] });
      toast({ title: 'Configuration modifiée' });
      setDialogOpen(false);
      setEditingConfig(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const deleteConfig = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('typeform_configs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['typeform-configs'] });
      toast({ title: 'Configuration supprimée', variant: 'destructive' });
    },
  });

  const openEditDialog = (config: TypeformConfig) => {
    setEditingConfig(config);
    setFormData({
      form_type: config.form_type,
      form_name: config.form_name,
      description: config.description || '',
      actif: config.actif,
      field_mappings: JSON.stringify(config.field_mappings, null, 2),
      tarif_scolarite: config.tarif_scolarite,
      statut_dossier: config.statut_dossier,
      annee_scolaire: config.annee_scolaire,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      form_type: '',
      form_name: '',
      description: '',
      actif: true,
      field_mappings: '{}',
      tarif_scolarite: 0,
      statut_dossier: 'en_attente',
      annee_scolaire: '2025_2026',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      JSON.parse(formData.field_mappings); // Validate JSON
      if (editingConfig) {
        updateConfig.mutate({ id: editingConfig.id, data: formData });
      } else {
        createConfig.mutate(formData);
      }
    } catch (error) {
      toast({ title: 'Erreur JSON', description: 'Le mapping JSON est invalide', variant: 'destructive' });
    }
  };

  const copyWebhookUrl = (formType: string) => {
    // Utiliser l'URL Supabase depuis les variables d'environnement
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      toast({ 
        title: 'Erreur', 
        description: 'VITE_SUPABASE_URL non configurée dans les variables d\'environnement', 
        variant: 'destructive' 
      });
      return;
    }
    const url = `${supabaseUrl}/functions/v1/sync-typeform?type=${formType}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'URL copiée', description: 'URL du webhook copiée dans le presse-papier' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black">Configurations Typeform</h2>
          <p className="text-muted-foreground">Gérez les mappings de champs pour vos formulaires Typeform</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            resetForm();
            setEditingConfig(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button className="brutal-button">
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle configuration
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">
                {editingConfig ? 'Modifier la configuration' : 'Créer une configuration'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type de formulaire (ID unique) *</Label>
                  <Input
                    value={formData.form_type}
                    onChange={(e) => setFormData({ ...formData, form_type: e.target.value })}
                    placeholder="inscription_standard"
                    required
                    disabled={!!editingConfig}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Identifiant unique (ex: inscription_standard, pre_inscription)
                  </p>
                </div>
                <div>
                  <Label>Nom du formulaire *</Label>
                  <Input
                    value={formData.form_name}
                    onChange={(e) => setFormData({ ...formData, form_name: e.target.value })}
                    placeholder="Inscription Standard"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description du formulaire..."
                  />
                </div>
                <div>
                  <Label>Tarif de scolarité (€) *</Label>
                  <Input
                    type="number"
                    value={formData.tarif_scolarite}
                    onChange={(e) => setFormData({ ...formData, tarif_scolarite: parseFloat(e.target.value) })}
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label>Statut du dossier</Label>
                  <Input
                    value={formData.statut_dossier}
                    onChange={(e) => setFormData({ ...formData, statut_dossier: e.target.value })}
                    placeholder="en_attente"
                  />
                </div>
                <div>
                  <Label>Année scolaire</Label>
                  <Input
                    value={formData.annee_scolaire}
                    onChange={(e) => setFormData({ ...formData, annee_scolaire: e.target.value })}
                    placeholder="2025_2026"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.actif}
                    onCheckedChange={(checked) => setFormData({ ...formData, actif: checked })}
                  />
                  <Label>Configuration active</Label>
                </div>
                <div className="col-span-2">
                  <Label>Mapping des champs (JSON) *</Label>
                  <Textarea
                    value={formData.field_mappings}
                    onChange={(e) => setFormData({ ...formData, field_mappings: e.target.value })}
                    placeholder='{"email": {"keywords": ["email", "mail"], "ref": "abc-123"}}'
                    rows={10}
                    className="font-mono text-sm"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Format: chaque clé est un champ (email, nom, prenom...) avec keywords et ref optionnel
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="brutal-button">
                  {editingConfig ? 'Modifier' : 'Créer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="brutal-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left p-3 font-black">Nom</th>
                <th className="text-left p-3 font-black">Type</th>
                <th className="text-left p-3 font-black">Tarif</th>
                <th className="text-left p-3 font-black">Statut</th>
                <th className="text-left p-3 font-black">Webhook URL</th>
                <th className="text-left p-3 font-black">Actions</th>
              </tr>
            </thead>
            <tbody>
              {configs?.map((config) => (
                <tr key={config.id} className="border-b border-border hover:bg-muted/50">
                  <td className="p-3">
                    <div>
                      <div className="font-bold">{config.form_name}</div>
                      {config.description && (
                        <div className="text-sm text-muted-foreground">{config.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="p-3 font-mono text-sm">{config.form_type}</td>
                  <td className="p-3 font-bold">{config.tarif_scolarite.toLocaleString('fr-FR')} €</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${config.actif ? 'bg-green-200' : 'bg-gray-200'}`}>
                      {config.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="p-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyWebhookUrl(config.form_type)}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copier URL
                    </Button>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewMappings(JSON.stringify(config.field_mappings, null, 2))}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(config)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteConfig.mutate(config.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!configs || configs.length === 0) && (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-muted-foreground">
                    Aucune configuration Typeform
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog pour voir les mappings */}
      <Dialog open={!!viewMappings} onOpenChange={() => setViewMappings(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Mapping des champs</DialogTitle>
          </DialogHeader>
          <pre className="bg-muted p-4 rounded overflow-auto max-h-96 text-sm">
            {viewMappings}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
};
