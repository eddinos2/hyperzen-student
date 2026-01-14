import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  reglementId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reglementId }: NotificationRequest = await req.json();

    if (!reglementId) {
      throw new Error('reglementId est requis');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Envoi notification confirmation paiement pour:', reglementId);

    // Récupérer les infos du règlement
    const { data: reglement, error: reglementError } = await supabase
      .from('reglements')
      .select(`
        *,
        dossiers_scolarite!inner(
          id,
          eleves!inner(
            nom,
            prenom,
            email,
            user_id
          )
        )
      `)
      .eq('id', reglementId)
      .single();

    if (reglementError || !reglement) {
      console.error('Erreur récupération règlement:', reglementError);
      throw reglementError || new Error('Règlement non trouvé');
    }

    const dossier = reglement.dossiers_scolarite;
    if (!dossier || !dossier.eleves) {
      throw new Error('Informations élève non trouvées');
    }

    const eleve = dossier.eleves;

    // Vérifier les préférences de notification
    const { data: preferences } = await supabase
      .from('preferences_notifications')
      .select('confirmation_reglement, email_actif')
      .eq('user_id', eleve.user_id)
      .single();

    // Si pas de préférences ou si les confirmations sont activées
    if (!preferences || (preferences.confirmation_reglement && preferences.email_actif)) {
      // Calculer le nouveau solde
      const { data: soldeData } = await supabase
        .rpc('calculer_solde_dossier', { dossier_uuid: dossier.id })
        .single();

      const solde = soldeData as any;

      // Envoyer l'email de confirmation
      await supabase.functions.invoke('envoyer-notification-email', {
        body: {
          to: eleve.email,
          type: 'confirmation_paiement',
          data: {
            nom: eleve.nom,
            prenom: eleve.prenom,
            montant: reglement.montant,
            dateReglement: reglement.date_reglement,
            moyenPaiement: reglement.moyen_paiement,
            numeroRecu: reglement.numero_piece || 'N/A',
            nouveauSolde: solde?.reste_a_payer || 0
          }
        }
      });

      console.log(`Confirmation envoyée à ${eleve.email} pour paiement de ${reglement.montant} MAD`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Notification envoyée',
          destinataire: eleve.email
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notification désactivée par les préférences utilisateur'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error: any) {
    console.error('Erreur notification confirmation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
