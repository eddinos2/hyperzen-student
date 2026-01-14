import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Shield, GraduationCap, BookOpen } from 'lucide-react';
import logo from '@/assets/logo-aurlom-bts.png';
import { applyTheme, type ThemeName } from '@/lib/themes';

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<'choice' | 'admin' | 'eleve' | 'forgot-password'>('choice');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Appliquer le thème au chargement
  useEffect(() => {
    const loadTheme = async () => {
      const { data } = await supabase
        .from('parametres_globaux')
        .select('valeur')
        .eq('cle', 'theme')
        .single();
      
      if (data?.valeur) {
        applyTheme(data.valeur as ThemeName);
      } else {
        applyTheme('default');
      }
    };
    loadTheme();
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Vérifier le rate limiting
      const { data: rateLimitCheck } = await supabase.rpc('check_login_rate_limit', {
        p_email: identifier,
        p_ip_address: '0.0.0.0' // En production, récupérer la vraie IP
      });

      if (!rateLimitCheck) {
        toast({
          title: "Trop de tentatives",
          description: "Veuillez réessayer dans 15 minutes",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: identifier,
        password,
      });

      // Logger la tentative
      await supabase.from('login_attempts').insert({
        email: identifier,
        ip_address: '0.0.0.0',
        success: !error,
        user_agent: navigator.userAgent
      });

      if (error) throw error;

      // Vérifier si 2FA est requise
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verifiedFactor = factors?.totp?.find(f => f.status === 'verified');
      
      if (verifiedFactor) {
        // Challenge MFA
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: verifiedFactor.id
        });
        
        if (challengeError) throw challengeError;
        
        setFactorId(verifiedFactor.id);
        setChallengeId(challengeData.id);
        setMfaRequired(true);
        setLoading(false);
        return;
      }

      toast({
        title: "Connexion réussie",
        description: "Accès HyperZen",
      });
      
      navigate('/');
    } catch (error: any) {
      toast({
        title: "Erreur de connexion",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEleveLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let loginEmail = identifier.trim();

      if (!identifier.includes('@')) {
        const { data: emailData, error: emailError } = await supabase.functions.invoke('get-eleve-email', {
          body: { immatriculation: identifier },
        });

        if (emailError || !emailData?.email) {
          throw new Error("Immatriculation inconnue. Vérifiez le numéro ou contactez l'administration.");
        }
        loginEmail = emailData.email as string;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      // Logger la tentative de connexion élève
      await supabase.from('login_attempts').insert({
        email: loginEmail,
        ip_address: '0.0.0.0',
        success: !error,
        user_agent: navigator.userAgent
      });

      if (error) throw error;

      const { data: eleveCheck } = await supabase
        .from('eleves')
        .select('id')
        .eq('user_id', data.user.id)
        .single();

      if (!eleveCheck) {
        await supabase.auth.signOut();
        throw new Error('Ce compte n\'est pas associé à un élève');
      }

      // Vérifier si 2FA est requise
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verifiedFactor = factors?.totp?.find(f => f.status === 'verified');
      
      if (verifiedFactor) {
        // Challenge MFA
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: verifiedFactor.id
        });
        
        if (challengeError) throw challengeError;
        
        setFactorId(verifiedFactor.id);
        setChallengeId(challengeData.id);
        setMfaRequired(true);
        setLoading(false);
        return;
      }

      toast({
        title: 'Connexion réussie',
        description: 'Portail élève',
      });

      navigate('/portail-eleve');
    } catch (error: any) {
      toast({
        title: 'Erreur de connexion',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMFAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!factorId) {
        throw new Error("Aucun facteur MFA disponible");
      }

      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: mfaCode,
      });

      if (error) throw error;

      if (data?.access_token) {
        toast({
          title: "Authentification réussie",
          description: "Vous êtes maintenant connecté",
        });
        navigate('/');
      }
    } catch (error: any) {
      console.error('Erreur MFA:', error);
      toast({
        title: "Erreur d'authentification",
        description: error.message || "Code MFA invalide",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(identifier, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) throw error;

      setResetEmailSent(true);
      toast({
        title: "Email envoyé",
        description: "Vérifiez votre boîte mail pour réinitialiser votre mot de passe",
      });
    } catch (error: any) {
      console.error('Erreur réinitialisation:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer l'email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (mfaRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <div className="brutal-card w-full max-w-md p-8 space-y-8">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="Aurlom BTS+" className="h-32 w-auto object-contain" />
          </div>
          
          <div className="text-center">
            <Shield className="mx-auto h-16 w-16 mb-4 text-primary" />
            <h1 className="text-4xl font-black">Authentification 2FA</h1>
            <p className="text-muted-foreground mt-2">
              Entrez le code à 6 chiffres de votre application
            </p>
          </div>

          <form onSubmit={handleMFAVerify} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="mfaCode" className="text-lg font-bold">Code 2FA</Label>
              <Input
                id="mfaCode"
                type="text"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="brutal-input text-center text-2xl font-black tracking-widest"
                placeholder="000000"
                maxLength={6}
                autoFocus
                required
              />
            </div>

            <Button
              type="submit"
              className="brutal-button w-full text-xl"
              disabled={loading || mfaCode.length !== 6}
            >
              {loading ? 'Vérification...' : 'Vérifier'}
            </Button>
          </form>

          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => {
                setMfaRequired(false);
                setMfaCode('');
                setFactorId(null);
                setChallengeId(null);
                setIdentifier('');
                setPassword('');
              }}
              className="text-base font-bold"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Recommencer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'forgot-password') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <div className="brutal-card w-full max-w-md p-8 space-y-8">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="Aurlom BTS+" className="h-32 w-auto object-contain" />
          </div>
          
          {!resetEmailSent ? (
            <>
              <div className="text-center">
                <h1 className="text-4xl font-black">Mot de passe oublié</h1>
                <p className="text-muted-foreground mt-2">
                  Entrez votre email pour recevoir un lien de réinitialisation
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-lg font-bold">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="votre.email@exemple.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="brutal-input"
                    required
                  />
                </div>
                <Button type="submit" className="brutal-button w-full text-xl" disabled={loading}>
                  {loading ? "Envoi en cours..." : "Envoyer le lien"}
                </Button>
              </form>

              <div className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setMode('choice');
                    setIdentifier('');
                  }}
                  className="text-base font-bold"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center">
                <h1 className="text-4xl font-black">Email envoyé</h1>
                <p className="text-muted-foreground mt-2">
                  Vérifiez votre boîte mail pour réinitialiser votre mot de passe
                </p>
              </div>

              <Button
                className="brutal-button w-full text-xl"
                onClick={() => {
                  setMode('choice');
                  setIdentifier('');
                  setResetEmailSent(false);
                }}
              >
                Retour à la connexion
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'choice') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <div className="brutal-card w-full max-w-md p-8 space-y-8">
        <div className="flex justify-center mb-4">
          <img src={logo} alt="Aurlom BTS+" className="h-32 w-auto object-contain" />
        </div>
          
          <div className="text-center">
            <h1 className="text-4xl font-black">Connexion</h1>
            <p className="text-muted-foreground mt-2">Choisissez votre type de compte</p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={() => setMode('admin')}
              className="brutal-button w-full text-xl h-20"
              variant="default"
            >
              <Shield className="mr-3 h-6 w-6" />
              Espace Administration
            </Button>

            <Button
              onClick={() => setMode('eleve')}
              className="brutal-button w-full text-xl h-20"
              variant="secondary"
            >
              <GraduationCap className="mr-3 h-6 w-6" />
              Espace Élèves
            </Button>

            <Button
              onClick={() => window.location.href = 'https://profs.hyperzen.me/'}
              className="brutal-button w-full text-xl h-20"
              variant="accent"
            >
              <BookOpen className="mr-3 h-6 w-6" />
              Espace Enseignants
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="brutal-card w-full max-w-md p-8 space-y-8">
        <div className="flex justify-center mb-4">
          <img src={logo} alt="Aurlom BTS+" className="h-32 w-auto object-contain" />
        </div>
        
        <div className="text-center">
          <h1 className="text-4xl font-black">
            {mode === 'admin' ? 'Administration' : 'Portail Élève'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {mode === 'admin' ? 'Accédez à votre espace de gestion' : 'Connectez-vous à votre espace'}
          </p>
        </div>

        <form onSubmit={mode === 'admin' ? handleAdminLogin : handleEleveLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="identifier" className="text-lg font-bold">
              {mode === 'admin' ? 'Email' : 'Identifiant'}
            </Label>
            <Input
              id="identifier"
              type={mode === 'admin' ? 'email' : 'text'}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="brutal-input"
              placeholder={mode === 'admin' ? 'votre.email@exemple.com' : 'Votre immatriculation (ex: 202500001)'}
              required
            />
            {mode === 'eleve' && (
              <p className="text-xs text-muted-foreground">
                Utilisez votre numéro d'immatriculation comme identifiant
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-lg font-bold">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="brutal-input"
              required
            />
          </div>

          <Button
            type="submit"
            className="brutal-button w-full text-xl"
            disabled={loading}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </Button>
        </form>

        <div className="text-center space-y-2">
          <Button
            type="button"
            variant="link"
            className="text-sm"
            onClick={() => {
              setMode('forgot-password');
              setIdentifier('');
              setPassword('');
            }}
          >
            Mot de passe oublié ?
          </Button>
          
          <div>
            <Button
              variant="ghost"
              onClick={() => {
                setMode('choice');
                setIdentifier('');
                setPassword('');
              }}
              className="text-base font-bold"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
