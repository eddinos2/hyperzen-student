import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { User, Save, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProfilSectionProps {
  eleve: any;
}

export function ProfilSection({ eleve }: ProfilSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);

  const updateProfilMutation = useMutation({
    mutationFn: async (data: { telephone?: string; adresse?: string }) => {
      const { error } = await supabase
        .from('eleves')
        .update(data)
        .eq('id', eleve.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eleve-data'] });
      setEditMode(false);
      toast({
        title: 'Profil mis à jour',
        description: 'Vos informations ont été enregistrées',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (newPassword: string) => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Mot de passe changé',
        description: 'Votre mot de passe a été mis à jour',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleUpdateProfil = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const telephone = formData.get('telephone') as string;
    const adresse = formData.get('adresse') as string;

    await updateProfilMutation.mutateAsync({ telephone, adresse });
  };

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Erreur',
        description: 'Les mots de passe ne correspondent pas',
        variant: 'destructive',
      });
      return;
    }

    await changePasswordMutation.mutateAsync(newPassword);
    e.currentTarget.reset();
  };

  const dossier = eleve.dossiers_scolarite?.[0];

  return (
    <div className="space-y-6">
      {/* Informations personnelles */}
      <div className="brutal-card p-6 bg-gradient-to-br from-cyan-50 to-blue-50">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black flex items-center gap-2">
            <User className="w-6 h-6" />
            INFORMATIONS PERSONNELLES
          </h3>
          <button
            onClick={() => setEditMode(!editMode)}
            className="brutal-button bg-white text-black"
          >
            {editMode ? 'ANNULER' : 'MODIFIER'}
          </button>
        </div>

        <form onSubmit={handleUpdateProfil} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-black uppercase mb-2">Nom</label>
              <input
                type="text"
                value={eleve.nom}
                disabled
                className="w-full h-12 px-4 border-4 border-black rounded-xl font-bold bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-black uppercase mb-2">Prénom</label>
              <input
                type="text"
                value={eleve.prenom}
                disabled
                className="w-full h-12 px-4 border-4 border-black rounded-xl font-bold bg-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-black uppercase mb-2">Email</label>
            <input
              type="email"
              value={eleve.email}
              disabled
              className="w-full h-12 px-4 border-4 border-black rounded-xl font-bold bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-black uppercase mb-2">Immatriculation</label>
            <input
              type="text"
              value={eleve.immatriculation}
              disabled
              className="w-full h-12 px-4 border-4 border-black rounded-xl font-bold bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-black uppercase mb-2">Téléphone</label>
            <input
              type="tel"
              name="telephone"
              defaultValue={eleve.telephone}
              disabled={!editMode}
              className="w-full h-12 px-4 border-4 border-black rounded-xl font-bold"
            />
          </div>

          <div>
            <label className="block text-sm font-black uppercase mb-2">Adresse</label>
            <textarea
              name="adresse"
              rows={3}
              defaultValue={eleve.adresse}
              disabled={!editMode}
              className="w-full px-4 py-3 border-4 border-black rounded-xl font-bold resize-none"
            />
          </div>

          {editMode && (
            <button
              type="submit"
              disabled={updateProfilMutation.isPending}
              className="brutal-button bg-primary text-primary-foreground w-full flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {updateProfilMutation.isPending ? 'ENREGISTREMENT...' : 'ENREGISTRER'}
            </button>
          )}
        </form>
      </div>

      {/* Scolarité */}
      {dossier && (
        <div className="brutal-card p-6 bg-gradient-to-br from-yellow-50 to-yellow-100">
          <h3 className="text-xl font-black mb-4">SCOLARITÉ</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-black uppercase text-muted-foreground">Campus</p>
              <p className="text-lg font-black">{dossier.campus?.nom || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-black uppercase text-muted-foreground">Filière</p>
              <p className="text-lg font-black">{dossier.filieres?.nom || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-black uppercase text-muted-foreground">Année</p>
              <p className="text-lg font-black">{dossier.annees_scolaires?.libelle || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-black uppercase text-muted-foreground">Rythme</p>
              <p className="text-lg font-black">{dossier.rythme || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Changement de mot de passe */}
      <div className="brutal-card p-6 bg-gradient-to-br from-purple-50 to-purple-100">
        <h3 className="text-xl font-black mb-4 flex items-center gap-2">
          <Lock className="w-6 h-6" />
          CHANGER LE MOT DE PASSE
        </h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-black uppercase mb-2">Nouveau mot de passe</label>
            <input
              type="password"
              name="newPassword"
              required
              minLength={6}
              className="w-full h-12 px-4 border-4 border-black rounded-xl font-bold"
              placeholder="Minimum 6 caractères"
            />
          </div>
          <div>
            <label className="block text-sm font-black uppercase mb-2">Confirmer le mot de passe</label>
            <input
              type="password"
              name="confirmPassword"
              required
              minLength={6}
              className="w-full h-12 px-4 border-4 border-black rounded-xl font-bold"
              placeholder="Retapez le mot de passe"
            />
          </div>
          <button
            type="submit"
            disabled={changePasswordMutation.isPending}
            className="brutal-button bg-primary text-primary-foreground w-full flex items-center justify-center gap-2"
          >
            <Lock className="w-5 h-5" />
            {changePasswordMutation.isPending ? 'CHANGEMENT...' : 'CHANGER LE MOT DE PASSE'}
          </button>
        </form>
      </div>
    </div>
  );
}