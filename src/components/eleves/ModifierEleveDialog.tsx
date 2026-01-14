import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Eleve {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  adresse?: string;
  statut_inscription?: string;
}

interface ModifierEleveDialogProps {
  eleve: Eleve;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ModifierEleveDialog({ eleve, open, onOpenChange, onSuccess }: ModifierEleveDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    nom: eleve.nom,
    prenom: eleve.prenom,
    email: eleve.email,
    telephone: eleve.telephone || '',
    adresse: eleve.adresse || '',
    statut_inscription: eleve.statut_inscription || '',
  });

  const STATUTS_INSCRIPTION = [
    'Inscrit',
    'En attente',
    'Désinscrit',
    'Diplômé',
    'Redoublant',
    'Archive'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Détecter changement vers désinscription ou diplômé
      const oldStatut = eleve.statut_inscription;
      const newStatut = formData.statut_inscription;
      const needsCloture = 
        (oldStatut === 'Inscrit' || oldStatut === 'Redoublant') &&
        (newStatut === 'Désinscrit' || newStatut === 'Diplômé');

      const { error } = await supabase
        .from('eleves')
        .update({
          nom: formData.nom,
          prenom: formData.prenom,
          email: formData.email,
          telephone: formData.telephone || null,
          adresse: formData.adresse || null,
          statut_inscription: formData.statut_inscription || null,
        })
        .eq('id', eleve.id);

      if (error) throw error;

      // Si changement vers désinscrit/diplômé, clôturer le dossier
      if (needsCloture) {
        // Import dynamique pour éviter les problèmes de dépendances circulaires
        const { useClotureEleve } = await import('@/hooks/useClotureEleve');
        const { cloturerDossier } = useClotureEleve();
        await cloturerDossier(eleve.id, newStatut as 'Désinscrit' | 'Diplômé');
      }

      toast({
        title: 'Profil modifié',
        description: needsCloture 
          ? `Statut changé et dossier clôturé automatiquement`
          : 'Les modifications ont été enregistrées avec succès',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de modifier le profil',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black">MODIFIER LE PROFIL</DialogTitle>
          <DialogDescription>
            Modifiez les informations de l'élève
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-bold uppercase">Nom</Label>
              <Input
                type="text"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                className="brutal-input"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold uppercase">Prénom</Label>
              <Input
                type="text"
                value={formData.prenom}
                onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                className="brutal-input"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold uppercase">Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="brutal-input"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold uppercase">Téléphone</Label>
              <Input
                type="tel"
                value={formData.telephone}
                onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                className="brutal-input"
                placeholder="06 12 34 56 78"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label className="font-bold uppercase">Adresse</Label>
              <Input
                type="text"
                value={formData.adresse}
                onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                className="brutal-input"
                placeholder="123 rue de la Paix, 75001 Paris"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold uppercase">Statut d'inscription</Label>
              <select
                value={formData.statut_inscription}
                onChange={(e) => setFormData({ ...formData, statut_inscription: e.target.value })}
                className="h-12 px-4 border-4 border-black rounded-2xl font-bold w-full"
              >
                {STATUTS_INSCRIPTION.map(statut => (
                  <option key={statut} value={statut}>{statut}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="brutal-button bg-white text-black"
            >
              ANNULER
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="brutal-button bg-primary text-primary-foreground"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ENREGISTREMENT...
                </>
              ) : (
                'ENREGISTRER'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
