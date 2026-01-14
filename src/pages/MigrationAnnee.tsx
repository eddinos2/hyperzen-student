import { AppLayout } from '@/components/layout/AppLayout';
import { TableauMigration } from '@/components/migration/TableauMigration';
import { ActionsEnMasse } from '@/components/migration/ActionsEnMasse';
import { PreviewEtValidation } from '@/components/migration/PreviewEtValidation';
import { useState } from 'react';
import { GraduationCap } from 'lucide-react';

export type EtapeMigration = 'analyse' | 'preview' | 'execution' | 'termine';

export default function MigrationAnnee() {
  const [anneeCourante, setAnneeCourante] = useState('2024_2025');
  const [anneeSuivante, setAnneeSuivante] = useState('2025_2026');
  const [etapeMigration, setEtapeMigration] = useState<EtapeMigration>('analyse');

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-8">
          <GraduationCap className="w-12 h-12 text-primary" />
          <div>
            <h1 className="text-4xl sm:text-6xl font-black">MIGRATION D'ANNÉE SCOLAIRE</h1>
            <p className="text-xl font-bold text-muted-foreground">
              Gestion du passage d'une année à l'autre
            </p>
          </div>
        </div>

        {/* Sélecteurs d'années */}
        <div className="brutal-card p-6 bg-gradient-to-br from-cyan-50 to-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-black uppercase mb-2 block">Année Courante</label>
              <select
                value={anneeCourante}
                onChange={(e) => setAnneeCourante(e.target.value)}
                className="brutal-input"
              >
                <option value="2024_2025">2024-2025</option>
                <option value="2023_2024">2023-2024</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-black uppercase mb-2 block">Année Suivante</label>
              <select
                value={anneeSuivante}
                onChange={(e) => setAnneeSuivante(e.target.value)}
                className="brutal-input"
              >
                <option value="2025_2026">2025-2026</option>
                <option value="2024_2025">2024-2025</option>
              </select>
            </div>
          </div>
        </div>

        {/* Indicateur d'étape */}
        <div className="brutal-card p-6">
          <div className="flex items-center justify-between">
            {(['analyse', 'preview', 'execution', 'termine'] as const).map((etape, index) => (
              <div key={etape} className="flex items-center">
                <div
                  className={`w-12 h-12 rounded-full border-4 border-black flex items-center justify-center text-xl font-black transition-colors ${
                    etapeMigration === etape
                      ? 'bg-primary text-primary-foreground'
                      : index < (['analyse', 'preview', 'execution', 'termine'] as const).indexOf(etapeMigration)
                      ? 'bg-green-400'
                      : 'bg-muted'
                  }`}
                >
                  {index + 1}
                </div>
                {index < 3 && (
                  <div className="w-24 h-1 bg-black mx-2" />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs font-bold uppercase">Analyse</span>
            <span className="text-xs font-bold uppercase">Prévisualisation</span>
            <span className="text-xs font-bold uppercase">Exécution</span>
            <span className="text-xs font-bold uppercase">Terminé</span>
          </div>
        </div>

        {/* Étape 1: Analyse */}
        {etapeMigration === 'analyse' && (
          <>
            <TableauMigration
              anneeCourante={anneeCourante}
              anneeSuivante={anneeSuivante}
            />
            <ActionsEnMasse
              anneeCourante={anneeCourante}
              anneeSuivante={anneeSuivante}
              onEtapeChange={setEtapeMigration}
            />
          </>
        )}

        {/* Étape 2: Prévisualisation */}
        {etapeMigration === 'preview' && (
          <PreviewEtValidation
            anneeCourante={anneeCourante}
            anneeSuivante={anneeSuivante}
            onRetour={() => setEtapeMigration('analyse')}
            onValider={() => setEtapeMigration('execution')}
          />
        )}

        {/* Étape 3: Exécution */}
        {etapeMigration === 'execution' && (
          <div className="brutal-card p-8 text-center">
            <div className="text-6xl mb-4 animate-spin">⏳</div>
            <h2 className="text-3xl font-black mb-2">MIGRATION EN COURS...</h2>
            <p className="text-lg font-bold text-muted-foreground">
              Veuillez patienter pendant la migration des données
            </p>
          </div>
        )}

        {/* Étape 4: Terminé */}
        {etapeMigration === 'termine' && (
          <div className="brutal-card p-8 bg-gradient-to-br from-green-50 to-white text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-3xl font-black mb-2">MIGRATION TERMINÉE</h2>
            <p className="text-lg font-bold text-muted-foreground mb-6">
              La migration a été effectuée avec succès
            </p>
            <button
              onClick={() => setEtapeMigration('analyse')}
              className="brutal-button bg-primary text-primary-foreground"
            >
              RETOUR À L'ANALYSE
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
