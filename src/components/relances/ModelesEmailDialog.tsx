import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface ModelesEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modele?: any;
}

export function ModelesEmailDialog({ open, onOpenChange, modele }: ModelesEmailDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [nom, setNom] = useState(modele?.nom || '');
  const [niveau, setNiveau] = useState(modele?.variables?.niveau || '1');
  const [sujet, setSujet] = useState(modele?.variables?.sujet || '');
  const [contenu, setContenu] = useState(modele?.contenu_html || '');

  const sauvegarderModele = useMutation({
    mutationFn: async () => {
      const data = {
        nom,
        type_modele: 'email_relance',
        contenu_html: contenu,
        variables: {
          niveau,
          sujet,
          categorie: `niveau_${niveau}`
        },
        actif: true
      };

      if (modele) {
        const { error } = await supabase
          .from('modeles_documents')
          .update(data)
          .eq('id', modele.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('modeles_documents')
          .insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: modele ? 'Modèle mis à jour' : 'Modèle créé',
        description: 'Le modèle d\'email a été sauvegardé avec succès'
      });
      queryClient.invalidateQueries({ queryKey: ['modeles-relance'] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const resetForm = () => {
    setNom('');
    setNiveau('1');
    setSujet('');
    setContenu('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{modele ? 'Modifier' : 'Créer'} un modèle d'email</DialogTitle>
          <DialogDescription>
            Créez des modèles réutilisables pour vos relances par email. 
            Variables disponibles: {'{nom}'}, {'{prenom}'}, {'{montant}'}, {'{immatriculation}'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nom du modèle</Label>
            <Input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex: Relance niveau 1 - Rappel amical"
            />
          </div>

          <div className="space-y-2">
            <Label>Niveau de relance</Label>
            <Select value={niveau} onValueChange={setNiveau}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Niveau 1 - Rappel amical</SelectItem>
                <SelectItem value="2">Niveau 2 - Relance formelle</SelectItem>
                <SelectItem value="3">Niveau 3 - Mise en demeure</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Sujet de l'email</Label>
            <Input
              value={sujet}
              onChange={(e) => setSujet(e.target.value)}
              placeholder="Ex: Rappel de paiement - {nom} {prenom}"
            />
          </div>

          <div className="space-y-2">
            <Label>Contenu de l'email</Label>
            <Textarea
              value={contenu}
              onChange={(e) => setContenu(e.target.value)}
              placeholder="Bonjour {nom} {prenom},&#10;&#10;Nous vous rappelons que votre paiement de {montant} MAD est en attente..."
              rows={12}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button 
              onClick={() => sauvegarderModele.mutate()}
              disabled={sauvegarderModele.isPending || !nom || !sujet || !contenu}
            >
              {sauvegarderModele.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
