import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { WizardFormData } from '@/lib/wizard-utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EtapeDossierProps {
  formData: WizardFormData['dossier'];
  onChange: (data: Partial<WizardFormData['dossier']>) => void;
}

export const EtapeDossier = ({ formData, onChange }: EtapeDossierProps) => {
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-black mb-4">📚 Dossier de scolarité</h3>
        <p className="text-muted-foreground mb-6">Configuration du parcours académique</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="annee_scolaire" className="font-bold">Année scolaire *</Label>
        <select
          id="annee_scolaire"
          value={formData.annee_scolaire}
          onChange={(e) => onChange({ annee_scolaire: e.target.value })}
          className="h-12 px-4 border-4 border-black rounded-2xl font-bold w-full"
        >
          <option value="2024_2025">2024-2025</option>
          <option value="2025_2026">2025-2026</option>
          <option value="2026_2027">2026-2027</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="campus" className="font-bold">Campus</Label>
          <select
            id="campus"
            value={formData.campus_id}
            onChange={(e) => onChange({ campus_id: e.target.value })}
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
            onChange={(e) => onChange({ filiere_id: e.target.value })}
            className="h-12 px-4 border-4 border-black rounded-2xl font-bold w-full"
          >
            <option value="">Sélectionner</option>
            {filieres?.map((f: any) => (
              <option key={f.id} value={f.id}>{f.nom}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="annee" className="font-bold">Année d'études</Label>
          <select
            id="annee"
            value={formData.annee_id}
            onChange={(e) => onChange({ annee_id: e.target.value })}
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
          <Label htmlFor="tarif" className="font-bold">Tarif scolarité (€) *</Label>
          <Input
            id="tarif"
            type="number"
            step="0.01"
            value={formData.tarif_scolarite}
            onChange={(e) => onChange({ tarif_scolarite: e.target.value })}
            className="brutal-input"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="impaye" className="font-bold">Impayé antérieur (€)</Label>
          <Input
            id="impaye"
            type="number"
            step="0.01"
            value={formData.impaye_anterieur}
            onChange={(e) => onChange({ impaye_anterieur: e.target.value })}
            className="brutal-input"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rythme" className="font-bold">Rythme</Label>
        <Input
          id="rythme"
          value={formData.rythme}
          onChange={(e) => onChange({ rythme: e.target.value })}
          className="brutal-input"
          placeholder="Ex: MJV, LMM, Alternance"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="commentaire_dossier" className="font-bold">Commentaire</Label>
        <Textarea
          id="commentaire_dossier"
          value={formData.commentaire}
          onChange={(e) => onChange({ commentaire: e.target.value })}
          className="brutal-input"
          rows={3}
        />
      </div>
    </div>
  );
};
