import { supabase } from '@/integrations/supabase/client';

export interface StatutPaiementParams {
  totalDu: number;
  totalVerse: number;
  duEchu: number;
  nbEcheancesRetard: number;
  dernierReglement: string | null;
  dateReference?: Date;
}

export type StatutPaiement = 'À jour' | 'En cours' | 'En retard' | 'Impayé total' | 'Créditeur' | 'Non renseigné';

/**
 * Calcule le statut de paiement d'un dossier de manière unifiée
 * Logique robuste et cohérente utilisée partout dans l'application
 */
export function computeStatutPaiement(params: StatutPaiementParams): StatutPaiement {
  const { totalDu, totalVerse, duEchu, nbEcheancesRetard, dernierReglement, dateReference = new Date() } = params;

  // Exclure les dossiers sans tarif
  if (totalDu <= 0) {
    return 'Non renseigné';
  }

  const reste = totalDu - totalVerse;
  const tauxPaiement = totalDu > 0 ? (totalVerse / totalDu) * 100 : 0;

  // Ordre de priorité strict :
  
  // 1. Créditeur : a payé plus que le tarif
  if (reste < -10) {
    return 'Créditeur';
  }

  // 2. À jour : solde proche de zéro
  if (Math.abs(reste) < 1) {
    return 'À jour';
  }

  // 3. Impayé total : n'a RIEN payé
  if (totalVerse === 0) {
    // Si des échéances existent et sont échues/retard, c'est clairement impayé total
    if (duEchu > 0 || nbEcheancesRetard > 0) {
      return 'Impayé total';
    }
    // Sinon, calculer en fonction de l'avancement théorique de l'année scolaire
    // Année 2025-2026: septembre 2025 à juin 2026 (10 mois)
    const debutAnnee = new Date('2025-09-01');
    const finAnnee = new Date('2026-06-30');
    const maintenant = dateReference;
    
    // Si on est dans la période scolaire et qu'on devrait avoir payé quelque chose
    if (maintenant >= debutAnnee && maintenant <= finAnnee) {
      const dureeTotal = finAnnee.getTime() - debutAnnee.getTime();
      const dureeEcoulee = maintenant.getTime() - debutAnnee.getTime();
      const pourcentageEcoule = Math.max(0, Math.min(1, dureeEcoulee / dureeTotal));
      
      // Si plus de 10% de l'année est écoulée sans paiement → impayé total
      if (pourcentageEcoule > 0.1) {
        return 'Impayé total';
      }
    }
    // Sinon avant le début de l'année, c'est juste "En cours"
    return 'En cours';
  }

  // 4. En retard : basé sur échéances ou calcul théorique
  // 4a. Échéances explicitement en retard
  if (nbEcheancesRetard > 0) {
    return 'En retard';
  }

  // 4b. A payé moins que ce qui était échu
  if (duEchu > 0 && totalVerse + 1 < duEchu) {
    return 'En retard';
  }

  // 4c. Pas de paiement depuis plus de 60 jours ET il devrait avoir payé quelque chose
  if (dernierReglement) {
    const dernierPaiement = new Date(dernierReglement);
    const joursSansPaiement = Math.floor(
      (dateReference.getTime() - dernierPaiement.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (joursSansPaiement > 60 && duEchu > 0) {
      return 'En retard';
    }
  }

  // 4d. Si pas d'échéances, utiliser un calcul théorique basé sur l'avancement de l'année
  if (duEchu === 0 && nbEcheancesRetard === 0) {
    const debutAnnee = new Date('2025-09-01');
    const finAnnee = new Date('2026-06-30');
    const maintenant = dateReference;
    
    if (maintenant >= debutAnnee && maintenant <= finAnnee) {
      const dureeTotal = finAnnee.getTime() - debutAnnee.getTime();
      const dureeEcoulee = maintenant.getTime() - debutAnnee.getTime();
      const pourcentageEcoule = Math.max(0, Math.min(1, dureeEcoulee / dureeTotal));
      const montantTheorique = totalDu * pourcentageEcoule;
      
      // Si on a payé moins de 70% du montant théoriquement attendu → en retard
      if (totalVerse < montantTheorique * 0.7) {
        return 'En retard';
      }
    }
  }

  // 5. En cours : a déjà payé une partie, pas considéré en retard
  return 'En cours';
}

/**
 * Récupère les données agrégées pour calculer le statut d'un dossier
 */
export async function getDossierStatutData(dossierId: string, dateReference: Date = new Date()) {
  // Récupérer le dossier
  const { data: dossier } = await supabase
    .from('dossiers_scolarite')
    .select('tarif_scolarite, impaye_anterieur')
    .eq('id', dossierId)
    .single();

  if (!dossier) {
    return null;
  }

  const totalDu = (dossier.tarif_scolarite || 0) + (dossier.impaye_anterieur || 0);

  // Récupérer les règlements valides
  const { data: reglements } = await supabase
    .from('reglements')
    .select('montant, date_reglement')
    .eq('dossier_id', dossierId)
    .eq('statut', 'valide')
    .order('date_reglement', { ascending: false });

  const totalVerse = reglements?.reduce((sum, r) => sum + Number(r.montant), 0) || 0;
  const dernierReglement = reglements?.[0]?.date_reglement || null;

  // Récupérer les échéances échues
  const { data: echeancesEchues } = await supabase
    .from('echeances')
    .select('montant')
    .eq('dossier_id', dossierId)
    .lte('date_echeance', dateReference.toISOString().split('T')[0]);

  const duEchu = echeancesEchues?.reduce((sum, e) => sum + Number(e.montant), 0) || 0;

  // Compter les échéances en retard
  const { count: nbEcheancesRetard } = await supabase
    .from('echeances')
    .select('id', { count: 'exact', head: true })
    .eq('dossier_id', dossierId)
    .eq('statut', 'en_retard');

  return {
    totalDu,
    totalVerse,
    duEchu,
    nbEcheancesRetard: nbEcheancesRetard || 0,
    dernierReglement,
  };
}

/**
 * Calcule le statut de paiement d'un dossier (fonction complète)
 */
export async function calculerStatutDossier(dossierId: string, dateReference: Date = new Date()): Promise<StatutPaiement> {
  const data = await getDossierStatutData(dossierId, dateReference);
  
  if (!data) {
    return 'Non renseigné';
  }

  return computeStatutPaiement({ ...data, dateReference });
}
