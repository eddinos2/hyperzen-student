import { AppLayout } from '@/components/layout/AppLayout';
import { AlertCircle, Play, CheckCircle, Download } from 'lucide-react';
import { useState } from 'react';
import { ImportUpload } from '@/components/import/ImportUpload';
import { ImportPreview } from '@/components/import/ImportPreview';
import { useToast } from '@/hooks/use-toast';
import { calculerHashFichier, verifierImportExistant, creerImport, lancerParsing, previsualiserCsv } from '@/lib/import-utils';
import { exportErreursImportToCSV, exportErreursInsertionToCSV } from '@/lib/export-utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function Import() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [forceImport, setForceImport] = useState(false);
  const [useLocalEmails, setUseLocalEmails] = useState(false);
  const { toast } = useToast();

  const { data: imports } = useQuery({
    queryKey: ['imports'],
    queryFn: async () => {
      const { data } = await supabase
        .from('imports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      return data;
    },
  });

  const handleFileSelected = async (selectedFile: File) => {
    setFile(selectedFile);
    setImportSuccess(false);
    
    const hash = await calculerHashFichier(selectedFile);
    const existe = await verifierImportExistant(hash);
    
    if (existe && !forceImport) {
      toast({
        title: 'Import déjà effectué',
        description: 'Ce fichier a déjà été importé. Cochez "Forcer l\'import" pour le réimporter.',
        variant: 'destructive',
      });
      setFile(null);
      return;
    }
    
    const content = await selectedFile.text();
    const previewData = previsualiserCsv(content);
    setPreview(previewData);
  };

  const lancerImport = async () => {
    if (!file) return;
    
    setIsImporting(true);
    
    try {
      const hash = await calculerHashFichier(file);
      const importRecord = await creerImport(file.name, hash);
      
      const content = await file.text();
      await lancerParsing(importRecord.id, content, useLocalEmails);
      
      toast({
        title: 'Import réussi',
        description: 'Génération automatique des échéances en cours...',
      });

      // Générer automatiquement les échéances après l'import
      try {
        const { data, error } = await supabase.functions.invoke('generer-echeances-auto', {
          body: { force: false },
        });

        if (error) throw error;

        toast({
          title: '✅ Import et échéances terminés',
          description: `${data.echeancesGenerees} échéances créées pour ${data.dossiersAvecEcheances} dossiers`,
        });
      } catch (echeanceError: any) {
        console.error('Erreur génération échéances:', echeanceError);
        toast({
          title: '⚠️ Import réussi, échéances en erreur',
          description: 'Les données sont importées mais les échéances n\'ont pas pu être générées',
          variant: 'destructive',
        });
      }
      
      setImportSuccess(true);
      setFile(null);
      setPreview(null);
    } catch (error: any) {
      toast({
        title: 'Erreur d\'import',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };


  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-6xl font-black mb-4">IMPORT DE DONNÉES</h1>
          <p className="text-2xl font-bold text-muted-foreground">Importer vos fichiers CSV/Excel de règlements</p>
        </div>

        <div className="brutal-card p-8 mb-6 bg-gradient-to-br from-cyan-100 to-cyan-50">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-8 h-8 flex-shrink-0" />
            <div>
              <h3 className="text-2xl font-black mb-2">INFORMATIONS IMPORTANTES</h3>
              <ul className="space-y-2 font-bold">
                <li>• Format accepté : CSV, XLSX</li>
                <li>• Colonnes requises : NOM, PRENOM, EMAIL, TARIF SCOLARITE</li>
                <li>• Les colonnes TOTAL VERSEE et DIFFERENCE seront recalculées automatiquement</li>
                <li>• Les montants doivent être au format français (virgule comme séparateur décimal)</li>
                <li>• Dédoublonnage automatique basé sur l'email</li>
              </ul>
              <div className="mt-4 p-4 bg-white rounded-xl border-2 border-black">
                <h4 className="font-black text-lg mb-2">🔄 Génération automatique d'échéances</h4>
                <p className="text-sm font-bold text-muted-foreground">
                  Les échéances sont créées <strong>automatiquement</strong> après chaque import :
                </p>
                <ul className="text-sm font-bold mt-2 space-y-1">
                  <li>✓ Échéances créées pour chaque règlement (passé = payé, futur = à venir)</li>
                  <li>✓ Échéances futures générées si tarif non complété</li>
                  <li>✓ Moyen de paiement le plus fréquent utilisé</li>
                  <li>✓ Synchronisation automatique échéances ↔ règlements</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

{importSuccess && (
          <div className="brutal-card p-8 mb-6 bg-gradient-to-br from-green-100 to-green-50">
            <div className="flex items-center gap-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
              <div>
                <h3 className="text-3xl font-black">IMPORT ET ÉCHÉANCES GÉNÉRÉS</h3>
                <p className="text-lg font-bold text-muted-foreground">
                  Les données et les échéances ont été créées automatiquement
                </p>
              </div>
            </div>
          </div>
        )}

        <ImportUpload onFileSelected={handleFileSelected} />
        
        <div className="brutal-card p-6 bg-gradient-to-br from-yellow-100 to-yellow-50 mt-6 space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={forceImport}
              onChange={(e) => setForceImport(e.target.checked)}
              className="w-5 h-5 border-2 border-black rounded"
            />
            <span className="text-lg font-bold">
              Forcer l'import (ignorer le contrôle de doublon)
            </span>
          </label>
          
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={useLocalEmails}
              onChange={(e) => setUseLocalEmails(e.target.checked)}
              className="w-5 h-5 border-2 border-black rounded"
            />
            <span className="text-lg font-bold">
              Emails .local (mode développement)
            </span>
          </label>
        </div>

        {preview && (
          <div className="mt-6">
            <ImportPreview
              headers={preview.headers}
              rows={preview.rows}
              totalLines={preview.totalLines}
            />
            
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
                className="brutal-button bg-white text-black"
              >
                ANNULER
              </button>
              <button
                onClick={lancerImport}
                disabled={isImporting}
                className="brutal-button bg-primary text-primary-foreground flex items-center gap-3"
              >
                {isImporting ? (
                  <>
                    <div className="w-6 h-6 border-4 border-black border-t-transparent rounded-full animate-spin" />
                    IMPORT EN COURS...
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6" />
                    LANCER L'IMPORT
                  </>
                )}
              </button>
            </div>
          </div>
        )}

<div className="brutal-card p-8 mt-6">
          <h2 className="text-3xl font-black mb-6">IMPORTS RÉCENTS</h2>
          {!imports || imports.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📂</div>
              <p className="text-2xl font-black mb-2">AUCUN IMPORT</p>
              <p className="text-lg font-bold text-muted-foreground">Vos imports apparaîtront ici</p>
            </div>
          ) : (
            <div className="space-y-4">
              {imports.map((imp) => {
                const rapport = imp.rapport as any;
                return (
                  <div key={imp.id} className="p-6 bg-muted rounded-2xl border-2 border-black">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-black">{imp.fichier_nom}</h3>
                        <p className="text-sm font-bold text-muted-foreground">
                          {new Date(imp.created_at).toLocaleDateString('fr-FR')} à{' '}
                          {new Date(imp.created_at).toLocaleTimeString('fr-FR')}
                        </p>
                      </div>
                      <div className={`inline-block px-4 py-2 rounded-xl border-2 border-black font-black text-sm ${
                        imp.statut === 'termine' ? 'bg-green-200' :
                        imp.statut === 'en_cours' ? 'bg-yellow-200' :
                        'bg-red-200'
                      }`}>
                        {imp.statut.toUpperCase()}
                      </div>
                    </div>
                    
                    {rapport && imp.statut === 'termine' && (
                      <div className="mt-4 p-4 bg-white rounded-xl border-2 border-black">
                        <h4 className="font-black text-lg mb-3">📊 STATISTIQUES D'IMPORT</h4>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="p-3 bg-cyan-50 rounded-lg border border-black">
                            <p className="text-xs font-bold opacity-70 uppercase">Lignes CSV</p>
                            <p className="text-2xl font-black">{rapport.lignes_csv_total || 0}</p>
                          </div>
                          <div className="p-3 bg-green-50 rounded-lg border border-black">
                            <p className="text-xs font-bold opacity-70 uppercase">Élèves importés</p>
                            <p className="text-2xl font-black">{rapport.eleves_importes || 0}/{rapport.eleves_trouves || 0}</p>
                            {rapport.resume?.taux_import_eleves && (
                              <p className="text-xs font-bold text-green-600">{rapport.resume.taux_import_eleves}</p>
                            )}
                          </div>
                          <div className="p-3 bg-purple-50 rounded-lg border border-black">
                            <p className="text-xs font-bold opacity-70 uppercase">Règlements parsés</p>
                            <p className="text-2xl font-black">{rapport.reglements_importes || 0}/{rapport.reglements_trouves || 0}</p>
                            {rapport.resume?.taux_import_reglements && (
                              <p className="text-xs font-bold text-purple-600">{rapport.resume.taux_import_reglements}</p>
                            )}
                          </div>
                          <div className={`p-3 rounded-lg border border-black ${
                            rapport.reglements_perdus > 0 ? 'bg-red-50' : 'bg-green-50'
                          }`}>
                            <p className="text-xs font-bold opacity-70 uppercase">En base de données</p>
                            <p className="text-2xl font-black">{rapport.reglements_inseres_db || rapport.reglementsInseres || 0}</p>
                            {rapport.resume?.taux_insertion_db && (
                              <p className={`text-xs font-bold ${
                                rapport.reglements_perdus > 0 ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {rapport.resume.taux_insertion_db}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Alerte règlements perdus lors de l'insertion */}
                        {rapport.reglements_perdus > 0 && (
                          <div className="p-4 bg-red-50 rounded-lg border-2 border-red-400 mb-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-black text-red-700 text-lg">
                                  🚨 {rapport.reglements_perdus} RÈGLEMENTS PERDUS lors de l'insertion en base
                                </p>
                                <p className="text-sm font-bold mt-1">
                                  {rapport.reglements_a_inserer} préparés → {rapport.reglements_inseres_db} insérés = {rapport.reglements_perdus} perdus
                                </p>
                              </div>
                              {rapport.erreurs_insertion_count > 0 && (
                                <button
                                  onClick={() => exportErreursInsertionToCSV(rapport.erreurs_insertion_details || [])}
                                  className="brutal-button-sm bg-red-600 text-white flex items-center gap-2 px-3 py-1 text-xs"
                                >
                                  <Download className="w-4 h-4" />
                                  EXPORTER CSV
                                </button>
                              )}
                            </div>
                            {rapport.erreurs_insertion_count > 0 && (
                              <details className="text-sm">
                                <summary className="font-bold cursor-pointer hover:underline text-red-700">
                                  Voir les {rapport.erreurs_insertion_count} erreurs d'insertion
                                </summary>
                                <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                                  {rapport.erreurs_insertion_details?.map((err: any, idx: number) => (
                                    <div key={idx} className="text-xs font-mono bg-white p-3 rounded border border-red-300">
                                      <div className="font-bold text-red-700 mb-1">
                                        Batch {err.batch} - Index {err.index}
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div><strong>Dossier:</strong> {err.dossier_id?.substring(0,8)}...</div>
                                        <div><strong>Montant:</strong> {err.montant}€</div>
                                        <div><strong>Date:</strong> {err.date}</div>
                                        <div><strong>Moyen:</strong> {err.moyen}</div>
                                        <div className="col-span-2"><strong>Statut:</strong> {err.statut}</div>
                                      </div>
                                      <div className="mt-2 p-2 bg-red-100 rounded">
                                        <strong>Erreur:</strong> {err.erreur}
                                        {err.code && <span className="ml-2 text-red-600">({err.code})</span>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            )}
                          </div>
                        )}

                        {rapport.reglements_rejetes_count > 0 && (
                          <div className="p-3 bg-yellow-50 rounded-lg border-2 border-yellow-400">
                            <div className="flex items-start justify-between mb-2">
                              <p className="font-black text-yellow-700">
                                ⚠️ {rapport.reglements_rejetes_count} paiements importés avec statut IMPAYÉ
                              </p>
                              <button
                                onClick={() => exportErreursImportToCSV(rapport.reglements_rejetes_details || [])}
                                className="brutal-button-sm bg-yellow-600 text-white flex items-center gap-2 px-3 py-1 text-xs"
                              >
                                <Download className="w-4 h-4" />
                                EXPORTER CSV
                              </button>
                            </div>
                            <details className="text-sm">
                              <summary className="font-bold cursor-pointer hover:underline">Voir détails</summary>
                              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                                {rapport.reglements_rejetes_details?.slice(0, 10).map((rejet: any, idx: number) => (
                                  <div key={idx} className="text-xs font-mono bg-white p-2 rounded border border-yellow-300">
                                    <strong>{rejet.eleve}</strong> - RGLT{rejet.reglement_numero}: {rejet.montant} 
                                    <br />Date invalide: "{rejet.date}" - {rejet.motif}
                                  </div>
                                ))}
                                {rapport.reglements_rejetes_details?.length > 10 && (
                                  <p className="text-xs font-bold text-muted-foreground">
                                    ... et {rapport.reglements_rejetes_details.length - 10} autres
                                  </p>
                                )}
                              </div>
                            </details>
                          </div>
                        )}
                        
                        {rapport.anomaliesDetectees > 0 && (
                          <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-300">
                            <p className="font-bold">⚠️ {rapport.anomaliesDetectees} anomalie(s) détectée(s)</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
