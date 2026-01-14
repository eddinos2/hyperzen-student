import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface PlanPaiement {
  id: string;
  nom: string;
  description?: string;
  filiere_id?: string;
  campus_id?: string;
  annee_scolaire: string;
  tarif_base: number;
  moyen_paiement: string;
  nombre_echeances: number;
  frequence: string;
  jour_echeance: number;
  date_premiere_echeance?: string;
  actif: boolean;
  moyens_totalite?: string[];
  moyens_solde?: string[];
}

const MOYENS_TOTALITE = ['Virement', 'CB', 'Espèces'];
const MOYENS_SOLDE = ['Chèque', 'Prélèvement'];

export const PlansPaiementManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanPaiement | null>(null);

  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    filiere_id: '',
    campus_id: '',
    annee_scolaire: '2025_2026',
    tarif_base: 0,
    moyen_paiement: 'Chèque',
    nombre_echeances: 1,
    frequence: 'mensuel',
    jour_echeance: 5,
    date_premiere_echeance: '',
    actif: true,
    moyens_totalite: ['Virement', 'CB', 'Espèces'],
    moyens_solde: ['Chèque', 'Prélèvement'],
  });

  const { data: plans } = useQuery({
    queryKey: ['plans-paiement'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans_paiement')
        .select('*, filieres(nom), campus(nom)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: filieres } = useQuery({
    queryKey: ['filieres'],
    queryFn: async () => {
      const { data } = await supabase.from('filieres').select('*').eq('actif', true);
      return data || [];
    },
  });

  const { data: campuses } = useQuery({
    queryKey: ['campus'],
    queryFn: async () => {
      const { data } = await supabase.from('campus').select('*').eq('actif', true);
      return data || [];
    },
  });

  const createPlan = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('plans_paiement').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans-paiement'] });
      toast({ title: 'Plan créé', description: 'Le plan de paiement a été créé avec succès' });
      setDialogOpen(false);
      resetForm();
    },
  });

  const updatePlan = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase.from('plans_paiement').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans-paiement'] });
      toast({ title: 'Plan modifié', description: 'Le plan de paiement a été modifié avec succès' });
      setDialogOpen(false);
      setEditingPlan(null);
      resetForm();
    },
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('plans_paiement').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans-paiement'] });
      toast({ title: 'Plan supprimé', variant: 'destructive' });
    },
  });

  const openEditDialog = (plan: any) => {
    setEditingPlan(plan);
    setFormData({
      nom: plan.nom,
      description: plan.description || '',
      filiere_id: plan.filiere_id || 'all',
      campus_id: plan.campus_id || 'all',
      annee_scolaire: plan.annee_scolaire,
      tarif_base: plan.tarif_base,
      moyen_paiement: plan.moyen_paiement,
      nombre_echeances: plan.nombre_echeances,
      frequence: plan.frequence,
      jour_echeance: plan.jour_echeance,
      date_premiere_echeance: plan.date_premiere_echeance || '',
      actif: plan.actif,
      moyens_totalite: plan.moyens_totalite || ['Virement', 'CB', 'Espèces'],
      moyens_solde: plan.moyens_solde || ['Chèque', 'Prélèvement'],
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      description: '',
      filiere_id: 'all',
      campus_id: 'all',
      annee_scolaire: '2025_2026',
      tarif_base: 0,
      moyen_paiement: 'Chèque',
      nombre_echeances: 1,
      frequence: 'mensuel',
      jour_echeance: 5,
      date_premiere_echeance: '',
      actif: true,
      moyens_totalite: ['Virement', 'CB', 'Espèces'],
      moyens_solde: ['Chèque', 'Prélèvement'],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      filiere_id: formData.filiere_id === 'all' ? '' : formData.filiere_id,
      campus_id: formData.campus_id === 'all' ? '' : formData.campus_id,
    };
    if (editingPlan) {
      updatePlan.mutate({ id: editingPlan.id, data: submitData });
    } else {
      createPlan.mutate(submitData);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black">Plans de Paiement</h2>
          <p className="text-muted-foreground">Configurez les tarifs et plans de paiement prédéfinis</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            resetForm();
            setEditingPlan(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button className="brutal-button">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">
                {editingPlan ? 'Modifier le plan' : 'Créer un plan de paiement'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Nom du plan *</Label>
                  <Input
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    placeholder="Ex: BTS Initial - Paiement mensuel"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description du plan..."
                  />
                </div>
                <div>
                  <Label>Filière</Label>
                  <Select
                    value={formData.filiere_id}
                    onValueChange={(value) => setFormData({ ...formData, filiere_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Toutes les filières" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les filières</SelectItem>
                      {filieres?.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Campus</Label>
                  <Select
                    value={formData.campus_id}
                    onValueChange={(value) => setFormData({ ...formData, campus_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les campus" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les campus</SelectItem>
                      {campuses?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tarif de base (€) *</Label>
                  <Input
                    type="number"
                    value={formData.tarif_base}
                    onChange={(e) => setFormData({ ...formData, tarif_base: parseFloat(e.target.value) })}
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label>Moyen de paiement *</Label>
                  <Select
                    value={formData.moyen_paiement}
                    onValueChange={(value) => setFormData({ ...formData, moyen_paiement: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Espèces">Espèces</SelectItem>
                      <SelectItem value="Carte bancaire">Carte bancaire</SelectItem>
                      <SelectItem value="Virement">Virement</SelectItem>
                      <SelectItem value="Chèque">Chèque</SelectItem>
                      <SelectItem value="Prélèvement">Prélèvement</SelectItem>
                      <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nombre d'échéances *</Label>
                  <Input
                    type="number"
                    value={formData.nombre_echeances}
                    onChange={(e) => setFormData({ ...formData, nombre_echeances: parseInt(e.target.value) })}
                    required
                    min="1"
                    max="12"
                  />
                </div>
                <div>
                  <Label>Fréquence *</Label>
                  <Select
                    value={formData.frequence}
                    onValueChange={(value) => setFormData({ ...formData, frequence: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensuel">Mensuel</SelectItem>
                      <SelectItem value="trimestriel">Trimestriel</SelectItem>
                      <SelectItem value="semestriel">Semestriel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Jour de l'échéance</Label>
                  <Input
                    type="number"
                    value={formData.jour_echeance}
                    onChange={(e) => setFormData({ ...formData, jour_echeance: parseInt(e.target.value) })}
                    min="1"
                    max="28"
                  />
                </div>
                <div>
                  <Label>Année scolaire *</Label>
                  <Input
                    value={formData.annee_scolaire}
                    onChange={(e) => setFormData({ ...formData, annee_scolaire: e.target.value })}
                    placeholder="2025_2026"
                    required
                  />
                </div>
                
                <div className="col-span-2 space-y-3 p-4 bg-blue-50 border-2 border-black rounded-lg">
                  <Label className="font-black text-lg">Moyens de paiement acceptés - TOTALITÉ</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {MOYENS_TOTALITE.map((moyen) => (
                      <label key={moyen} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.moyens_totalite?.includes(moyen)}
                          onChange={(e) => {
                            const current = formData.moyens_totalite || [];
                            setFormData({
                              ...formData,
                              moyens_totalite: e.target.checked
                                ? [...current, moyen]
                                : current.filter(m => m !== moyen)
                            });
                          }}
                          className="w-5 h-5"
                        />
                        <span className="font-bold">{moyen}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="col-span-2 space-y-3 p-4 bg-green-50 border-2 border-black rounded-lg">
                  <Label className="font-black text-lg">Moyens de paiement acceptés - SOLDE (après acompte)</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {MOYENS_SOLDE.map((moyen) => (
                      <label key={moyen} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.moyens_solde?.includes(moyen)}
                          onChange={(e) => {
                            const current = formData.moyens_solde || [];
                            setFormData({
                              ...formData,
                              moyens_solde: e.target.checked
                                ? [...current, moyen]
                                : current.filter(m => m !== moyen)
                            });
                          }}
                          className="w-5 h-5"
                        />
                        <span className="font-bold">{moyen}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="col-span-2 flex items-center space-x-2">
                  <Switch
                    checked={formData.actif}
                    onCheckedChange={(checked) => setFormData({ ...formData, actif: checked })}
                  />
                  <Label>Plan actif</Label>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="brutal-button">
                  {editingPlan ? 'Modifier' : 'Créer'}
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
                <th className="text-left p-3 font-black">Filière / Campus</th>
                <th className="text-left p-3 font-black">Tarif</th>
                <th className="text-left p-3 font-black">Moyen</th>
                <th className="text-left p-3 font-black">Échéances</th>
                <th className="text-left p-3 font-black">Statut</th>
                <th className="text-left p-3 font-black">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans?.map((plan: any) => (
                <tr key={plan.id} className="border-b border-border hover:bg-muted/50">
                  <td className="p-3 font-bold">{plan.nom}</td>
                  <td className="p-3">
                    <div className="text-sm">
                      <div>{plan.filieres?.nom || 'Toutes'}</div>
                      <div className="text-muted-foreground">{plan.campus?.nom || 'Tous'}</div>
                    </div>
                  </td>
                  <td className="p-3 font-bold">{plan.tarif_base.toLocaleString('fr-FR')} €</td>
                  <td className="p-3">{plan.moyen_paiement}</td>
                  <td className="p-3">{plan.nombre_echeances}x ({plan.frequence})</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${plan.actif ? 'bg-green-200' : 'bg-gray-200'}`}>
                      {plan.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(plan)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deletePlan.mutate(plan.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!plans || plans.length === 0) && (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-muted-foreground">
                    Aucun plan de paiement configuré
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};