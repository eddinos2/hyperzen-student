import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordStrengthIndicator, validatePasswordStrength } from './PasswordStrengthIndicator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Lock } from 'lucide-react';

interface ForcePasswordChangeProps {
  userId: string;
  onPasswordChanged: () => void;
}

export const ForcePasswordChange = ({ userId, onPasswordChanged }: ForcePasswordChangeProps) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: 'Erreur',
        description: 'Tous les champs sont requis',
        variant: 'destructive'
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Erreur',
        description: 'Les mots de passe ne correspondent pas',
        variant: 'destructive'
      });
      return;
    }

    if (currentPassword === newPassword) {
      toast({
        title: 'Erreur',
        description: 'Le nouveau mot de passe doit être différent de l\'ancien',
        variant: 'destructive'
      });
      return;
    }

    // Validation de la force du mot de passe
    const validation = validatePasswordStrength(newPassword);
    if (!validation.valid) {
      toast({
        title: 'Mot de passe trop faible',
        description: validation.errors.join(', '),
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      // Mettre à jour le mot de passe via Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      // Mettre à jour le statut dans user_password_status
      const { error: statusError } = await supabase
        .from('user_password_status')
        .update({
          must_change_password: false,
          password_changed_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (statusError) throw statusError;

      toast({
        title: 'Succès',
        description: 'Votre mot de passe a été changé avec succès'
      });

      onPasswordChanged();
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de changer le mot de passe',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-[500px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>Changement de mot de passe obligatoire</DialogTitle>
          </div>
          <DialogDescription>
            Pour des raisons de sécurité, vous devez changer votre mot de passe initial avant de continuer.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Mot de passe actuel</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Entrez votre mot de passe actuel"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">Nouveau mot de passe</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Entrez votre nouveau mot de passe"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {newPassword && <PasswordStrengthIndicator password={newPassword} />}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
            <Input
              id="confirm-password"
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmez votre nouveau mot de passe"
              disabled={loading}
            />
          </div>

          <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
            <p className="font-medium mb-1">Exigences du mot de passe:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Au moins 10 caractères</li>
              <li>Au moins une majuscule et une minuscule</li>
              <li>Au moins un chiffre</li>
              <li>Au moins un caractère spécial (@#$%&*)</li>
              <li>Pas de mots communs (password, admin, etc.)</li>
            </ul>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Changement en cours...' : 'Changer le mot de passe'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
