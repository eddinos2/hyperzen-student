import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface AjouterEleveProps {
  onSuccess?: () => void;
}

export const AjouterEleve = ({ onSuccess }: AjouterEleveProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    adresse: '',
    matricule: '',
    campus_id: '',
    filiere_id: '',
    annee_id: '',
    tarif_scolarite: '',
    rythme: '',
    commentaire: '',
  });

  const { data: campus } = useQuery({
    queryKey: ['campus'],
    queryFn: async () => {
      const { data } = await supabase.from('campus').select('*').eq('actif', true);
      return data || [];
    },
  });

  const { data: filieres } = useQuery({
    queryKey: ['filieres'],
    queryFn: async () => {
      const { data } = await supabase.from('filieres').select('*').eq('actif', true);
      return data || [];
    },
  });

  const { data: annees } = useQuery({
    queryKey: ['annees'],
    queryFn: async () => {
      const { data } = await supabase.from('annees_scolaires').select('*').order('ordre');
      return data || [];
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create student
      const { data: eleve, error: eleveError } = await supabase
        .from('eleves')
        .insert({
          nom: formData.nom,
          prenom: formData.prenom,
          email: formData.email,
          telephone: formData.telephone,
          adresse: formData.adresse,
          statut_inscription: 'Inscrit', // Définir le statut par défaut
        })
        .select()
        .single();

      if (eleveError) throw eleveError;

      // Create dossier
      const { error: dossierError } = await supabase
        .from('dossiers_scolarite')
        .insert({
          eleve_id: eleve.id,
          campus_id: formData.campus_id || null,
          filiere_id: formData.filiere_id || null,
          annee_id: formData.annee_id || null,
          tarif_scolarite: parseFloat(formData.tarif_scolarite) || 0,
          rythme: formData.rythme || null,
          commentaire: formData.commentaire || null,
        });

      if (dossierError) throw dossierError;

      toast({
        title: 'Élève créé',
        description: `${formData.prenom} ${formData.nom} a été ajouté avec succès`,
      });

      setOpen(false);
      setFormData({
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        adresse: '',
        matricule: '',
        campus_id: '',
        filiere_id: '',
        annee_id: '',
        tarif_scolarite: '',
        rythme: '',
        commentaire: '',
      });

      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer l\'élève',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="brutal-button">
          <UserPlus className="h-5 w-5 mr-2" />
          AJOUTER UN ÉLÈVE
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black">Nouvel élève</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nom" className="font-bold">Nom *</Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                className="brutal-input"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prenom" className="font-bold">Prénom *</Label>
              <Input
                id="prenom"
                value={formData.prenom}
                onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                className="brutal-input"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="font-bold">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="brutal-input"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telephone" className="font-bold">Téléphone</Label>
              <Input
                id="telephone"
                value={formData.telephone}
                onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                className="brutal-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="matricule" className="font-bold">Matricule</Label>
              <Input
                id="matricule"
                value={formData.matricule}
                onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                className="brutal-input"
                placeholder="Ex: HZ2025-001"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adresse" className="font-bold">Adresse</Label>
            <Textarea
              id="adresse"
              value={formData.adresse}
              onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
              className="brutal-input"
            />
          </div>

          <div className="brutal-separator my-6" />

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="campus" className="font-bold">Campus</Label>
              <select
                id="campus"
                value={formData.campus_id}
                onChange={(e) => setFormData({ ...formData, campus_id: e.target.value })}
                className="h-12 px-4 border-4 border-black rounded-2xl font-bold w-full"
              >
                <option value="">Sélectionner</option>
                {campus?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filiere" className="font-bold">Filière</Label>
              <select
                id="filiere"
                value={formData.filiere_id}
                onChange={(e) => setFormData({ ...formData, filiere_id: e.target.value })}
                className="h-12 px-4 border-4 border-black rounded-2xl font-bold w-full"
              >
                <option value="">Sélectionner</option>
                {filieres?.map((f: any) => (
                  <option key={f.id} value={f.id}>{f.nom}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="annee" className="font-bold">Année</Label>
              <select
                id="annee"
                value={formData.annee_id}
                onChange={(e) => setFormData({ ...formData, annee_id: e.target.value })}
                className="h-12 px-4 border-4 border-black rounded-2xl font-bold w-full"
              >
                <option value="">Sélectionner</option>
                {annees?.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.libelle}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tarif" className="font-bold">Tarif scolarité (€)</Label>
              <Input
                id="tarif"
                type="number"
                step="0.01"
                value={formData.tarif_scolarite}
                onChange={(e) => setFormData({ ...formData, tarif_scolarite: e.target.value })}
                className="brutal-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rythme" className="font-bold">Rythme</Label>
              <Input
                id="rythme"
                value={formData.rythme}
                onChange={(e) => setFormData({ ...formData, rythme: e.target.value })}
                className="brutal-input"
                placeholder="Ex: MJV, LMM"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="commentaire" className="font-bold">Commentaire</Label>
            <Textarea
              id="commentaire"
              value={formData.commentaire}
              onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
              className="brutal-input"
            />
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="brutal-button flex-1"
            >
              {loading ? 'Création...' : 'CRÉER L\'ÉLÈVE'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
