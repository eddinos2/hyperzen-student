import { supabase } from '@/integrations/supabase/client';

export interface SoldeCalcule {
  total_verse: number;
  reste_a_payer: number;
  difference: number;
  nb_reglements: number;
  dernier_reglement: string | null;
  statut: 'a_jour' | 'en_cours' | 'en_retard' | 'crediteur';
}

export async function calculerSoldeDossier(dossierId: string): Promise<SoldeCalcule> {
  const { data: dossier } = await supabase
    .from('dossiers_scolarite')
    .select('tarif_scolarite, impaye_anterieur')
    .eq('id', dossierId)
    .single();

  const { data: reglements } = await supabase
    .from('reglements')
    .select('montant, date_reglement')
    .eq('dossier_id', dossierId)
    .eq('statut', 'valide')
    .order('date_reglement', { ascending: false });

  const total_verse = reglements?.reduce((sum, r) => sum + Number(r.montant), 0) || 0;
  const tarif_total = (dossier?.tarif_scolarite || 0) + (dossier?.impaye_anterieur || 0);
  const reste_a_payer = tarif_total - total_verse;
  const difference = (dossier?.tarif_scolarite || 0) - total_verse;

  let statut: SoldeCalcule['statut'] = 'en_cours';
  if (Math.abs(reste_a_payer) < 1) {
    statut = 'a_jour';
  } else if (reste_a_payer < -10) {
    statut = 'crediteur';
  } else if (reste_a_payer > 0) {
    statut = 'en_cours';
  }

  return {
    total_verse,
    reste_a_payer,
    difference,
    nb_reglements: reglements?.length || 0,
    dernier_reglement: reglements?.[0]?.date_reglement || null,
    statut,
  };
}

export function formaterMontant(montant: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(montant);
}

export function formaterMontantCompact(montant: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(montant);
}

export function formaterNombre(nombre: number): string {
  return new Intl.NumberFormat('fr-FR').format(nombre);
}

export function formaterDate(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
