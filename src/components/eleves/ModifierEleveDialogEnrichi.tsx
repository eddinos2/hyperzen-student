import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Phone, GraduationCap, CreditCard } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface Eleve {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  adresse?: string;
  date_inscription?: string;
  date_naissance?: string;
  ine?: string;
  contact_urgence?: any;
  statut_inscription?: string;
}

interface ModifierEleveDialogEnrichiProps {
  eleve: Eleve;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ModifierEleveDialogEnrichi({ eleve, open, onOpenChange, onSuccess }: ModifierEleveDialogEnrichiProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    // Identité
    nom: eleve.nom,
    prenom: eleve.prenom,
    email: eleve.email,
    date_naissance: eleve.date_naissance || '',
    ine: eleve.ine || '',
    statut_inscription: eleve.statut_inscription || 'Inscrit',
    
    // Contact
    telephone: eleve.telephone || '',
    adresse: eleve.adresse || '',
    contact_urgence_nom: eleve.contact_urgence?.nom || '',
    contact_urgence_tel: eleve.contact_urgence?.telephone || '',
    contact_urgence_relation: eleve.contact_urgence?.relation || '',
    
    // Dates
    date_inscription: eleve.date_inscription || '',
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
          date_naissance: formData.date_naissance || null,
          ine: formData.ine || null,
          date_inscription: formData.date_inscription || null,
          statut_inscription: formData.statut_inscription || null,
          contact_urgence: {
            nom: formData.contact_urgence_nom,
            telephone: formData.contact_urgence_tel,
            relation: formData.contact_urgence_relation,
          },
        })
        .eq('id', eleve.id);

      if (error) throw error;

      if (needsCloture) {
        const { useClotureEleve } = await import('@/hooks/useClotureEleve');
        const { cloturerDossier } = useClotureEleve();
        await cloturerDossier(eleve.id, newStatut as 'Désinscrit' | 'Diplômé');
      }

      toast({
        title: 'Profil modifié',
        description: needsCloture 
          ? 'Statut changé et dossier clôturé automatiquement'
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black">
            Modifier le profil de {eleve.prenom} {eleve.nom}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="identite" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="identite" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Identité
              </TabsTrigger>
              <TabsTrigger value="contact" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Contact
              </TabsTrigger>
              <TabsTrigger value="scolarite" className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Scolarité
              </TabsTrigger>
            </TabsList>

            <TabsContent value="identite" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nom *</Label>
                  <Input
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Prénom *</Label>
                  <Input
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Date de naissance</Label>
                  <Input
                    type="date"
                    value={formData.date_naissance}
                    onChange={(e) => setFormData({ ...formData, date_naissance: e.target.value })}
                  />
                </div>
                <div>
                  <Label>INE (Identifiant National Élève)</Label>
                  <Input
                    value={formData.ine}
                    onChange={(e) => setFormData({ ...formData, ine: e.target.value })}
                    placeholder="11 caractères"
                    maxLength={11}
                  />
                </div>
                <div>
                  <Label>Statut d'inscription</Label>
                  <Select
                    value={formData.statut_inscription}
                    onValueChange={(value) => setFormData({ ...formData, statut_inscription: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUTS_INSCRIPTION.map(statut => (
                        <SelectItem key={statut} value={statut}>{statut}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contact" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <Label>Téléphone</Label>
                  <Input
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    placeholder="+33..."
                  />
                </div>
                <div>
                  <Label>Adresse complète</Label>
                  <Textarea
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                    placeholder="Numéro, rue, code postal, ville"
                    rows={3}
                  />
                </div>

                <div className="pt-4 border-t">
                  <h3 className="text-lg font-bold mb-4">Contact d'urgence</h3>
                  <div className="space-y-4">
                    <div>
                      <Label>Nom du contact</Label>
                      <Input
                        value={formData.contact_urgence_nom}
                        onChange={(e) => setFormData({ ...formData, contact_urgence_nom: e.target.value })}
                        placeholder="Prénom et nom"
                      />
                    </div>
                    <div>
                      <Label>Téléphone du contact</Label>
                      <Input
                        type="tel"
                        value={formData.contact_urgence_tel}
                        onChange={(e) => setFormData({ ...formData, contact_urgence_tel: e.target.value })}
                        placeholder="+33..."
                      />
                    </div>
                    <div>
                      <Label>Lien de parenté</Label>
                      <Input
                        value={formData.contact_urgence_relation}
                        onChange={(e) => setFormData({ ...formData, contact_urgence_relation: e.target.value })}
                        placeholder="Ex: Mère, Père, Tuteur..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="scolarite" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <Label>Date d'inscription</Label>
                  <Input
                    type="date"
                    value={formData.date_inscription}
                    onChange={(e) => setFormData({ ...formData, date_inscription: e.target.value })}
                  />
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Les informations de scolarité (campus, filière, année) sont gérées via le dossier de scolarité.
                    Les informations financières sont accessibles depuis la page de détails de l'élève.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="brutal-button">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}