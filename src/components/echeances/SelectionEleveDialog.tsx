import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GenerateurEcheances } from './GenerateurEcheances';

interface SelectionEleveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const SelectionEleveDialog = ({ open, onOpenChange, onSuccess }: SelectionEleveDialogProps) => {
  const [selectedDossierId, setSelectedDossierId] = useState<string>('');

  const { data: eleves } = useQuery({
    queryKey: ['eleves-with-dossiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('eleves')
        .select(`
          id,
          nom,
          prenom,
          dossiers_scolarite (
            id,
            annee_scolaire,
            tarif_scolarite
          )
        `)
        .order('nom', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const handleSuccess = () => {
    onSuccess();
    setSelectedDossierId('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border-4 border-black rounded-3xl bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black">GÉNÉRER DES ÉCHÉANCES</DialogTitle>
        </DialogHeader>

        {!selectedDossierId ? (
          <div className="space-y-4">
            <p className="text-lg font-bold">Sélectionnez un élève :</p>
            <div className="grid gap-3 max-h-[60vh] overflow-y-auto">
              {eleves?.map((eleve) => (
                <div key={eleve.id} className="brutal-card p-4 hover:bg-cyan-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xl font-black">
                        {eleve.nom} {eleve.prenom}
                      </p>
                      {eleve.dossiers_scolarite && eleve.dossiers_scolarite.length > 0 && (
                        <p className="text-sm font-bold text-muted-foreground">
                          {eleve.dossiers_scolarite.length} dossier(s)
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {eleve.dossiers_scolarite?.map((dossier: any) => (
                        <Button
                          key={dossier.id}
                          onClick={() => setSelectedDossierId(dossier.id)}
                          className="brutal-button bg-primary text-primary-foreground"
                        >
                          {dossier.annee_scolaire}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <Button
              onClick={() => setSelectedDossierId('')}
              className="mb-4 brutal-button bg-secondary text-secondary-foreground"
            >
              ← RETOUR À LA LISTE
            </Button>
            <GenerateurEcheances
              dossierId={selectedDossierId}
              onSuccess={handleSuccess}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
