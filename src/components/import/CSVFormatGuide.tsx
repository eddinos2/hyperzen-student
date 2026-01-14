import { Card } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export const CSVFormatGuide = () => {
  return (
    <Card className="brutal-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <FileText className="h-6 w-6" />
        <h3 className="text-2xl font-black">Format CSV attendu</h3>
      </div>
      
      <div className="space-y-4 text-sm">
        <div>
          <h4 className="font-bold mb-2">Colonnes obligatoires:</h4>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>NOM, PRENOM, MAIL (email de l'élève)</li>
            <li>FILIERE, CAMPUS, 1A 2A (année)</li>
            <li>TARIF SCOLARITE (format: 5 500,00 € ou 5500)</li>
          </ul>
          <div className="mt-3 p-3 bg-green-50 rounded-lg border-2 border-green-600">
            <p className="text-sm font-black text-green-800">
              ✓ Les accents sont gérés automatiquement (Jaurès = Jaures, É = E, etc.)
            </p>
          </div>
        </div>

        <div>
          <h4 className="font-bold mb-2">Colonnes optionnelles:</h4>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>NUMERO (téléphone), ADRESSE</li>
            <li>RYTHME (ex: MJV, LMM)</li>
            <li>STATUT, COMMENTAIRE</li>
            <li>IMPAYE 24/25 (impayés antérieurs)</li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-2">Règlements (optionnel):</h4>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>ACOMPTE, TOTAL VERSEE</li>
            <li>MONTANT RGLT1, MOYEN RGLT1, DATE RGLT1</li>
            <li>MONTANT RGLT2, MOYEN RGLT2, DATE RGLT2</li>
            <li>... jusqu'à RGLT13</li>
          </ul>
        </div>

        <div className="bg-yellow-50 p-4 rounded-xl border-4 border-black">
          <p className="font-bold">📌 Format des montants:</p>
          <p className="text-muted-foreground">
            Acceptés: "5 500,00 €" ou "5500" ou "5,500.00"
          </p>
        </div>

        <div className="bg-blue-50 p-4 rounded-xl border-4 border-black">
          <p className="font-bold">📅 Format des dates:</p>
          <p className="text-muted-foreground">
            Acceptés: "14/09" ou "14/09/2025" ou "2025-09-14"
          </p>
        </div>
      </div>
    </Card>
  );
};
