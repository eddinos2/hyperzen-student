import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { WizardFormData } from '@/lib/wizard-utils';

interface EtapeReglementInitialProps {
  formData: WizardFormData['acompte'];
  onChange: (data: Partial<WizardFormData['acompte']>) => void;
}

export const EtapeReglementInitial = ({ formData, onChange }: EtapeReglementInitialProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-black mb-4">💶 Règlement initial (optionnel)</h3>
        <p className="text-muted-foreground mb-6">L'élève a-t-il déjà versé un acompte ?</p>
      </div>

      <div className="flex items-center justify-between p-4 bg-yellow-50 border-4 border-black rounded-2xl">
        <div>
          <Label htmlFor="generer_acompte" className="font-bold text-lg">
            Créer un règlement initial
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            Le règlement sera marqué "EN ATTENTE" jusqu'à réception du document
          </p>
        </div>
        <Switch
          id="generer_acompte"
          checked={formData.generer}
          onCheckedChange={(checked) => onChange({ generer: checked })}
        />
      </div>

      {formData.generer && (
        <div className="space-y-6 p-6 bg-white border-4 border-black rounded-2xl">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="montant_acompte" className="font-bold">Montant (€) *</Label>
              <Input
                id="montant_acompte"
                type="number"
                step="0.01"
                value={formData.montant}
                onChange={(e) => onChange({ montant: e.target.value })}
                className="brutal-input"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_reglement" className="font-bold">Date de règlement *</Label>
              <Input
                id="date_reglement"
                type="date"
                value={formData.date_reglement}
                onChange={(e) => onChange({ date_reglement: e.target.value })}
                className="brutal-input"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="moyen_paiement" className="font-bold">Moyen de paiement *</Label>
              <select
                id="moyen_paiement"
                value={formData.moyen_paiement}
                onChange={(e) => onChange({ moyen_paiement: e.target.value })}
                className="h-12 px-4 border-4 border-black rounded-2xl font-bold w-full"
              >
                <option value="Virement">Virement</option>
                <option value="Carte bancaire">Carte bancaire</option>
                <option value="Chèque">Chèque</option>
                <option value="Espèces">Espèces</option>
                <option value="Prélèvement">Prélèvement</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="numero_piece" className="font-bold">N° de pièce</Label>
              <Input
                id="numero_piece"
                value={formData.numero_piece}
                onChange={(e) => onChange({ numero_piece: e.target.value })}
                className="brutal-input"
                placeholder="N° chèque, transaction..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="commentaire_reglement" className="font-bold">Commentaire</Label>
            <Textarea
              id="commentaire_reglement"
              value={formData.commentaire}
              onChange={(e) => onChange({ commentaire: e.target.value })}
              className="brutal-input"
              rows={2}
            />
          </div>
        </div>
      )}
    </div>
  );
};
