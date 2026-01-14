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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { eleveId } = await req.json();

    if (!eleveId) {
      return new Response(
        JSON.stringify({ error: 'ID élève requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🗑️ Suppression complète de l'élève: ${eleveId}`);

    // Récupérer l'élève et son user_id
    const { data: eleve, error: eleveError } = await supabase
      .from('eleves')
      .select('id, nom, prenom, email, user_id')
      .eq('id', eleveId)
      .single();

    if (eleveError || !eleve) {
      return new Response(
        JSON.stringify({ error: 'Élève non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer les dossiers pour supprimer les données liées
    const { data: dossiers } = await supabase
      .from('dossiers_scolarite')
      .select('id')
      .eq('eleve_id', eleveId);

    const dossierIds = dossiers?.map(d => d.id) || [];

    // Supprimer les données liées aux dossiers
    for (const dossierId of dossierIds) {
      await supabase.from('recus').delete().eq('reglement_id', dossierId);
      await supabase.from('echeances').delete().eq('dossier_id', dossierId);
      await supabase.from('reglements').delete().eq('dossier_id', dossierId);
      await supabase.from('anomalies').delete().eq('dossier_id', dossierId);
      await supabase.from('risques_financiers').delete().eq('dossier_id', dossierId);
      await supabase.from('relances').delete().eq('dossier_id', dossierId);
    }

    // Supprimer les dossiers
    await supabase.from('dossiers_scolarite').delete().eq('eleve_id', eleveId);

    // Supprimer les credentials
    await supabase.from('eleves_credentials').delete().eq('eleve_id', eleveId);

    // Supprimer les justificatifs
    await supabase.from('justificatifs').delete().eq('eleve_id', eleveId);

    // Supprimer les tickets
    await supabase.from('tickets').delete().eq('eleve_id', eleveId);

    // Supprimer l'élève
    const { error: deleteEleveError } = await supabase
      .from('eleves')
      .delete()
      .eq('id', eleveId);

    if (deleteEleveError) {
      console.error('Erreur suppression élève:', deleteEleveError);
      throw deleteEleveError;
    }

    console.log('✅ Données de l\'élève supprimées');

    // Supprimer le profil et les rôles
    let profilSupprime = false;
    if (eleve.user_id) {
      const { error: deleteProfileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', eleve.user_id);
      
      if (!deleteProfileError) {
        profilSupprime = true;
        console.log(`✅ Profil ${eleve.user_id} supprimé`);
      }

      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', eleve.user_id);
    }

    // Supprimer le compte auth si présent
    let compteAuthSupprime = false;
    if (eleve.user_id) {
      try {
        const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(eleve.user_id);
        
        if (deleteAuthError) {
          console.error('Erreur suppression compte auth:', deleteAuthError);
        } else {
          compteAuthSupprime = true;
          console.log(`✅ Compte auth ${eleve.user_id} supprimé`);
        }
      } catch (error) {
        console.error('Erreur critique suppression compte:', error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Élève ${eleve.prenom} ${eleve.nom} supprimé complètement`,
        compteAuthSupprime,
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