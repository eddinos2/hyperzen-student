import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Reglement {
  id: string;
  montant: number;
  date_reglement: string;
  moyen_paiement: string;
  dossier_id: string;
}

interface Dossier {
  id: string;
  eleve_id: string;
  tarif_scolarite: number;
  impaye_anterieur: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { force = false } = await req.json();

    console.log("🚀 Début génération automatique des échéances");

    // 1. Récupérer tous les dossiers actifs
    const { data: dossiers, error: dossiersError } = await supabase
      .from("dossiers_scolarite")
      .select("id, eleve_id, tarif_scolarite, impaye_anterieur, statut_dossier")
      .eq("statut_dossier", "en_cours");

    if (dossiersError) throw dossiersError;

    console.log(`📋 ${dossiers?.length || 0} dossiers trouvés`);

    let totalGenere = 0;
    let totalSynchronise = 0;
    let totalIgnore = 0;

    for (const dossier of dossiers || []) {
      try {
        // Vérifier si des échéances existent déjà
        const { data: echeancesExistantes, error: echeancesError } = await supabase
          .from("echeances")
          .select("id")
          .eq("dossier_id", dossier.id)
          .limit(1);

        if (echeancesError) throw echeancesError;

        if (echeancesExistantes && echeancesExistantes.length > 0 && !force) {
          console.log(`⏭️ Dossier ${dossier.id} - échéances existantes, ignoré`);
          totalIgnore++;
          continue;
        }

        // Si force, supprimer les anciennes échéances
        if (force && echeancesExistantes && echeancesExistantes.length > 0) {
          await supabase
            .from("echeances")
            .delete()
            .eq("dossier_id", dossier.id);
          console.log(`🗑️ Anciennes échéances supprimées pour dossier ${dossier.id}`);
        }

        // 2. Récupérer tous les règlements validés du dossier
        const { data: reglements, error: reglementsError } = await supabase
          .from("reglements")
          .select("id, montant, date_reglement, moyen_paiement")
          .eq("dossier_id", dossier.id)
          .eq("statut", "valide")
          .order("date_reglement", { ascending: true });

        if (reglementsError) throw reglementsError;

        const totalDu = (dossier.tarif_scolarite || 0) + (dossier.impaye_anterieur || 0);
        
        if (totalDu <= 0) {
          console.log(`⏭️ Dossier ${dossier.id} - tarif à 0, ignoré`);
          totalIgnore++;
          continue;
        }

        const dateAujourdhui = new Date().toISOString().split('T')[0];

        // 3. Créer une échéance pour chaque règlement
        const echeancesACreer = [];
        let totalRegle = 0;

        for (const reglement of reglements || []) {
          totalRegle += reglement.montant;
          
          const estPasse = reglement.date_reglement <= dateAujourdhui;
          
          echeancesACreer.push({
            dossier_id: dossier.id,
            montant: reglement.montant,
            date_echeance: reglement.date_reglement,
            statut: estPasse ? "payee" : "a_venir",
            reglement_id: reglement.id,
          });
        }

        // 4. Calculer le reste à payer
        const resteAPayer = totalDu - totalRegle;

        // 5. Si reste > 0, générer des échéances futures
        if (resteAPayer > 0.01) { // Tolérance pour les arrondis
          // Déterminer le moyen de paiement le plus fréquent
          const moyensCount: Record<string, number> = {};
          (reglements || []).forEach(r => {
            moyensCount[r.moyen_paiement] = (moyensCount[r.moyen_paiement] || 0) + 1;
          });

          let moyenPlusFrequent = "Virement";
          let maxCount = 0;
          Object.entries(moyensCount).forEach(([moyen, count]) => {
            if (count > maxCount) {
              maxCount = count;
              moyenPlusFrequent = moyen;
            }
          });

          // Déterminer le nombre d'échéances restantes (max 10 mois)
          const nbEcheancesRestantes = Math.min(10, Math.ceil(resteAPayer / 500)); // Min 500€ par échéance
          const montantParEcheance = Math.round((resteAPayer / nbEcheancesRestantes) * 100) / 100;

          // Trouver la dernière date de règlement ou utiliser aujourd'hui
          let derniereDate = new Date();
          if (reglements && reglements.length > 0) {
            derniereDate = new Date(reglements[reglements.length - 1].date_reglement);
          }

          // Générer les échéances futures (1 par mois)
          for (let i = 0; i < nbEcheancesRestantes; i++) {
            const dateEcheance = new Date(derniereDate);
            dateEcheance.setMonth(dateEcheance.getMonth() + i + 1);
            dateEcheance.setDate(15); // 15 du mois
            
            const montant = i === nbEcheancesRestantes - 1
              ? Math.round((resteAPayer - (montantParEcheance * (nbEcheancesRestantes - 1))) * 100) / 100
              : montantParEcheance;

            echeancesACreer.push({
              dossier_id: dossier.id,
              montant: montant,
              date_echeance: dateEcheance.toISOString().split('T')[0],
              statut: "a_venir",
              reglement_id: null,
            });
          }

          console.log(`📅 ${nbEcheancesRestantes} échéances futures générées pour ${resteAPayer.toFixed(2)}€`);
        }

        // 6. Insérer toutes les échéances
        if (echeancesACreer.length > 0) {
          const { error: insertError } = await supabase
            .from("echeances")
            .insert(echeancesACreer);

          if (insertError) {
            console.error(`❌ Erreur insertion échéances dossier ${dossier.id}:`, insertError);
            continue;
          }

          console.log(`✅ ${echeancesACreer.length} échéances créées pour dossier ${dossier.id}`);
          totalGenere += echeancesACreer.length;
          totalSynchronise++;
        }

      } catch (dossierError) {
        console.error(`❌ Erreur traitement dossier ${dossier.id}:`, dossierError);
        continue;
      }
    }

    // Mettre à jour automatiquement les statuts des échéances
    console.log("🔄 Mise à jour des statuts d'échéances...");
    const { data: updateResult, error: updateError } = await supabase.rpc('marquer_echeances_retard');
    
    if (updateError) {
      console.error("⚠️ Erreur mise à jour statuts:", updateError);
    } else {
      console.log(`✅ ${updateResult || 0} échéances marquées en retard`);
    }

    const result = {
      success: true,
      dossiersTraites: dossiers?.length || 0,
      echeancesGenerees: totalGenere,
      dossiersAvecEcheances: totalSynchronise,
      dossiersIgnores: totalIgnore,
      echeancesEnRetard: updateResult || 0,
      message: `${totalGenere} échéances générées pour ${totalSynchronise} dossiers`,
    };

    console.log("✅ Génération terminée:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("❌ Erreur génération échéances:", error);
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
