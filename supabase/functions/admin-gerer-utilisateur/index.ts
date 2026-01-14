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

    // Vérifier l'authentification de l'admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, userId, email, nom, prenom, password, role } = await req.json();

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Action requise' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: Créer un utilisateur gestionnaire
    if (action === 'create') {
      if (!email || !password || !nom || !prenom) {
        return new Response(
          JSON.stringify({ error: 'Email, mot de passe, nom et prénom requis' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validation du mot de passe pour admin et gestionnaire uniquement
      if (role === 'admin' || role === 'gestionnaire') {
        const passwordErrors: string[] = [];

        if (password.length < 10) {
          passwordErrors.push('Le mot de passe doit contenir au moins 10 caractères');
        }
        if (!/[A-Z]/.test(password)) {
          passwordErrors.push('Le mot de passe doit contenir au moins une majuscule');
        }
        if (!/[a-z]/.test(password)) {
          passwordErrors.push('Le mot de passe doit contenir au moins une minuscule');
        }
        if (!/[0-9]/.test(password)) {
          passwordErrors.push('Le mot de passe doit contenir au moins un chiffre');
        }
        if (!/[@#$%&*!?_\-+=]/.test(password)) {
          passwordErrors.push('Le mot de passe doit contenir au moins un caractère spécial');
        }

        const commonPasswords = ['password', 'admin', '123456', 'qwerty'];
        if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
          passwordErrors.push('Le mot de passe ne doit pas contenir de mots communs');
        }

        if (passwordErrors.length > 0) {
          return new Response(
            JSON.stringify({ 
              error: 'Mot de passe trop faible',
              details: passwordErrors
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          nom,
          prenom,
          role: role || 'gestionnaire',
        },
      });

      if (authError) {
        console.error('Erreur création compte:', authError);
        return new Response(
          JSON.stringify({ error: `Erreur création compte: ${authError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Créer le statut de mot de passe pour admin/gestionnaire
      if ((role === 'admin' || role === 'gestionnaire') && authData.user) {
        const { error: statusError } = await supabase
          .from('user_password_status')
          .insert({
            user_id: authData.user.id,
            must_change_password: true,
            password_changed_at: new Date().toISOString()
          });

        if (statusError) {
          console.error('Error creating password status:', statusError);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Utilisateur créé avec succès',
          userId: authData.user.id,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: Supprimer un utilisateur
    if (action === 'delete') {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'ID utilisateur requis' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

      if (deleteError) {
        console.error('Erreur suppression utilisateur:', deleteError);
        return new Response(
          JSON.stringify({ error: `Erreur suppression: ${deleteError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Utilisateur supprimé avec succès',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: Réinitialiser le mot de passe
    if (action === 'reset-password') {
      if (!userId || !password) {
        return new Response(
          JSON.stringify({ error: 'ID utilisateur et mot de passe requis' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { password }
      );

      if (updateError) {
        console.error('Erreur mise à jour mot de passe:', updateError);
        return new Response(
          JSON.stringify({ error: `Erreur mise à jour: ${updateError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Mot de passe mis à jour avec succès',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: Suspendre un utilisateur
    if (action === 'suspend') {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'ID utilisateur requis' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: suspendError } = await supabase.auth.admin.updateUserById(
        userId,
        { ban_duration: '876000h' } // ~100 ans, équivalent à permanent
      );

      if (suspendError) {
        console.error('Erreur suspension utilisateur:', suspendError);
        return new Response(
          JSON.stringify({ error: `Erreur suspension: ${suspendError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Utilisateur suspendu avec succès',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: Réactiver un utilisateur
    if (action === 'unsuspend') {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'ID utilisateur requis' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: unsuspendError } = await supabase.auth.admin.updateUserById(
        userId,
        { ban_duration: 'none' }
      );

      if (unsuspendError) {
        console.error('Erreur réactivation utilisateur:', unsuspendError);
        return new Response(
          JSON.stringify({ error: `Erreur réactivation: ${unsuspendError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Utilisateur réactivé avec succès',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Action non reconnue' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
