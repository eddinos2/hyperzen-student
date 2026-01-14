import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Vérifier que l'utilisateur est admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Utilisateur non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier que l'utilisateur est admin
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: 'Accès refusé: droits admin requis' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🧹 Début du nettoyage complet de la base...');

    // Étape 1: Récupérer tous les user_ids des élèves ET profils AVANT de supprimer
    const { data: elevesAvecComptes, error: elevesError } = await supabase
      .from('eleves')
      .select('user_id')
      .not('user_id', 'is', null);

    if (elevesError) {
      console.error('Erreur récupération élèves:', elevesError);
    }

    // Récupérer aussi les utilisateurs ayant le rôle "eleve" (même si pas dans la table eleves)
    const { data: profilsEleves } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('role', 'eleve');

    const { data: rolesEleves } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'eleve');

    const userIdsSet = new Set<string>();
    (elevesAvecComptes || []).forEach((e: any) => e.user_id && userIdsSet.add(e.user_id));
    (profilsEleves || []).forEach((p: any) => p.user_id && userIdsSet.add(p.user_id));
    (rolesEleves || []).forEach((r: any) => r.user_id && userIdsSet.add(r.user_id));

    const userIdsToDelete = Array.from(userIdsSet);
    console.log(`📋 ${userIdsToDelete.length} comptes utilisateurs élèves à supprimer`);

    // Étape 2: Supprimer les données de la base
    console.log('🗑️ Suppression des données de la base...');
    await supabase.from('eleves_credentials').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('recus').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('echeances').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('reglements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('anomalies').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('risques_financiers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('relances').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('justificatifs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('tickets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('dossiers_scolarite').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('eleves').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('imports').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('✅ Données de la base supprimées');

    // Étape 2.5: Supprimer les profils élèves
    console.log('🗑️ Suppression des profils élèves...');
    for (const userId of userIdsToDelete) {
      await supabase.from('profiles').delete().eq('user_id', userId);
      await supabase.from('user_roles').delete().eq('user_id', userId);
    }
    console.log('✅ Profils élèves supprimés');

    // Étape 3: Supprimer les comptes auth des élèves
    let comptesSupprimes = 0;
    let erreursComptes = 0;

    for (const userId of userIdsToDelete) {
      try {
        const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);
        
        if (deleteAuthError) {
          console.error(`❌ Erreur suppression compte ${userId}:`, deleteAuthError);
          erreursComptes++;
        } else {
          comptesSupprimes++;
          console.log(`✅ Compte ${userId} supprimé`);
        }
      } catch (error) {
        console.error(`❌ Erreur critique suppression compte ${userId}:`, error);
        erreursComptes++;
      }
    }

    console.log(`🎉 Nettoyage terminé: ${comptesSupprimes} comptes supprimés, ${erreursComptes} erreurs`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Base nettoyée avec succès',
        comptesSupprimes,
        erreursComptes,
        totalComptes: userIdsToDelete.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erreur globale:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});