import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RelanceRequest {
  eleves: Array<{
    id: string;
    email: string;
    nom: string;
    prenom: string;
    telephone?: string;
    resteAPayer: number;
    nbEcheancesRetard: number;
  }>;
  type: 'email' | 'sms';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eleves, type }: RelanceRequest = await req.json();

    console.log(`Envoi de ${type} à ${eleves.length} élève(s) en retard`);

    if (type !== 'email') {
      return new Response(
        JSON.stringify({ 
          error: 'Seul l\'envoi par email est supporté pour le moment',
          success: false 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY non configurée');
    }

    // Initialiser Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const results = {
      success: 0,
      errors: 0,
      details: [] as Array<{ eleveId: string; status: string; error?: string }>,
    };

    // Récupérer le modèle d'email par défaut (niveau 1) s'il existe
    const { data: modele } = await supabaseClient
      .from('modeles_documents')
      .select('*')
      .eq('type_modele', 'email_relance')
      .eq('actif', true)
      .limit(1)
      .single();

    console.log('Modèle trouvé:', modele ? 'Oui' : 'Non (utilisation du template par défaut)');

    // Fonction pour remplacer les variables dans le template
    const remplacerVariables = (template: string, eleve: any): string => {
      return template
        .replace(/\{nom\}/g, eleve.nom)
        .replace(/\{prenom\}/g, eleve.prenom)
        .replace(/\{montant\}/g, new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: 'EUR',
        }).format(eleve.resteAPayer))
        .replace(/\{immatriculation\}/g, eleve.id || '');
    };

    // Envoyer un email à chaque élève
    for (const eleve of eleves) {
      try {
        console.log(`Envoi email à ${eleve.nom} ${eleve.prenom} (${eleve.email})`);

        const montantFormate = new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: 'EUR',
        }).format(eleve.resteAPayer);

        // Utiliser le modèle personnalisé s'il existe, sinon utiliser le template par défaut
        let subject = '🔴 RAPPEL : Règlement en retard - HYPERZEN';
        let htmlContent = '';
        
        if (modele && modele.variables && modele.contenu_html) {
          // Utiliser le modèle personnalisé
          const variables = modele.variables as any;
          subject = remplacerVariables(variables?.sujet || subject, eleve);
          htmlContent = remplacerVariables(modele.contenu_html, eleve);
        } else {
          // Utiliser le template par défaut
          htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); color: #ffffff; padding: 40px 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 42px; font-weight: 900; letter-spacing: 2px;">HYPERZEN</h1>
                <p style="margin: 10px 0 0; font-size: 14px; font-weight: 600; opacity: 0.9;">GESTION DE SCOLARITÉ</p>
              </div>

              <!-- Content -->
              <div style="padding: 40px 30px; background: #ffffff;">
                <h2 style="color: #000000; font-size: 24px; font-weight: bold; margin: 0 0 20px;">
                  Bonjour ${eleve.prenom} ${eleve.nom},
                </h2>
                
                <p style="font-size: 16px; line-height: 1.8; color: #333333; margin: 0 0 20px;">
                  Nous avons constaté que votre dossier de scolarité présente un retard de paiement.
                </p>

                <!-- Alert Box -->
                <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); padding: 20px; border-radius: 12px; border-left: 6px solid #ef4444; margin: 30px 0;">
                  <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="font-size: 32px;">⚠️</div>
                    <div>
                      <p style="margin: 0; font-size: 18px; font-weight: bold; color: #991b1b;">
                        Règlement en retard
                      </p>
                      <p style="margin: 5px 0 0; font-size: 14px; color: #7f1d1d;">
                        ${eleve.nbEcheancesRetard} échéance(s) non réglée(s)
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Amount Box -->
                <div style="background: #f9fafb; padding: 25px; border-radius: 12px; border: 4px solid #000000; margin: 30px 0; text-align: center;">
                  <p style="margin: 0 0 10px; font-size: 14px; font-weight: bold; text-transform: uppercase; color: #666666; letter-spacing: 1px;">
                    MONTANT TOTAL DÛ
                  </p>
                  <p style="margin: 0; font-size: 48px; font-weight: 900; color: #ef4444; letter-spacing: -1px;">
                    ${montantFormate}
                  </p>
                </div>

                <div style="background: #fffbeb; padding: 20px; border-radius: 12px; border-left: 4px solid #f59e0b; margin: 30px 0;">
                  <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #78350f;">
                    <strong>⏰ Action requise :</strong> Merci de régulariser votre situation dans les plus brefs délais pour éviter toute suspension de votre accès aux services.
                  </p>
                </div>

                <p style="font-size: 15px; line-height: 1.8; color: #666666; margin: 30px 0 0;">
                  Pour effectuer votre règlement ou consulter le détail de votre compte, connectez-vous à votre espace élève ou contactez notre service administratif.
                </p>

                <!-- CTA Button -->
                <div style="text-align: center; margin: 40px 0;">
                  <a href="${Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '')}/portail-eleve" 
                     style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; font-weight: 900; font-size: 16px; border-radius: 12px; border: 4px solid #000000; box-shadow: 4px 4px 0px 0px rgba(0,0,0,1); text-transform: uppercase; letter-spacing: 1px;">
                    ACCÉDER À MON ESPACE
                  </a>
                </div>

                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0 0;">
                  <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.6;">
                    <strong style="color: #374151;">📞 Besoin d'aide ?</strong><br>
                    Notre équipe administrative reste à votre disposition pour tout arrangement de paiement ou question concernant votre dossier.
                  </p>
                </div>
              </div>

              <!-- Footer -->
              <div style="background: #000000; color: #ffffff; padding: 30px 20px; text-align: center;">
                <p style="margin: 0 0 10px; font-size: 16px; font-weight: bold;">HYPERZEN</p>
                <p style="margin: 0; font-size: 12px; opacity: 0.7;">
                  Gestion de scolarité • ${new Date().getFullYear()}
                </p>
              </div>
            </div>
          </body>
          </html>
        `;
        }

        // Envoyer l'email via Resend
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'HYPERZEN <onboarding@resend.dev>',
            to: [eleve.email],
            subject,
            html: htmlContent,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Erreur Resend pour', eleve.email, ':', errorData);
          throw new Error(`Erreur Resend: ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        console.log('Email envoyé avec succès à', eleve.email, '- ID:', data?.id);

        // Créer une relance dans la base de données
        const { data: dossierData } = await supabaseClient
          .from('dossiers_scolarite')
          .select('id')
          .eq('eleve_id', eleve.id)
          .single();

        if (dossierData) {
          await supabaseClient.from('relances').insert({
            dossier_id: dossierData.id,
            type_relance: 'retard',
            niveau_relance: 1,
            montant_du: eleve.resteAPayer,
            canal: 'email',
            statut: 'envoyee',
            message: `Email de relance automatique envoyé - ${eleve.nbEcheancesRetard} échéance(s) en retard`,
          });
        }

        // Logger la notification
        await supabaseClient.from('notifications_envoyees').insert({
          type_notification: 'retard',
          canal: 'email',
          sujet: subject,
          contenu: htmlContent,
          statut_envoi: 'envoye',
        });

        results.success++;
        results.details.push({
          eleveId: eleve.id,
          status: 'success',
        });
      } catch (error) {
        console.error(`Erreur pour ${eleve.nom} ${eleve.prenom}:`, error);
        results.errors++;
        results.details.push({
          eleveId: eleve.id,
          status: 'error',
          error: (error as Error).message,
        });
      }
    }

    console.log(`Résultat: ${results.success} succès, ${results.errors} erreurs`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `${results.success} email(s) envoyé(s) avec succès, ${results.errors} erreur(s)`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erreur globale:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
