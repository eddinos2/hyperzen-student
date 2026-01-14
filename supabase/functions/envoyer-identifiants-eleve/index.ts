import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IdentifiantsRequest {
  eleveEmail: string;
  eleveNom: string;
  elevePrenom: string;
  immatriculation: string;
  motDePasse: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eleveEmail, eleveNom, elevePrenom, immatriculation, motDePasse }: IdentifiantsRequest = await req.json();

    console.log('Envoi des identifiants à:', eleveEmail);

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #000; color: #fff; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 32px; font-weight: 900;">HYPERZEN</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #000; font-size: 24px; font-weight: bold;">Bonjour ${elevePrenom} ${eleveNom},</h2>
          <p style="font-size: 16px; line-height: 1.6;">
            Votre compte HYPERZEN a été créé avec succès ! Voici vos identifiants de connexion :
          </p>
          <div style="background: #fff; border: 4px solid #000; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <div style="margin-bottom: 15px;">
              <p style="margin: 0; font-size: 14px; color: #666; font-weight: bold;">IDENTIFIANT</p>
              <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: 900; color: #000;">${immatriculation}</p>
            </div>
            <div>
              <p style="margin: 0; font-size: 14px; color: #666; font-weight: bold;">MOT DE PASSE TEMPORAIRE</p>
              <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: 900; color: #000; letter-spacing: 2px;">${motDePasse}</p>
            </div>
          </div>
          <div style="background: #fef3c7; color: #000; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; font-size: 14px;">
              ⚠️ <strong>Important :</strong> Ce mot de passe est temporaire. 
              Nous vous recommandons de le changer lors de votre première connexion pour sécuriser votre compte.
            </p>
          </div>
          <div style="background: #e0f2fe; color: #000; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
            <p style="margin: 0; font-size: 14px;">
              💡 <strong>Accédez à votre espace :</strong><br>
              Connectez-vous pour consulter vos règlements, échéances et documents.
            </p>
          </div>
          <p style="font-size: 14px; color: #666;">
            Si vous avez des questions, n'hésitez pas à contacter l'administration.
          </p>
        </div>
        <div style="background: #000; color: #fff; padding: 15px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">HYPERZEN - Gestion de scolarité</p>
          <p style="margin: 5px 0 0 0; color: #999;">Gardez vos identifiants en lieu sûr</p>
        </div>
      </div>
    `;

    // Envoyer l'email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'HYPERZEN <onboarding@resend.dev>',
        to: [eleveEmail],
        subject: '🎓 Vos identifiants HYPERZEN',
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Resend error:', errorData);
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('Email envoyé avec succès:', data);

    // Logger l'envoi dans la base
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    await supabaseClient.from('notifications_envoyees').insert({
      type_notification: 'identifiants_compte',
      canal: 'email',
      sujet: '🎓 Vos identifiants HYPERZEN',
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
