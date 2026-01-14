import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Démarrage des notifications d\'échéances proches');

    // Date dans 7 jours
    const dateProche = new Date();
    dateProche.setDate(dateProche.getDate() + 7);

    // Récupérer les échéances à venir dans les 7 prochains jours
    const { data: echeances, error: echeancesError } = await supabase
      .from('echeances')
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
      .eq('statut', 'a_venir')
      .gte('date_echeance', new Date().toISOString().split('T')[0])
      .lte('date_echeance', dateProche.toISOString().split('T')[0]);

    if (echeancesError) {
      console.error('Erreur récupération échéances:', echeancesError);
      throw echeancesError;
    }

    console.log(`${echeances?.length || 0} échéances proches trouvées`);

    const notificationsEnvoyees = [];

    for (const echeance of echeances || []) {
      const dossier = echeance.dossiers_scolarite;
      if (!dossier || !dossier.eleves) continue;

      const eleve = dossier.eleves;

      // Vérifier les préférences de notification de l'élève
      const { data: preferences } = await supabase
        .from('preferences_notifications')
        .select('rappel_avant_echeance, email_actif')
        .eq('user_id', eleve.user_id)
        .single();

      // Si pas de préférences ou si les rappels sont activés
      if (!preferences || (preferences.rappel_avant_echeance && preferences.email_actif)) {
        // Envoyer la notification
        await supabase.functions.invoke('envoyer-notification-email', {
          body: {
            to: eleve.email,
            type: 'rappel_echeance',
            data: {
              nom: eleve.nom,
              prenom: eleve.prenom,
              montant: echeance.montant,
              dateEcheance: echeance.date_echeance
            }
          }
        });

        notificationsEnvoyees.push({
          eleveEmail: eleve.email,
          montant: echeance.montant,
          dateEcheance: echeance.date_echeance
        });

        console.log(`Notification envoyée à ${eleve.nom} ${eleve.prenom} pour échéance du ${echeance.date_echeance}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsEnvoyees: notificationsEnvoyees.length,
        details: notificationsEnvoyees
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error: any) {
    console.error('Erreur notifications échéances:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
