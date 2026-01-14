import { useState } from 'react';
import { Calendar, Plus, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
interface GenerateurEcheancesProps {
  dossierId: string;
  onSuccess: () => void;
}
export const GenerateurEcheances = ({
  dossierId,
  onSuccess
}: GenerateurEcheancesProps) => {
  const [nbEcheances, setNbEcheances] = useState(10);
  const [dateDebut, setDateDebut] = useState(new Date().toISOString().split('T')[0]);
  const [jourEcheance, setJourEcheance] = useState(14);
  const [isGenerating, setIsGenerating] = useState(false);
  const [envoyerNotifications, setEnvoyerNotifications] = useState(true);
  const {
    toast
  } = useToast();
  const generer = async () => {
    setIsGenerating(true);
    try {
      const {
        data,
        error
      } = await supabase.rpc('generer_echeances_dossier', {
        dossier_uuid: dossierId,
        nb_echeances: nbEcheances,
        date_debut: dateDebut,
        jour_echeance: jourEcheance
      });
      if (error) throw error;
      toast({
        title: 'Échéances générées',
        description: `${data} échéances ont été créées`
      });

      // Si activé, déclencher les notifications d'échéances proches
      if (envoyerNotifications) {
        supabase.functions.invoke('notifier-echeance-proche').catch(err => {
          console.error('Erreur notification échéances:', err);
        });
      }
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };
  return <div className="brutal-card p-6 bg-gradient-to-br from-purple-100 to-purple-50">
      <h3 className="text-2xl font-black mb-4 flex items-center gap-2">
        <Calendar className="w-6 h-6" />
        GÉNÉRER ÉCHÉANCIER
      </h3>
      

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-black uppercase mb-2">
            Nombre d'échéances
          </label>
          <input type="number" min="1" max="24" value={nbEcheances} onChange={e => setNbEcheances(Number(e.target.value))} className="h-12 px-6 border-4 border-black rounded-2xl font-bold text-lg w-full" />
        </div>

        <div>
          <label className="block text-sm font-black uppercase mb-2">
            Date de début
          </label>
          <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className="h-12 px-6 border-4 border-black rounded-2xl font-bold text-lg w-full" />
        </div>

        <div>
          <label className="block text-sm font-black uppercase mb-2">
            Jour d'échéance (1-31)
          </label>
          <input type="number" min="1" max="31" value={jourEcheance} onChange={e => setJourEcheance(Number(e.target.value))} className="h-12 px-6 border-4 border-black rounded-2xl font-bold text-lg w-full" />
          <p className="text-sm font-bold text-muted-foreground mt-2">
            Ex: 14 = le 14 de chaque mois
          </p>
        </div>

        <div className="flex items-center space-x-2 p-4 bg-white/50 rounded-xl border-2 border-black">
          <Switch id="notifications" checked={envoyerNotifications} onCheckedChange={setEnvoyerNotifications} />
          <Label htmlFor="notifications" className="flex items-center gap-2 font-bold cursor-pointer">
            <Bell className="w-4 h-4" />
            Envoyer les notifications automatiques
          </Label>
        </div>

        <button onClick={generer} disabled={isGenerating} className="brutal-button bg-primary text-primary-foreground w-full flex items-center justify-center gap-2">
          {isGenerating ? <>
              <div className="w-6 h-6 border-4 border-black border-t-transparent rounded-full animate-spin" />
              GÉNÉRATION...
            </> : <>
              <Plus className="w-5 h-5" />
              GÉNÉRER {nbEcheances} ÉCHÉANCES
            </>}
        </button>
      </div>
    </div>;
};