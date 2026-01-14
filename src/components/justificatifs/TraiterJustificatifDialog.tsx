import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Download } from 'lucide-react';

interface TraiterJustificatifDialogProps {
  justificatif: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const TraiterJustificatifDialog = ({ justificatif, open, onOpenChange, onSuccess }: TraiterJustificatifDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [commentaire, setCommentaire] = useState('');

  const handleTraiter = async (newStatut: 'accepte' | 'refuse') => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('justificatifs')
        .update({
          statut: newStatut,
          commentaire_traitement: commentaire || null,
          traite_at: new Date().toISOString(),
          traite_by: user?.id,
        })
        .eq('id', justificatif.id);

      if (error) throw error;

      toast({
        title: 'Justificatif traité',
        description: `Le justificatif a été ${newStatut === 'accepte' ? 'accepté' : 'refusé'}`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-4 border-black rounded-3xl bg-white">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black">TRAITER LE JUSTIFICATIF</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="brutal-card p-4 bg-gradient-to-br from-cyan-100 to-cyan-50">
            <p className="text-sm font-black uppercase mb-2">Élève</p>
            <p className="text-lg font-bold">
              {justificatif.eleves?.nom} {justificatif.eleves?.prenom}
            </p>
          </div>

          <div className="brutal-card p-4 bg-gradient-to-br from-yellow-100 to-yellow-50">
            <p className="text-sm font-black uppercase mb-2">Type de justificatif</p>
            <p className="text-lg font-bold">{justificatif.type_justificatif || 'Document'}</p>
          </div>

          {justificatif.message && (
            <div className="brutal-card p-4 bg-gradient-to-br from-blue-100 to-blue-50">
              <p className="text-sm font-black uppercase mb-2">Message de l'élève</p>
              <p className="text-base font-medium">{justificatif.message}</p>
            </div>
          )}

          <div className="brutal-card p-4 bg-white">
            <p className="text-sm font-black uppercase mb-2">Fichier</p>
            <a
              href={justificatif.fichier_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-black hover:bg-black hover:text-white transition-colors font-bold"
            >
              <Download className="w-5 h-5" />
              TÉLÉCHARGER LE FICHIER
            </a>
          </div>

          {justificatif.statut === 'en_attente' && (
            <>
              <div>
                <label className="block text-sm font-black uppercase mb-2">
                  Commentaire (optionnel)
                </label>
                <textarea
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  className="min-h-20 px-4 py-3 border-4 border-black rounded-xl font-bold text-base w-full resize-none"
                  placeholder="Ajoutez un commentaire..."
                />
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => handleTraiter('accepte')}
                  disabled={loading}
                  className="flex-1 brutal-button bg-green-500 text-white flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  {loading ? 'TRAITEMENT...' : 'ACCEPTER'}
                </Button>
                <Button
                  onClick={() => handleTraiter('refuse')}
                  disabled={loading}
                  className="flex-1 brutal-button bg-red-500 text-white flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  {loading ? 'TRAITEMENT...' : 'REFUSER'}
                </Button>
              </div>
            </>
          )}

          {justificatif.statut !== 'en_attente' && (
            <div className="brutal-card p-4 bg-gradient-to-br from-gray-100 to-gray-50">
              <p className="text-sm font-black uppercase mb-2">Statut</p>
              <p className="text-lg font-bold">
                {justificatif.statut === 'accepte' ? '✅ ACCEPTÉ' : '❌ REFUSÉ'}
              </p>
              {justificatif.commentaire_traitement && (
                <>
                  <p className="text-sm font-black uppercase mt-3 mb-1">Commentaire</p>
                  <p className="text-base font-medium">{justificatif.commentaire_traitement}</p>
                </>
              )}
              {justificatif.traite_at && (
                <p className="text-xs font-medium text-muted-foreground mt-2">
                  Traité le {new Date(justificatif.traite_at).toLocaleString('fr-FR')}
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
