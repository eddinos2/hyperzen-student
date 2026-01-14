import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface GererTacheDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  tache?: any;
}

const JOURS_SEMAINE = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 7, label: 'Dimanche' },
];

const TYPES_TACHES = [
  { value: 'relances_automatiques', label: 'Relances automatiques' },
  { value: 'notifications_echeances', label: 'Notifications d\'échéances' },
  { value: 'mise_a_jour_risques', label: 'Mise à jour des risques' },
];

export const GererTacheDialog = ({ open, onOpenChange, onSuccess, tache }: GererTacheDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    type_tache: 'relances_automatiques',
    description: '',
    heure_execution: '09:00',
    jours_semaine: [] as number[],
    actif: true,
  });

  useEffect(() => {
    if (tache) {
      setFormData({
        nom: tache.nom || '',
        type_tache: tache.type_tache || 'relances_automatiques',
        description: tache.description || '',
        heure_execution: tache.heure_execution || '09:00',
        jours_semaine: tache.jours_semaine || [],
        actif: tache.actif !== false,
      });
    } else {
      setFormData({
        nom: '',
        type_tache: 'relances_automatiques',
        description: '',
        heure_execution: '09:00',
        jours_semaine: [],
        actif: true,
      });
    }
  }, [tache, open]);

  const toggleJour = (jour: number) => {
    setFormData(prev => ({
      ...prev,
      jours_semaine: prev.jours_semaine.includes(jour)
        ? prev.jours_semaine.filter(j => j !== jour)
        : [...prev.jours_semaine, jour].sort()
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSubmit = {
        ...formData,
        jours_semaine: formData.jours_semaine.length > 0 ? formData.jours_semaine : null,
      };

      if (tache) {
        const { error } = await supabase
          .from('taches_planifiees')
          .update(dataToSubmit)
          .eq('id', tache.id);

        if (error) throw error;

        toast({
          title: 'Tâche modifiée',
          description: 'La tâche planifiée a été modifiée avec succès'
        });
      } else {
        const { error } = await supabase
          .from('taches_planifiees')
          .insert(dataToSubmit);

        if (error) throw error;

        toast({
          title: 'Tâche créée',
          description: 'La tâche planifiée a été créée avec succès'
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {tache ? 'Modifier la tâche planifiée' : 'Ajouter une tâche planifiée'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom de la tâche *</Label>
            <Input
              id="nom"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              placeholder="Ex: Relances quotidiennes"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type_tache">Type de tâche *</Label>
            <Select
              value={formData.type_tache}
              onValueChange={(value) => setFormData({ ...formData, type_tache: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES_TACHES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description optionnelle de la tâche"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="heure_execution">Heure d'exécution *</Label>
            <Input
              id="heure_execution"
              type="time"
              value={formData.heure_execution}
              onChange={(e) => setFormData({ ...formData, heure_execution: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Jours de la semaine</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Laissez vide pour exécuter tous les jours
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {JOURS_SEMAINE.map(jour => (
                <div key={jour.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`jour-${jour.value}`}
                    checked={formData.jours_semaine.includes(jour.value)}
                    onCheckedChange={() => toggleJour(jour.value)}
                  />
                  <Label
                    htmlFor={`jour-${jour.value}`}
                    className="text-sm cursor-pointer"
                  >
                    {jour.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="actif"
              checked={formData.actif}
              onCheckedChange={(checked) => setFormData({ ...formData, actif: checked as boolean })}
            />
            <Label htmlFor="actif" className="cursor-pointer">
              Tâche active
            </Label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Enregistrement...' : tache ? 'Modifier' : 'Créer'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Annuler
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
