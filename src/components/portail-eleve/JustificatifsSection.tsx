import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, CheckCircle, Clock, XCircle } from 'lucide-react';
import { formaterDate } from '@/lib/calculs';
import { useToast } from '@/hooks/use-toast';

interface JustificatifsSectionProps {
  eleveId: string;
}

export function JustificatifsSection({ eleveId }: JustificatifsSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: justificatifs, isLoading } = useQuery({
    queryKey: ['eleve-justificatifs', eleveId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('justificatifs')
        .select('*')
        .eq('eleve_id', eleveId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: { type: string; message: string; file?: File }) => {
      let fichierUrl = '';

      if (data.file) {
        // Upload vers un service externe ou Supabase Storage si configuré
        // Pour l'instant, on simule avec un placeholder
        fichierUrl = `https://placeholder.com/${data.file.name}`;
      }

      const { error } = await supabase
        .from('justificatifs')
        .insert({
          eleve_id: eleveId,
          type_justificatif: data.type,
          message: data.message,
          fichier_url: fichierUrl || 'sans_fichier',
          statut: 'en_attente',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eleve-justificatifs'] });
      toast({
        title: 'Justificatif envoyé',
        description: 'En cours de traitement',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const type = formData.get('type') as string;
    const message = formData.get('message') as string;
    const file = formData.get('file') as File;

    if (!type || !message) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    await uploadMutation.mutateAsync({ type, message, file: file || undefined });
    setUploading(false);
    e.currentTarget.reset();
  };

  const getStatutIcon = (statut: string) => {
    switch (statut) {
      case 'valide':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'refuse':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'valide':
        return 'from-green-100 to-green-50 border-green-600';
      case 'refuse':
        return 'from-red-100 to-red-50 border-red-600';
      default:
        return 'from-yellow-100 to-yellow-50 border-yellow-600';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-4xl animate-spin">⏳</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Formulaire d'upload */}
      <div className="brutal-card p-6 bg-gradient-to-br from-cyan-50 to-blue-50">
        <h3 className="text-xl font-black mb-4 flex items-center gap-2">
          <Upload className="w-6 h-6" />
          ENVOYER UN JUSTIFICATIF
        </h3>
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-black uppercase mb-2">Type</label>
            <select
              name="type"
              required
              className="w-full h-12 px-4 border-4 border-black rounded-xl font-bold"
            >
              <option value="">Sélectionner un type</option>
              <option value="absence">Absence</option>
              <option value="retard">Retard</option>
              <option value="medical">Certificat médical</option>
              <option value="autre">Autre</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-black uppercase mb-2">Message</label>
            <textarea
              name="message"
              required
              rows={3}
              className="w-full px-4 py-3 border-4 border-black rounded-xl font-bold resize-none"
              placeholder="Expliquez la raison..."
            />
          </div>

          <div>
            <label className="block text-sm font-black uppercase mb-2">Fichier (optionnel)</label>
            <input
              type="file"
              name="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="w-full h-12 px-4 border-4 border-black rounded-xl font-bold file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-2 file:border-black file:font-bold file:bg-white hover:file:bg-black hover:file:text-white"
            />
            <p className="text-xs font-bold text-muted-foreground mt-1">
              PDF, JPG, PNG (max 5 Mo)
            </p>
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="brutal-button bg-primary text-primary-foreground w-full flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <div className="w-5 h-5 border-4 border-black border-t-transparent rounded-full animate-spin" />
                ENVOI...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                ENVOYER
              </>
            )}
          </button>
        </form>
      </div>

      {/* Liste des justificatifs */}
      <div>
        <h3 className="text-xl font-black mb-4">HISTORIQUE</h3>
        {!justificatifs || justificatifs.length === 0 ? (
          <div className="text-center py-12 brutal-card bg-gradient-to-br from-gray-50 to-gray-100">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-black">Aucun justificatif</p>
          </div>
        ) : (
          <div className="space-y-4">
            {justificatifs.map((justif) => (
              <div
                key={justif.id}
                className={`brutal-card p-6 bg-gradient-to-br border-4 ${getStatutColor(justif.statut)}`}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    {getStatutIcon(justif.statut)}
                    <span className="font-black text-sm uppercase">{justif.statut}</span>
                  </div>
                  <span className="text-sm font-bold text-muted-foreground">
                    {formaterDate(justif.created_at)}
                  </span>
                </div>

                <div className="mb-2">
                  <span className="inline-block px-3 py-1 rounded-lg border-2 border-black bg-white text-xs font-black mb-2">
                    {justif.type_justificatif}
                  </span>
                </div>

                <p className="text-sm font-bold mb-2">{justif.message}</p>

                {justif.commentaire_traitement && (
                  <div className="mt-3 p-3 rounded-lg border-2 border-black bg-white">
                    <p className="text-xs font-black uppercase mb-1">Réponse:</p>
                    <p className="text-sm font-bold">{justif.commentaire_traitement}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}