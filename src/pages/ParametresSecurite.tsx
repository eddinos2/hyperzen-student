import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Shield, Key, AlertCircle, CheckCircle2, Smartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ParametresSecurite() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [setupDialog, setSetupDialog] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);

  useEffect(() => {
    checkMFAStatus();
  }, []);

  const checkMFAStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: factors } = await supabase.auth.mfa.listFactors();
      
      const verifiedFactor = factors?.totp?.find(f => f.status === 'verified');
      setMfaEnabled(!!verifiedFactor);
      if (verifiedFactor) {
        setFactorId(verifiedFactor.id);
      }
    } catch (error: any) {
      console.error('Erreur lors de la vérification du statut 2FA:', error);
    }
  };

  const handleEnableMFA = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Vérifier si l'utilisateur est admin ou gestionnaire
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const hasPermission = roles?.some(r => r.role === 'admin' || r.role === 'gestionnaire');
      
      if (!hasPermission) {
        throw new Error('Seuls les administrateurs et gestionnaires peuvent activer la 2FA');
      }

      // Inscrire un nouveau facteur TOTP
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'aurlom.hyperzen.me',
        friendlyName: user.email || 'Compte AURLOM'
      });

      if (error) throw error;

      if (data) {
        setQrCode(data.totp.qr_code);
        setFactorId(data.id);
        setSetupDialog(true);
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'activation 2FA:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'activer la 2FA',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (!factorId || !verifyCode) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer le code à 6 chiffres',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: verifyCode
      });

      if (error) throw error;

      toast({
        title: '✅ 2FA activée',
        description: 'L\'authentification à deux facteurs est maintenant active sur votre compte'
      });

      setMfaEnabled(true);
      setSetupDialog(false);
      setQrCode(null);
      setVerifyCode('');
    } catch (error: any) {
      console.error('Erreur lors de la vérification:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Code incorrect, veuillez réessayer',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMFA = async () => {
    if (!factorId) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId
      });

      if (error) throw error;

      toast({
        title: '2FA désactivée',
        description: 'L\'authentification à deux facteurs a été désactivée'
      });

      setMfaEnabled(false);
      setFactorId(null);
    } catch (error: any) {
      console.error('Erreur lors de la désactivation:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de désactiver la 2FA',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-6xl font-black mb-2">SÉCURITÉ</h1>
          <p className="text-base sm:text-xl lg:text-2xl font-bold text-muted-foreground">
            Paramètres de sécurité avancés
          </p>
        </div>

        <Alert className="brutal-card bg-gradient-to-br from-blue-100 to-cyan-50">
          <Shield className="h-5 w-5" />
          <AlertDescription className="font-bold">
            Ces paramètres sont réservés aux administrateurs et gestionnaires
          </AlertDescription>
        </Alert>

        {/* Authentification à deux facteurs */}
        <Card className="brutal-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl font-black">
                  <Key className="h-6 w-6" />
                  AUTHENTIFICATION À DEUX FACTEURS (2FA)
                </CardTitle>
                <CardDescription className="text-base font-bold mt-2">
                  Ajoutez une couche de sécurité supplémentaire à votre compte
                </CardDescription>
              </div>
              {mfaEnabled && (
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-black">
              <div className="space-y-1">
                <Label className="text-base font-black">État de la 2FA</Label>
                <p className="text-sm font-bold text-muted-foreground">
                  {mfaEnabled 
                    ? '✅ Activée - Votre compte est protégé' 
                    : '❌ Désactivée - Activez-la pour plus de sécurité'}
                </p>
              </div>
              <Switch
                checked={mfaEnabled}
                onCheckedChange={(checked) => {
                  if (checked) {
                    handleEnableMFA();
                  } else {
                    handleDisableMFA();
                  }
                }}
                disabled={loading}
                className="data-[state=checked]:bg-green-600"
              />
            </div>

            <div className="space-y-3 p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border-2 border-black">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                <h3 className="font-black">Comment ça marche ?</h3>
              </div>
              <ol className="list-decimal list-inside space-y-2 text-sm font-bold">
                <li>Installez une application d'authentification (Google Authenticator, Authy, etc.)</li>
                <li>Scannez le QR code qui apparaîtra lors de l'activation</li>
                <li>Entrez le code à 6 chiffres généré par l'application</li>
                <li>À chaque connexion, vous devrez entrer ce code en plus de votre mot de passe</li>
              </ol>
            </div>

            {mfaEnabled && (
              <Alert className="border-2 border-green-600 bg-green-50">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <AlertDescription className="font-bold text-green-800">
                  Votre compte est protégé par l'authentification à deux facteurs. 
                  Vous devrez utiliser votre application d'authentification à chaque connexion.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Dialog de configuration 2FA */}
        <Dialog open={setupDialog} onOpenChange={setSetupDialog}>
          <DialogContent className="brutal-card max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">CONFIGURER LA 2FA</DialogTitle>
              <DialogDescription className="font-bold">
                Scannez le QR code avec votre application d'authentification
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {qrCode && (
                <div className="flex flex-col items-center gap-4 p-4 bg-white rounded-xl border-4 border-black">
                  <img 
                    src={qrCode} 
                    alt="QR Code 2FA" 
                    className="w-64 h-64"
                  />
                  <p className="text-xs font-bold text-center text-muted-foreground">
                    Scannez ce QR code avec Google Authenticator, Authy ou toute autre application TOTP
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="font-black">Code de vérification</Label>
                <Input
                  type="text"
                  placeholder="000000"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="brutal-input text-center text-2xl font-black tracking-widest"
                />
                <p className="text-xs font-bold text-muted-foreground">
                  Entrez le code à 6 chiffres généré par votre application
                </p>
              </div>

              <Button
                onClick={handleVerifyAndEnable}
                disabled={loading || verifyCode.length !== 6}
                className="w-full brutal-button bg-green-400 text-black"
              >
                {loading ? 'Vérification...' : 'VÉRIFIER ET ACTIVER'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
