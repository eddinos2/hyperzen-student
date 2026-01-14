import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'reglement' | 'echeance_rappel' | 'retard';
  eleveEmail: string;
  eleveNom: string;
  elevePrenom: string;
  montant?: number;
  dateReglement?: string;
  dateEcheance?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, eleveEmail, eleveNom, elevePrenom, montant, dateReglement, dateEcheance }: NotificationRequest = await req.json();

    console.log('Sending notification:', { type, eleveEmail, eleveNom });

    let subject = '';
    let htmlContent = '';

    const montantFormate = montant ? new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(montant) : '';

    const dateFormatee = (date: string) => new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    switch (type) {
      case 'reglement':
        subject = '✅ Confirmation de règlement - HYPERZEN';
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #000; color: #fff; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 900;">HYPERZEN</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <h2 style="color: #000; font-size: 24px; font-weight: bold;">Bonjour ${elevePrenom} ${eleveNom},</h2>
              <p style="font-size: 16px; line-height: 1.6;">
                Nous avons bien reçu votre règlement de <strong style="color: #10b981;">${montantFormate}</strong> 
                en date du <strong>${dateReglement ? dateFormatee(dateReglement) : ''}</strong>.
              </p>
              <div style="background: #10b981; color: white; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <p style="margin: 0; font-size: 18px; font-weight: bold;">Merci pour votre règlement !</p>
              </div>
              <p style="font-size: 14px; color: #666;">
                Vous pouvez consulter votre reçu et l'historique de vos paiements sur votre espace élève.
              </p>
            </div>
            <div style="background: #000; color: #fff; padding: 15px; text-align: center; font-size: 12px;">
              <p style="margin: 0;">HYPERZEN - Gestion de scolarité</p>
            </div>
          </div>
        `;
        break;

      case 'echeance_rappel':
        subject = '📅 Rappel d\'échéance - HYPERZEN';
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #000; color: #fff; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 900;">HYPERZEN</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <h2 style="color: #000; font-size: 24px; font-weight: bold;">Bonjour ${elevePrenom} ${eleveNom},</h2>
              <p style="font-size: 16px; line-height: 1.6;">
                Nous vous rappelons qu'une échéance de <strong style="color: #f59e0b;">${montantFormate}</strong> 
                est prévue le <strong>${dateEcheance ? dateFormatee(dateEcheance) : ''}</strong>.
              </p>
              <div style="background: #fef3c7; color: #000; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; font-size: 16px; font-weight: bold;">⏰ Échéance à venir</p>
              </div>
              <p style="font-size: 14px; color: #666;">
                Pour effectuer votre règlement ou consulter vos échéances, connectez-vous à votre espace élève.
              </p>
            </div>
            <div style="background: #000; color: #fff; padding: 15px; text-align: center; font-size: 12px;">
              <p style="margin: 0;">HYPERZEN - Gestion de scolarité</p>
            </div>
          </div>
        `;
        break;

      case 'retard':
        subject = '🔴 Échéance en retard - HYPERZEN';
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #000; color: #fff; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 900;">HYPERZEN</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <h2 style="color: #000; font-size: 24px; font-weight: bold;">Bonjour ${elevePrenom} ${eleveNom},</h2>
              <p style="font-size: 16px; line-height: 1.6;">
                Nous constatons qu'une échéance de <strong style="color: #ef4444;">${montantFormate}</strong> 
                prévue le <strong>${dateEcheance ? dateFormatee(dateEcheance) : ''}</strong> n'a pas encore été réglée.
              </p>
              <div style="background: #fee2e2; color: #000; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
                <p style="margin: 0; font-size: 16px; font-weight: bold;">⚠️ Règlement en retard</p>
              </div>
              <p style="font-size: 14px; color: #666;">
                Merci de régulariser votre situation dans les plus brefs délais. Pour toute question, n'hésitez pas à nous contacter.
              </p>
            </div>
            <div style="background: #000; color: #fff; padding: 15px; text-align: center; font-size: 12px;">
              <p style="margin: 0;">HYPERZEN - Gestion de scolarité</p>
            </div>
          </div>
        `;
        break;
    }

    // Send email using Resend API directly
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'HYPERZEN <onboarding@resend.dev>',
        to: [eleveEmail],
        subject,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Resend error:', errorData);
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('Email sent successfully:', data);

    // Log notification in database
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    await supabaseClient.from('notifications_envoyees').insert({
      type_notification: type,
      canal: 'email',
      sujet: subject,
      contenu: htmlContent,
      statut_envoi: 'envoye',
    });

    return new Response(
      JSON.stringify({ success: true, messageId: data?.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
