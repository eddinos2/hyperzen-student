import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle } from 'lucide-react';

interface PreviewEtValidationProps {
  anneeCourante: string;
  anneeSuivante: string;
  onRetour: () => void;
  onValider: () => void;
}

export function PreviewEtValidation({
  anneeCourante,
  anneeSuivante,
  onRetour,
  onValider
}: PreviewEtValidationProps) {
  return (
    <div className="space-y-6">
      <div className="brutal-card p-8">
        <h2 className="text-3xl font-black mb-6">🔍 PRÉVISUALISATION</h2>
        <p className="text-lg font-bold mb-6">
          Vérifiez les modifications qui seront appliquées avant de valider la migration.
        </p>

        {/* Liste des modifications */}
        <div className="space-y-4">
          <div className="brutal-card p-4 bg-purple-50">
            <h3 className="text-xl font-black mb-2">✅ Modifications prévues</h3>
            <ul className="space-y-2 text-sm font-bold">
              <li>• Tous les élèves de 2A seront marqués comme "Diplômé"</li>
              <li>• Leurs dossiers {anneeCourante} seront clôturés</li>
              <li>• Tous les élèves de 1A recevront un nouveau dossier {anneeSuivante}</li>
              <li>• Les impayés seront automatiquement reportés</li>
              <li>• Les échéances futures seront annulées pour les diplômés</li>
            </ul>
          </div>

          <div className="brutal-card p-4 bg-red-50 border-4 border-red-400">
            <h3 className="text-xl font-black mb-2">⚠️ Points d'attention</h3>
            <ul className="space-y-2 text-sm font-bold">
              <li>• Cette action est irréversible</li>
              <li>• Assurez-vous d'avoir une sauvegarde récente</li>
              <li>• Vérifiez que les tarifs {anneeSuivante} sont configurés</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <Button
            onClick={onRetour}
            variant="outline"
            className="brutal-button"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            RETOUR
          </Button>
          <Button
            onClick={onValider}
            className="brutal-button bg-green-400 hover:bg-green-500 flex-1"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            VALIDER LA MIGRATION
          </Button>
        </div>
      </div>
    </div>
  );
}
