import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { echeanceId, reglementId, action } = await req.json();

    console.log(`🔄 Synchronisation: ${action}`, { echeanceId, reglementId });

    if (action === "marquer_payee" && echeanceId && reglementId) {
      // Marquer l'échéance comme payée et lier au règlement
      const { error: updateError } = await supabase
        .from("echeances")
        .update({
          statut: "payee",
          reglement_id: reglementId,
        })
        .eq("id", echeanceId);

      if (updateError) throw updateError;

      console.log(`✅ Échéance ${echeanceId} marquée comme payée avec règlement ${reglementId}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Échéance marquée comme payée",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    if (action === "annuler_paiement" && echeanceId) {
      // Annuler le paiement de l'échéance
      const { error: updateError } = await supabase
        .from("echeances")
        .update({
          statut: "a_venir",
          reglement_id: null,
        })
        .eq("id", echeanceId);

      if (updateError) throw updateError;

      console.log(`✅ Paiement échéance ${echeanceId} annulé`);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Paiement annulé",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    if (action === "supprimer_reglement" && reglementId) {
      // Lorsqu'un règlement est supprimé, réinitialiser les échéances liées
      const { error: updateError } = await supabase
        .from("echeances")
        .update({
          statut: "a_venir",
          reglement_id: null,
        })
        .eq("reglement_id", reglementId);

      if (updateError) throw updateError;

      console.log(`✅ Échéances liées au règlement ${reglementId} réinitialisées`);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Échéances réinitialisées",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: "Action non reconnue",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );

  } catch (error: any) {
    console.error("❌ Erreur synchronisation:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
