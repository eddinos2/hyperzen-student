import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { WizardFormData, calculateResteAPayer, calculateMontantEcheance } from '@/lib/wizard-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EtapeEcheancierProps {
  formData: WizardFormData['echeancier'];
  onChange: (data: Partial<WizardFormData['echeancier']>) => void;
  tarifScolarite: string;
  impayeAnterieur: string;
  montantAcompte: string;
}

export const EtapeEcheancier = ({
  formData,
  onChange,
  tarifScolarite,
  impayeAnterieur,
  montantAcompte,
}: EtapeEcheancierProps) => {
  const tarif = parseFloat(tarifScolarite) || 0;
  const impaye = parseFloat(impayeAnterieur) || 0;
  const acompte = parseFloat(montantAcompte) || 0;

  const resteAPayer = calculateResteAPayer(tarif, impaye, acompte);
  const nbEcheances = parseInt(formData.nb_echeances) || 1;
  const montantEcheance = calculateMontantEcheance(resteAPayer, nbEcheances);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-black mb-4">📅 Échéancier de paiement (optionnel)</h3>
        <p className="text-muted-foreground mb-6">Générer automatiquement un plan de paiement</p>
      </div>

      {/* Récapitulatif financier */}
      <div className="p-6 bg-cyan-50 border-4 border-black rounded-2xl space-y-3">
        <div className="flex justify-between items-center">
          <span className="font-bold">Tarif scolarité</span>
          <span className="text-2xl font-black">{tarif.toFixed(2)} €</span>
        </div>
        {impaye > 0 && (
          <div className="flex justify-between items-center text-red-600">
            <span className="font-bold">+ Impayé antérieur</span>
            <span className="text-2xl font-black">{impaye.toFixed(2)} €</span>
          </div>
        )}
        {acompte > 0 && (
          <div className="flex justify-between items-center text-green-600">
            <span className="font-bold">- Acompte versé</span>
            <span className="text-2xl font-black">{acompte.toFixed(2)} €</span>
          </div>
        )}
        <div className="h-1 bg-black" />
        <div className="flex justify-between items-center">
          <span className="font-black text-xl">Reste à payer</span>
          <span className="text-3xl font-black">{resteAPayer.toFixed(2)} €</span>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 bg-yellow-50 border-4 border-black rounded-2xl">
        <div>
          <Label htmlFor="generer_echeancier" className="font-bold text-lg">
            Générer un échéancier automatique
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            Activer pour créer des échéances mensuelles
          </p>
        </div>
        <Switch
          id="generer_echeancier"
          checked={formData.generer}
          onCheckedChange={(checked) => onChange({ generer: checked })}
        />
      </div>

      {formData.generer && (
        <div className="space-y-6 p-6 bg-white border-4 border-black rounded-2xl">
          <div className="space-y-2">
            <Label htmlFor="moyen_paiement" className="font-bold">Moyen de paiement *</Label>
            <Select
              value={formData.moyen_paiement}
              onValueChange={(value) => onChange({ moyen_paiement: value })}
            >
              <SelectTrigger className="brutal-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Chèque">Chèques</SelectItem>
                <SelectItem value="Prélèvement">Prélèvement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nb_echeances" className="font-bold">Nombre d'échéances *</Label>
              <Input
                id="nb_echeances"
                type="number"
                min="1"
                max="24"
                value={formData.nb_echeances}
                onChange={(e) => onChange({ nb_echeances: e.target.value })}
                className="brutal-input"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jour_echeance" className="font-bold">Jour d'échéance *</Label>
              <Input
                id="jour_echeance"
                type="number"
                min="1"
                max="28"
                value={formData.jour_echeance}
                onChange={(e) => onChange({ jour_echeance: e.target.value })}
                className="brutal-input"
                required
              />
              <p className="text-xs text-muted-foreground">Jour du mois (1-28)</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date_debut" className="font-bold">Date de début *</Label>
            <Input
              id="date_debut"
              type="date"
              value={formData.date_debut}
              onChange={(e) => onChange({ date_debut: e.target.value })}
              className="brutal-input"
              required
            />
          </div>

          {/* Preview montant échéance */}
          {resteAPayer > 0 && nbEcheances > 0 && (
            <div className="p-4 bg-green-50 border-4 border-black rounded-2xl">
              <div className="flex justify-between items-center">
                <span className="font-bold">Montant par échéance</span>
                <span className="text-2xl font-black text-green-600">
                  {montantEcheance.toFixed(2)} €
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {nbEcheances} mensualités de {montantEcheance.toFixed(2)} €
              </p>
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-blue-50 border-2 border-black rounded-xl">
            <div>
              <Label htmlFor="notifications" className="font-bold">
                Notifications automatiques
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Envoyer des rappels avant chaque échéance
              </p>
            </div>
            <Switch
              id="notifications"
              checked={formData.notifications}
              onCheckedChange={(checked) => onChange({ notifications: checked })}
            />
          </div>
        </div>
      )}
    </div>
  );
};
