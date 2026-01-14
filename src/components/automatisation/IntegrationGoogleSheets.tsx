import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileSpreadsheet, Upload, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
export function IntegrationGoogleSheets() {
  const {
    toast
  } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [lastSync, setLastSync] = useState<any>(null);
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      toast({
        title: 'Format invalide',
        description: 'Veuillez sélectionner un fichier CSV',
        variant: 'destructive'
      });
      return;
    }
    setIsUploading(true);
    try {
      // Lire le contenu du fichier
      const text = await file.text();

      // Appeler l'edge function
      const {
        data,
        error
      } = await supabase.functions.invoke('sync-google-sheets', {
        body: {
          csvContent: text
        }
      });
      if (error) throw error;
      setLastSync(data.rapport);
      toast({
        title: 'Synchronisation réussie',
        description: `${data.rapport.crees} élève(s) créé(s), ${data.rapport.doublons} doublon(s) ignoré(s)`
      });
    } catch (error: any) {
      console.error('Erreur sync:', error);
      toast({
        title: 'Erreur de synchronisation',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
      // Reset input
      event.target.value = '';
    }
  };
  return <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Google Sheets (JotForm)
        </CardTitle>
        
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="csv-file">Fichier CSV</Label>
          <div className="flex items-center gap-2">
            <Input id="csv-file" type="file" accept=".csv" onChange={handleFileUpload} disabled={isUploading} className="cursor-pointer" />
            <Button disabled={isUploading} size="icon" variant="outline">
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            </Button>
          </div>
          
        </div>

        {lastSync && <div className="space-y-3 mt-6">
            <h4 className="font-semibold text-sm">Dernier import:</h4>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border bg-green-50 dark:bg-green-950/20">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-medium text-green-600">Créés</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{lastSync.crees}</p>
              </div>

              <div className="p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-950/20">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-xs font-medium text-yellow-600">Doublons</span>
                </div>
                <p className="text-2xl font-bold text-yellow-600">{lastSync.doublons}</p>
              </div>

              <div className="p-3 rounded-lg border bg-red-50 dark:bg-red-950/20">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-xs font-medium text-red-600">Erreurs</span>
                </div>
                <p className="text-2xl font-bold text-red-600">{lastSync.erreurs?.length || 0}</p>
              </div>
            </div>

            {lastSync.erreurs && lastSync.erreurs.length > 0 && <div className="p-3 rounded-lg border bg-red-50 dark:bg-red-950/20">
                <p className="font-semibold text-sm text-red-600 mb-2">Erreurs détectées:</p>
                <ul className="text-xs text-red-600 space-y-1 max-h-32 overflow-y-auto">
                  {lastSync.erreurs.slice(0, 5).map((err: string, idx: number) => <li key={idx}>• {err}</li>)}
                  {lastSync.erreurs.length > 5 && <li>... et {lastSync.erreurs.length - 5} autre(s)</li>}
                </ul>
              </div>}

            {lastSync.details && lastSync.details.length > 0 && <div className="p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-950/20">
                <p className="font-semibold text-sm text-yellow-600 mb-2">Doublons ignorés:</p>
                <ul className="text-xs text-yellow-600 space-y-1 max-h-32 overflow-y-auto">
                  {lastSync.details.slice(0, 5).map((detail: any, idx: number) => <li key={idx}>• {detail.email} - {detail.raison}</li>)}
                  {lastSync.details.length > 5 && <li>... et {lastSync.details.length - 5} autre(s)</li>}
                </ul>
              </div>}
          </div>}

        <div className="pt-4 border-t">
          
        </div>
      </CardContent>
    </Card>;
}