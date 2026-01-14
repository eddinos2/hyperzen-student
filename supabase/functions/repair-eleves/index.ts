import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fonction pour extraire nom/prénom depuis l'email
function extractNameFromEmail(email: string): { nom: string; prenom: string } {
  const localPart = email.split('@')[0];
  const parts = localPart.split(/[._-]/);
  
  if (parts.length >= 2) {
    return {
      prenom: parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase(),
      nom: parts[1].toUpperCase()
    };
  } else if (parts.length === 1) {
    return {
      prenom: parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase(),
      nom: ''
    };
  }
  
  return { nom: '', prenom: '' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Vérifier l'authentification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer les élèves avec nom ou prénom vide
    const { data: elevesAReparer, error: fetchError } = await supabase
      .from('eleves')
      .select('id, email, nom, prenom')
      .or('nom.is.null,prenom.is.null,nom.eq.,prenom.eq.');

    if (fetchError) {
      console.error('Erreur lors de la récupération des élèves:', fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!elevesAReparer || elevesAReparer.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Aucun élève à réparer',
          repaired: 0 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let repairedCount = 0;
    const results = [];

    for (const eleve of elevesAReparer) {
      const extracted = extractNameFromEmail(eleve.email);
      
      const updates: any = {};
      if (!eleve.nom || eleve.nom.trim() === '') {
        updates.nom = extracted.nom || 'INCONNU';
      }
      if (!eleve.prenom || eleve.prenom.trim() === '') {
        updates.prenom = extracted.prenom || 'Inconnu';
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('eleves')
          .update(updates)
          .eq('id', eleve.id);

        if (updateError) {
          console.error(`Erreur mise à jour ${eleve.email}:`, updateError);
          results.push({ email: eleve.email, success: false, error: updateError.message });
        } else {
          repairedCount++;
          results.push({ 
            email: eleve.email, 
            success: true, 
            updates 
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `${repairedCount} élève(s) réparé(s)`,
        repaired: repairedCount,
        total: elevesAReparer.length,
        details: results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erreur globale:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
