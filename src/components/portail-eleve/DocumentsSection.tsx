import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Download } from 'lucide-react';
import { formaterDate } from '@/lib/calculs';
import { useToast } from '@/hooks/use-toast';

interface DocumentsSectionProps {
  eleveId: string;
  dossierId?: string;
}

export function DocumentsSection({ eleveId, dossierId }: DocumentsSectionProps) {
  const { toast } = useToast();

  const { data: documents, isLoading } = useQuery({
    queryKey: ['eleve-documents', eleveId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents_pedagogiques')
        .select('*')
        .or(`visible_tous.eq.true,eleve_ids.cs.{${eleveId}}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleDownload = (url: string, titre: string) => {
    window.open(url, '_blank');
    toast({
      title: 'Téléchargement',
      description: `Document "${titre}" ouvert`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-4xl animate-spin">⏳</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!documents || documents.length === 0 ? (
        <div className="text-center py-12 brutal-card bg-gradient-to-br from-yellow-50 to-yellow-100">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-black">Aucun document disponible</p>
          <p className="text-sm font-bold text-muted-foreground mt-2">
            Les documents partagés apparaîtront ici
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="brutal-card p-6 bg-gradient-to-br from-cyan-50 to-blue-50 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 rounded-lg border-4 border-black bg-white flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-black mb-1">{doc.titre}</h3>
                    <div className="flex flex-wrap gap-2 text-sm font-bold text-muted-foreground">
                      {doc.type_document && (
                        <span className="px-3 py-1 rounded-lg border-2 border-black bg-white text-xs">
                          {doc.type_document}
                        </span>
                      )}
                      <span>{formaterDate(doc.created_at)}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(doc.fichier_url, doc.titre)}
                  className="brutal-button bg-primary text-primary-foreground flex items-center gap-2 flex-shrink-0"
                >
                  <Download className="w-4 h-4" />
                  OUVRIR
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}