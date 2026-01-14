import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fonction pour générer un mot de passe temporaire
function genererMotDePasse(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

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

    // Vérifier l'authentification de l'admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { eleveId, envoyerEmail = false } = await req.json();

    // Récupérer l'utilisateur admin à partir du token pour audit
    const token = authHeader.replace('Bearer ', '');
    const { data: adminInfo } = await supabase.auth.getUser(token);
    const adminUserId = adminInfo?.user?.id || null;
    const ipAddress = req.headers.get('x-forwarded-for') || null;
    const userAgent = req.headers.get('user-agent') || null;

    if (!eleveId) {
      return new Response(
        JSON.stringify({ error: 'ID élève requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer les informations de l'élève
    const { data: eleve, error: eleveError } = await supabase
      .from('eleves')
      .select('id, nom, prenom, email, immatriculation, user_id')
      .eq('id', eleveId)
      .single();

    if (eleveError || !eleve) {
      console.error('Erreur récupération élève:', eleveError);
      return new Response(
        JSON.stringify({ error: 'Élève non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Si l'élève a déjà un compte: garantir que les credentials sont enregistrés
    if (eleve.user_id) {
      // Chercher des credentials existants
      const { data: credExistants } = await supabase
        .from('eleves_credentials')
        .select('mot_de_passe_initial, mot_de_passe_change')
        .eq('eleve_id', eleveId)
        .maybeSingle();

      if (credExistants?.mot_de_passe_initial) {
        // Audit: consultation credentials déjà présents
        await supabase.from('audit_log').insert({
          user_id: adminUserId,
          action: 'credentials_present',
          table_name: 'eleves_credentials',
          record_id: eleveId,
          new_data: { immatriculation: eleve.immatriculation },
          ip_address: ipAddress,
          user_agent: userAgent,
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Mot de passe déjà enregistré',
            userId: eleve.user_id,
            immatriculation: eleve.immatriculation,
            motDePasse: credExistants.mot_de_passe_initial,
            emailEnvoye: false,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Sinon: regénérer un MDP, le définir et l'enregistrer
      const nouveauMdp = genererMotDePasse();
      const { error: resetError } = await supabase.auth.admin.updateUserById(eleve.user_id, {
        password: nouveauMdp,
      });
      if (resetError) {
        console.error('Erreur reset mot de passe:', resetError);
        return new Response(
          JSON.stringify({ error: `Erreur reset mot de passe: ${resetError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabase
        .from('eleves_credentials')
        .upsert({
          eleve_id: eleveId,
          immatriculation: eleve.immatriculation,
          mot_de_passe_initial: nouveauMdp,
          mot_de_passe_change: false,
          date_dernier_changement: new Date().toISOString(),
        }, { onConflict: 'eleve_id' });

      // Email optionnel
      let emailEnvoye = false;
      if (envoyerEmail) {
        try {
          const emailResult = await supabase.functions.invoke('envoyer-identifiants-eleve', {
            body: {
              eleveEmail: eleve.email,
              eleveNom: eleve.nom,
              elevePrenom: eleve.prenom,
              immatriculation: eleve.immatriculation,
              motDePasse: nouveauMdp,
            },
          });
          if (!emailResult.error) emailEnvoye = true;
        } catch (emailError) {
          console.error('Erreur envoi email (reset):', emailError);
        }
      }

      // Audit log
      await supabase.from('audit_log').insert({
        user_id: adminUserId,
        action: 'reset_mdp_eleve',
        table_name: 'auth.users',
        record_id: eleve.user_id,
        new_data: { eleve_id: eleveId, email: eleve.email, immatriculation: eleve.immatriculation },
        ip_address: ipAddress,
        user_agent: userAgent,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Mot de passe regénéré et enregistré',
          userId: eleve.user_id,
          immatriculation: eleve.immatriculation,
          motDePasse: nouveauMdp,
          emailEnvoye,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier que l'élève a une immatriculation
    if (!eleve.immatriculation) {
      return new Response(
        JSON.stringify({ error: 'L\'élève n\'a pas d\'immatriculation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier si l'email existe déjà dans le système d'authentification
    const { data: existingUsers, error: checkError } = await supabase.auth.admin.listUsers();
    
    if (checkError) {
      console.error('Erreur vérification email:', checkError);
    } else {
      const emailExists = existingUsers.users.some(user => user.email === eleve.email);
      if (emailExists) {
        return new Response(
          JSON.stringify({ 
            error: `Un compte existe déjà avec l'email ${eleve.email}. Veuillez vérifier si cet élève n'a pas déjà un compte ou si l'email est utilisé par un autre utilisateur.` 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Générer un mot de passe temporaire
    const motDePasseTemp = genererMotDePasse();

    // Créer le compte utilisateur avec l'immatriculation comme username et l'email
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: eleve.email,
      password: motDePasseTemp,
      email_confirm: true, // Confirmer l'email automatiquement
      user_metadata: {
        nom: eleve.nom,
        prenom: eleve.prenom,
        immatriculation: eleve.immatriculation,
        role: 'eleve', // Important: le trigger handle_new_user() va utiliser ce rôle
      },
    });

    if (authError) {
      console.error('Erreur création compte auth:', authError);
      return new Response(
        JSON.stringify({ error: `Erreur création compte: ${authError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mettre à jour l'élève avec le user_id
    const { error: updateError } = await supabase
      .from('eleves')
      .update({ user_id: authData.user.id })
      .eq('id', eleveId);

    if (updateError) {
      console.error('Erreur mise à jour élève:', updateError);
      // Essayer de supprimer le compte créé
      await supabase.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la liaison du compte' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Note: Le profil et le rôle sont automatiquement créés par le trigger handle_new_user()
    // qui utilise le role dans user_metadata

    // Stocker les credentials pour l'export
    const { error: credError } = await supabase
      .from('eleves_credentials')
      .upsert({
        eleve_id: eleveId,
        immatriculation: eleve.immatriculation,
        mot_de_passe_initial: motDePasseTemp,
        mot_de_passe_change: false,
      }, {
        onConflict: 'eleve_id'
      });

    if (credError) {
      console.error('Erreur stockage credentials:', credError);
      // Ne pas bloquer la création de compte si le stockage échoue
    }

    // Audit: création de compte élève
    await supabase.from('audit_log').insert({
      user_id: adminUserId,
      action: 'creer_compte_eleve',
      table_name: 'auth.users',
      record_id: authData.user.id,
      new_data: { eleve_id: eleveId, email: eleve.email, immatriculation: eleve.immatriculation },
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    // Envoyer l'email si demandé
    let emailEnvoye = false;
    if (envoyerEmail) {
      try {
        const emailResult = await supabase.functions.invoke('envoyer-identifiants-eleve', {
          body: {
            eleveEmail: eleve.email,
            eleveNom: eleve.nom,
            elevePrenom: eleve.prenom,
            immatriculation: eleve.immatriculation,
            motDePasse: motDePasseTemp,
          },
        });

        if (!emailResult.error) {
          emailEnvoye = true;
        }
      } catch (emailError) {
        console.error('Erreur envoi email:', emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Compte créé avec succès',
        userId: authData.user.id,
        immatriculation: eleve.immatriculation,
        motDePasse: motDePasseTemp, // Retourner le mot de passe pour l'afficher à l'admin
        emailEnvoye,
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
