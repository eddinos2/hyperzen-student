import { WizardFormData, calculateResteAPayer, calculateMontantEcheance } from '@/lib/wizard-utils';
import { CheckCircle2 } from 'lucide-react';

interface EtapeRecapitulatifProps {
  formData: WizardFormData;
}

export const EtapeRecapitulatif = ({ formData }: EtapeRecapitulatifProps) => {
  const tarif = parseFloat(formData.dossier.tarif_scolarite) || 0;
  const impaye = parseFloat(formData.dossier.impaye_anterieur) || 0;
  const acompte = formData.acompte.generer ? parseFloat(formData.acompte.montant) || 0 : 0;
  const resteAPayer = calculateResteAPayer(tarif, impaye, acompte);
  const montantEcheance = formData.echeancier.generer
    ? calculateMontantEcheance(resteAPayer, parseInt(formData.echeancier.nb_echeances) || 1)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-black mb-4">✅ Récapitulatif</h3>
        <p className="text-muted-foreground mb-6">Vérifier les informations avant création</p>
      </div>

      {/* Élève */}
      <div className="brutal-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
          <h4 className="text-xl font-black">Élève</h4>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-bold">Nom complet:</span>
            <p className="text-lg font-black">{formData.eleve.prenom} {formData.eleve.nom}</p>
          </div>
          <div>
            <span className="font-bold">Email:</span>
            <p>{formData.eleve.email}</p>
          </div>
          {formData.eleve.telephone && (
            <div>
              <span className="font-bold">Téléphone:</span>
              <p>{formData.eleve.telephone}</p>
            </div>
          )}
          <div>
            <span className="font-bold">Statut:</span>
            <p>{formData.eleve.statut_inscription}</p>
          </div>
        </div>
      </div>

      {/* Dossier */}
      <div className="brutal-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
          <h4 className="text-xl font-black">Dossier de scolarité</h4>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-bold">Année scolaire:</span>
            <p>{formData.dossier.annee_scolaire.replace('_', '-')}</p>
          </div>
          <div>
            <span className="font-bold">Tarif:</span>
            <p className="text-lg font-black">{tarif.toFixed(2)} €</p>
          </div>
          {impaye > 0 && (
            <div>
              <span className="font-bold text-red-600">Impayé antérieur:</span>
              <p className="text-red-600 font-bold">{impaye.toFixed(2)} €</p>
            </div>
          )}
          {formData.dossier.rythme && (
            <div>
              <span className="font-bold">Rythme:</span>
              <p>{formData.dossier.rythme}</p>
            </div>
          )}
        </div>
      </div>

      {/* Acompte */}
      {formData.acompte.generer && (
        <div className="brutal-card p-6 bg-green-50">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
            <h4 className="text-xl font-black">Règlement initial</h4>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-bold">Montant:</span>
              <p className="text-lg font-black text-green-600">{acompte.toFixed(2)} €</p>
            </div>
            <div>
              <span className="font-bold">Date:</span>
              <p>{new Date(formData.acompte.date_reglement).toLocaleDateString('fr-FR')}</p>
            </div>
            <div>
              <span className="font-bold">Moyen:</span>
              <p>{formData.acompte.moyen_paiement}</p>
            </div>
          </div>
        </div>
      )}

      {/* Échéancier */}
      {formData.echeancier.generer && (
        <div className="brutal-card p-6 bg-cyan-50">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-6 h-6 text-cyan-600" />
            <h4 className="text-xl font-black">Échéancier</h4>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-bold">Nombre d'échéances:</span>
              <p className="text-lg font-black">{formData.echeancier.nb_echeances}</p>
            </div>
            <div>
              <span className="font-bold">Montant par échéance:</span>
              <p className="text-lg font-black text-cyan-600">{montantEcheance.toFixed(2)} €</p>
            </div>
            <div>
              <span className="font-bold">Date de début:</span>
              <p>{new Date(formData.echeancier.date_debut).toLocaleDateString('fr-FR')}</p>
            </div>
            <div>
              <span className="font-bold">Jour d'échéance:</span>
              <p>Tous les {formData.echeancier.jour_echeance} du mois</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-white border-2 border-cyan-600 rounded-xl">
            <span className="font-bold">Reste à payer:</span>
            <p className="text-2xl font-black">{resteAPayer.toFixed(2)} €</p>
          </div>
        </div>
      )}

      <div className="p-4 bg-yellow-50 border-4 border-black rounded-2xl">
        <p className="text-center font-bold">
          ⚠️ Vérifiez bien toutes les informations avant de créer l'élève
        </p>
      </div>
    </div>
  );
};
