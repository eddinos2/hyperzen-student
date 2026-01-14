import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { WizardFormData } from '@/lib/wizard-utils';

interface EtapeInfosPersonnellesProps {
  formData: WizardFormData['eleve'];
  onChange: (data: Partial<WizardFormData['eleve']>) => void;
}

export const EtapeInfosPersonnelles = ({ formData, onChange }: EtapeInfosPersonnellesProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-black mb-4">👤 Informations personnelles</h3>
        <p className="text-muted-foreground mb-6">Saisir les informations de base de l'élève</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nom" className="font-bold">Nom *</Label>
          <Input
            id="nom"
            value={formData.nom}
            onChange={(e) => onChange({ nom: e.target.value })}
            className="brutal-input"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="prenom" className="font-bold">Prénom *</Label>
          <Input
            id="prenom"
            value={formData.prenom}
            onChange={(e) => onChange({ prenom: e.target.value })}
            className="brutal-input"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="font-bold">Email *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => onChange({ email: e.target.value })}
          className="brutal-input"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="telephone" className="font-bold">Téléphone</Label>
          <Input
            id="telephone"
            value={formData.telephone}
            onChange={(e) => onChange({ telephone: e.target.value })}
            className="brutal-input"
            placeholder="06 12 34 56 78"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="matricule" className="font-bold">Matricule</Label>
          <Input
            id="matricule"
            value={formData.matricule}
            onChange={(e) => onChange({ matricule: e.target.value })}
            className="brutal-input"
            placeholder="Auto-généré si vide"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="adresse" className="font-bold">Adresse</Label>
        <Textarea
          id="adresse"
          value={formData.adresse}
          onChange={(e) => onChange({ adresse: e.target.value })}
          className="brutal-input"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="statut_inscription" className="font-bold">Statut d'inscription *</Label>
        <select
          id="statut_inscription"
          value={formData.statut_inscription}
          onChange={(e) => onChange({ statut_inscription: e.target.value })}
          className="h-12 px-4 border-4 border-black rounded-2xl font-bold w-full"
        >
          <option value="Inscrit">Inscrit</option>
          <option value="En attente">En attente</option>
          <option value="Désinscrit">Désinscrit</option>
        </select>
      </div>
    </div>
  );
};
