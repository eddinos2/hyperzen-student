// Public function to return a student's email from immatriculation.
// Uses service role to bypass RLS safely on the backend. Do NOT expose service key to clients.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { immatriculation } = await req.json();

    if (!immatriculation || typeof immatriculation !== 'string') {
      return new Response(
        JSON.stringify({ error: 'immatriculation manquante' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({ error: 'Configuration serveur manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from('eleves')
      .select('email')
      .eq('immatriculation', immatriculation)
      .limit(1)
      .single();

    if (error || !data?.email) {
      return new Response(
        JSON.stringify({ error: "Aucun élève trouvé pour cette immatriculation" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ email: data.email }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'Requête invalide', details: String(e) }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});