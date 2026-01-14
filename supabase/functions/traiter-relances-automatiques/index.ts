import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RelanceData {
  dossierId: string;
  eleveEmail: string;
  eleveNom: string;
  elevePrenom: string;
  montantDu: number;
  niveauRelance: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Démarrage du traitement des relances automatiques');

    // Récupérer les dossiers à risque élevé ou critique
    const { data: dossiersRisque, error: risqueError } = await supabase
      .from('risques_financiers')
      .select(`
        *,
        dossiers_scolarite!inner(
          id,
          eleves!inner(
            nom,
            prenom,
            email
          )
        )
      `)
      .in('niveau_risque', ['eleve', 'critique'])
      .order('date_evaluation', { ascending: false });

    if (risqueError) {
      console.error('Erreur récupération risques:', risqueError);
      throw risqueError;
    }

    console.log(`${dossiersRisque?.length || 0} dossiers à risque trouvés`);

    const relancesCreees: RelanceData[] = [];

    for (const risque of dossiersRisque || []) {
      const dossier = risque.dossiers_scolarite;
      if (!dossier || !dossier.eleves) continue;

      // Calculer le solde du dossier
      const { data: soldeData } = await supabase
        .rpc('calculer_solde_dossier', { dossier_uuid: dossier.id })
        .single();

      const solde = soldeData as any;
      if (!solde || solde.reste_a_payer <= 0) continue;

      // Vérifier s'il y a déjà eu une relance récente (moins de 7 jours)
      const { data: derniereRelance } = await supabase
        .from('relances')
        .select('date_envoi, niveau_relance')
        .eq('dossier_id', dossier.id)
        .order('date_envoi', { ascending: false })
        .limit(1)
        .single();

      const maintenant = new Date();
      let doitEnvoyerRelance = false;
      let niveauRelance = 1;

      if (!derniereRelance) {
        doitEnvoyerRelance = true;
        niveauRelance = 1;
      } else {
        const dernierEnvoi = new Date(derniereRelance.date_envoi);
        const joursDiff = Math.floor((maintenant.getTime() - dernierEnvoi.getTime()) / (1000 * 60 * 60 * 24));
        
        if (joursDiff >= 7) {
          doitEnvoyerRelance = true;
          niveauRelance = Math.min(derniereRelance.niveau_relance + 1, 3);
        }
      }

      if (doitEnvoyerRelance) {
        // Créer la relance
        const { error: insertError } = await supabase
          .from('relances')
          .insert({
            dossier_id: dossier.id,
            type_relance: 'automatique',
            niveau_relance: niveauRelance,
            montant_du: solde.reste_a_payer,
            canal: 'email',
            statut: 'envoyee',
            message: genererMessageRelance(niveauRelance, solde.reste_a_payer, dossier.eleves.nom, dossier.eleves.prenom)
          });

        if (insertError) {
          console.error('Erreur création relance:', insertError);
          continue;
        }

        // Envoyer l'email via la fonction existante
        await supabase.functions.invoke('envoyer-notification-email', {
          body: {
            to: dossier.eleves.email,
            type: 'retard_paiement',
            data: {
              nom: dossier.eleves.nom,
              prenom: dossier.eleves.prenom,
              montant: solde.reste_a_payer,
              niveauRelance
            }
          }
        });

        relancesCreees.push({
          dossierId: dossier.id,
          eleveEmail: dossier.eleves.email,
          eleveNom: dossier.eleves.nom,
          elevePrenom: dossier.eleves.prenom,
          montantDu: solde.reste_a_payer,
          niveauRelance
        });

        console.log(`Relance niveau ${niveauRelance} créée pour ${dossier.eleves.nom} ${dossier.eleves.prenom}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        relancesCreees: relancesCreees.length,
        details: relancesCreees
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error: any) {
    console.error('Erreur traitement relances:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

function genererMessageRelance(niveau: number, montant: number, nom: string, prenom: string): string {
  const messages = {
    1: `Bonjour ${prenom} ${nom},\n\nNous vous informons qu'un solde de ${montant.toLocaleString('fr-FR')} MAD reste dû sur votre dossier de scolarité.\n\nMerci de régulariser votre situation dans les plus brefs délais.\n\nCordialement,\nLe service financier`,
    2: `Bonjour ${prenom} ${nom},\n\nNous vous relançons concernant le solde impayé de ${montant.toLocaleString('fr-FR')} MAD sur votre dossier.\n\nVeuillez procéder au règlement dans les 7 jours pour éviter toute mesure complémentaire.\n\nCordialement,\nLe service financier`,
    3: `Bonjour ${prenom} ${nom},\n\nMalgré nos précédentes relances, votre solde de ${montant.toLocaleString('fr-FR')} MAD reste impayé.\n\nCeci constitue notre dernière relance avant mise en demeure. Merci de régulariser immédiatement votre situation.\n\nCordialement,\nLe service financier`
  };

  return messages[niveau as keyof typeof messages] || messages[1];
}
