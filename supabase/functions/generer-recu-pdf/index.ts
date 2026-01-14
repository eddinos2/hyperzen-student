import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reglementId } = await req.json();
    console.log('Génération du reçu pour le règlement:', reglementId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Récupérer le modèle de reçu actif
    const { data: modele } = await supabaseClient
      .from('modeles_documents')
      .select('*')
      .eq('type_modele', 'recu')
      .eq('actif', true)
      .maybeSingle();

    // Fetch reglement data with related information
    const { data: reglement, error: reglementError } = await supabaseClient
      .from('reglements')
      .select(`
        *,
        dossiers_scolarite (
          annee_scolaire,
          eleves (
            nom,
            prenom,
            email,
            adresse
          ),
          campus (nom),
          filieres (nom)
        )
      `)
      .eq('id', reglementId)
      .single();

    if (reglementError) throw reglementError;

    // Vérifier que le règlement est validé
    if (reglement.statut !== 'valide') {
      return new Response(
        JSON.stringify({ 
          error: 'Ce règlement n\'est pas validé. Impossible de générer un reçu.',
          statut: reglement.statut 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const eleve = reglement.dossiers_scolarite.eleves;
    const numeroRecu = `RECU-${new Date().getFullYear()}-${reglementId.substring(0, 8).toUpperCase()}`;

    // Format montant in French format
    const montantFormate = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(reglement.montant);

    const dateFormatee = new Date(reglement.date_reglement).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    // Utiliser le modèle personnalisé si disponible, sinon fallback au modèle par défaut
    let htmlContent: string;

    if (modele && modele.contenu_html) {
      // Modèle personnalisé
      const variables = (modele.variables as any) || {};
      
      htmlContent = modele.contenu_html
        .replace(/{{logo_url}}/g, variables.logo_url || '')
        .replace(/{{recu_numero}}/g, numeroRecu)
        .replace(/{{eleve_nom}}/g, eleve.nom)
        .replace(/{{eleve_prenom}}/g, eleve.prenom)
        .replace(/{{immatriculation}}/g, eleve.immatriculation || '')
        .replace(/{{date_paiement}}/g, dateFormatee)
        .replace(/{{montant}}/g, montantFormate)
        .replace(/{{moyen_paiement}}/g, reglement.moyen_paiement)
        .replace(/{{numero_piece}}/g, reglement.numero_piece || '')
        .replace(/{{annee_scolaire}}/g, reglement.dossiers_scolarite.annee_scolaire)
        .replace(/{{campus_nom}}/g, reglement.dossiers_scolarite.campus?.nom || '')
        .replace(/{{etablissement_nom}}/g, variables.etablissement_nom || 'École')
        .replace(/{{etablissement_adresse}}/g, variables.etablissement_adresse || '');
    } else {
      // Modèle par défaut
      htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 2cm; }
    body { 
      font-family: Arial, sans-serif; 
      line-height: 1.6;
      color: #000;
    }
    .header {
      text-align: center;
      border-bottom: 4px solid #000;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 36px;
      font-weight: 900;
      margin: 0;
    }
    .recu-info {
      background: #f0f0f0;
      border: 3px solid #000;
      padding: 20px;
      margin: 20px 0;
    }
    .recu-info h2 {
      margin: 0 0 15px 0;
      font-size: 24px;
      font-weight: bold;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 150px 1fr;
      gap: 10px;
      margin: 20px 0;
    }
    .info-label {
      font-weight: bold;
    }
    .montant {
      font-size: 32px;
      font-weight: 900;
      text-align: center;
      background: #ffeb3b;
      border: 4px solid #000;
      padding: 20px;
      margin: 30px 0;
    }
    .footer {
      margin-top: 50px;
      text-align: center;
      font-size: 12px;
      border-top: 2px solid #000;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>HYPERZEN</h1>
    <p style="font-weight: bold; font-size: 18px;">REÇU DE PAIEMENT</p>
  </div>

  <div class="recu-info">
    <h2>N° ${numeroRecu}</h2>
    <p>Date d'émission : ${dateFormatee}</p>
  </div>

  <div class="info-grid">
    <div class="info-label">Étudiant :</div>
    <div>${eleve.nom} ${eleve.prenom}</div>
    
    <div class="info-label">Email :</div>
    <div>${eleve.email}</div>
    
    ${eleve.adresse ? `
    <div class="info-label">Adresse :</div>
    <div>${eleve.adresse}</div>
    ` : ''}
    
    <div class="info-label">Année scolaire :</div>
    <div>${reglement.dossiers_scolarite.annee_scolaire}</div>
    
    <div class="info-label">Date règlement :</div>
    <div>${dateFormatee}</div>
    
    <div class="info-label">Moyen de paiement :</div>
    <div>${reglement.moyen_paiement}</div>
    
    ${reglement.numero_piece ? `
    <div class="info-label">N° de pièce :</div>
    <div>${reglement.numero_piece}</div>
    ` : ''}
  </div>

  <div class="montant">
    MONTANT RÉGLÉ : ${montantFormate}
  </div>

  ${reglement.commentaire ? `
  <div style="margin: 20px 0;">
    <strong>Commentaire :</strong>
    <p>${reglement.commentaire}</p>
  </div>
  ` : ''}

  <div class="footer">
    <p>Ce document tient lieu de reçu officiel de paiement.</p>
    <p>Conservez-le précieusement pour vos archives.</p>
  </div>
</body>
</html>
      `;
    }

    // Enregistrer le reçu dans la base de données
    const { error: recuError } = await supabaseClient
      .from('recus')
      .upsert({
        reglement_id: reglementId,
        numero_recu: numeroRecu,
        statut: 'valide',
      }, {
        onConflict: 'reglement_id'
      });

    if (recuError) {
      console.error('Erreur lors de l\'enregistrement du reçu:', recuError);
      // Ne pas bloquer la génération si l'enregistrement échoue
    }

    // For now, return the HTML directly
    // In production, you would use a PDF generation library
    return new Response(
      JSON.stringify({ 
        html: htmlContent,
        numeroRecu,
        message: 'HTML généré avec succès. Utilisez la fonction d\'impression du navigateur pour générer le PDF.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
