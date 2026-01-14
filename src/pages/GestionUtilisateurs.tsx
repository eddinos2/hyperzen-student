import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { 
  UserCog, Shield, UserMinus, Search, Mail, User, Calendar, 
  Trash2, Key, UserPlus, Download, Building2, Eye, EyeOff, Copy
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';

type UserRole = 'admin' | 'gestionnaire' | 'eleve' | 'lecteur' | 'finance' | 'pedagogie';

interface UserWithRoles {
  user_id: string;
  email: string;
  nom: string;
  prenom: string;
  created_at: string;
  roles: UserRole[];
}

const GestionUtilisateurs = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showEleves, setShowEleves] = useState(false);
  
  // Form states
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserNom, setNewUserNom] = useState('');
  const [newUserPrenom, setNewUserPrenom] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'gestionnaire' | 'lecteur' | 'finance' | 'pedagogie'>('gestionnaire');
  const [resetPassword, setResetPassword] = useState('');
  const [campusDialogOpen, setCampusDialogOpen] = useState(false);
  const [selectedCampusIds, setSelectedCampusIds] = useState<string[]>([]);

  const { data: users, refetch } = useQuery({
    queryKey: ['users-with-roles', showEleves],
    queryFn: async () => {
      // Get all profiles, filter eleves based on toggle
      const query = supabase
        .from('profiles')
        .select('user_id, email, nom, prenom, created_at, role')
        .order('created_at', { ascending: false });
      
      if (!showEleves) {
        query.neq('role', 'eleve');
      }

      const { data: profiles, error: profilesError } = await query;

      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine data
      const usersWithRoles: UserWithRoles[] = (profiles || []).map(profile => {
        const userRoles = (roles || [])
          .filter(r => r.user_id === profile.user_id)
          .map(r => r.role as UserRole);
        
        // Si on veut tous les utilisateurs, inclure tous les rôles
        const filteredRoles = showEleves ? userRoles : userRoles.filter(r => r !== 'eleve');
        
        return {
          ...profile,
          roles: filteredRoles.length > 0 ? filteredRoles : (profile.role ? [profile.role as UserRole] : ['gestionnaire' as UserRole]),
        };
      });

      return usersWithRoles;
    },
  });

  const { data: campus } = useQuery({
    queryKey: ['campus-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campus')
        .select('id, nom')
        .eq('actif', true)
        .order('nom');
      
      if (error) throw error;
      return data;
    },
  });

  const { data: campusAssignments, refetch: refetchCampusAssignments } = useQuery({
    queryKey: ['campus-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gestionnaires_campus')
        .select('user_id, campus_id, campus(nom)');
      
      if (error) throw error;
      return data;
    },
  });

  const getUserCampus = (userId: string) => {
    return campusAssignments?.filter(a => a.user_id === userId) || [];
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword || !newUserNom || !newUserPrenom) {
      toast({
        title: 'Erreur',
        description: 'Tous les champs sont requis',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-gerer-utilisateur', {
        body: {
          action: 'create',
          email: newUserEmail,
          password: newUserPassword,
          nom: newUserNom,
          prenom: newUserPrenom,
          role: newUserRole,
        },
      });

      if (error) throw error;

      toast({
        title: 'Utilisateur créé',
        description: `Le compte de ${newUserPrenom} ${newUserNom} a été créé avec succès`,
      });

      setCreateDialogOpen(false);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserNom('');
      setNewUserPrenom('');
      setNewUserRole('gestionnaire');
      refetch();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer l\'utilisateur',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('admin-gerer-utilisateur', {
        body: {
          action: 'delete',
          userId,
        },
      });

      if (error) throw error;

      toast({
        title: 'Utilisateur supprimé',
        description: `${userName} a été supprimé avec succès`,
      });

      refetch();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer l\'utilisateur',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !resetPassword) {
      toast({
        title: 'Erreur',
        description: 'Mot de passe requis',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('admin-gerer-utilisateur', {
        body: {
          action: 'reset-password',
          userId: selectedUser.user_id,
          password: resetPassword,
        },
      });

      if (error) throw error;

      toast({
        title: 'Mot de passe réinitialisé',
        description: `Le mot de passe de ${selectedUser.prenom} ${selectedUser.nom} a été mis à jour`,
      });

      setPasswordDialogOpen(false);
      setResetPassword('');
      setSelectedUser(null);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de réinitialiser le mot de passe',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: UserRole, action: 'add' | 'remove') => {
    setLoading(true);
    try {
      if (action === 'add') {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole as any });
        
        if (error) throw error;
        
        toast({
          title: 'Rôle ajouté',
          description: `Le rôle ${newRole} a été ajouté avec succès`,
        });
      } else {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', newRole as any);
        
        if (error) throw error;
        
        toast({
          title: 'Rôle retiré',
          description: `Le rôle ${newRole} a été retiré avec succès`,
        });
      }
      
      refetch();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de modifier le rôle',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportUsers = () => {
    if (!users) return;

    const csvData = users.map(user => ({
      Email: user.email,
      Nom: user.nom,
      Prénom: user.prenom,
      Rôles: user.roles.join(', '),
      'Date création': new Date(user.created_at).toLocaleDateString('fr-FR'),
    }));

    const headers = Object.keys(csvData[0]).join(',');
    const rows = csvData.map(row => Object.values(row).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `utilisateurs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: 'Export réussi',
      description: 'La liste des utilisateurs a été exportée',
    });
  };

  const handleManageCampus = async () => {
    if (!selectedUser) return;

    setLoading(true);
    try {
      // Supprimer les anciennes associations
      await supabase
        .from('gestionnaires_campus')
        .delete()
        .eq('user_id', selectedUser.user_id);

      // Ajouter les nouvelles associations
      if (selectedCampusIds.length > 0) {
        const { error } = await supabase
          .from('gestionnaires_campus')
          .insert(
            selectedCampusIds.map(campusId => ({
              user_id: selectedUser.user_id,
              campus_id: campusId,
            }))
          );

        if (error) throw error;
      }

      toast({
        title: 'Campus mis à jour',
        description: `Les campus de ${selectedUser.prenom} ${selectedUser.nom} ont été mis à jour`,
      });

      setCampusDialogOpen(false);
      setSelectedUser(null);
      setSelectedCampusIds([]);
      refetchCampusAssignments();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour les campus',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Nettoyage complet: supprime toutes les données + tous les comptes élèves (conserve admins/gestionnaires)
  const handleCleanDatabase = async () => {
    if (!confirm('⚠️ Cette action va supprimer TOUTES les données et TOUS les comptes élèves. Les comptes admin et gestionnaire seront conservés. Continuer ?')) {
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('nettoyer-base-complete');
      if (error) throw error;

      toast({
        title: '✅ Base nettoyée',
        description: `Toutes les données ont été supprimées. ${data.comptesSupprimes} compte(s) élève supprimé(s).`,
      });

      await refetch();
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors du nettoyage de la base',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$%&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const filteredUsers = users?.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.prenom?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeVariant = (role: UserRole): "default" | "destructive" | "outline" | "secondary" => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'lecteur':
        return 'outline';
      case 'finance':
      case 'pedagogie':
      case 'gestionnaire':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-black mb-2">Gestion des utilisateurs</h1>
            <p className="text-xl text-muted-foreground">
              Administration complète des comptes
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={handleCleanDatabase}
              variant="destructive"
              className="brutal-button bg-red-500 hover:bg-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Nettoyer la base
            </Button>
            <Button
              onClick={handleExportUsers}
              variant="outline"
              className="brutal-button"
            >
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="brutal-button">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Créer un utilisateur
                </Button>
              </DialogTrigger>
              <DialogContent className="brutal-card max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black">Créer un utilisateur</DialogTitle>
                  <DialogDescription>
                    Créer un nouveau compte gestionnaire ou administrateur
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-bold">Prénom</Label>
                      <Input
                        value={newUserPrenom}
                        onChange={(e) => setNewUserPrenom(e.target.value)}
                        className="brutal-input"
                        placeholder="Jean"
                      />
                    </div>
                    <div>
                      <Label className="font-bold">Nom</Label>
                      <Input
                        value={newUserNom}
                        onChange={(e) => setNewUserNom(e.target.value)}
                        className="brutal-input"
                        placeholder="Dupont"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="font-bold">Email</Label>
                    <Input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="brutal-input"
                      placeholder="jean.dupont@exemple.com"
                    />
                  </div>

                  <div>
                    <Label className="font-bold">Rôle</Label>
                    <Select value={newUserRole} onValueChange={(value: 'admin' | 'gestionnaire' | 'lecteur' | 'finance' | 'pedagogie') => setNewUserRole(value)}>
                      <SelectTrigger className="brutal-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrateur</SelectItem>
                        <SelectItem value="gestionnaire">Gestionnaire</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="pedagogie">Pédagogie</SelectItem>
                        <SelectItem value="lecteur">Lecteur (lecture seule)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="font-bold">Mot de passe</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setNewUserPassword(generatePassword())}
                        className="text-xs"
                      >
                        Générer
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        className="brutal-input"
                        placeholder="••••••••"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setShowPassword(!showPassword)}
                        className="brutal-button"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setCreateDialogOpen(false)}
                      className="brutal-button flex-1"
                    >
                      Annuler
                    </Button>
                    <Button
                      onClick={handleCreateUser}
                      disabled={loading}
                      className="brutal-button flex-1"
                    >
                      {loading ? 'Création...' : 'Créer'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="brutal-card p-8">
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-4">
              <Search className="h-6 w-6" />
              <Input
                placeholder="Rechercher par email, nom ou prénom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="brutal-input flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="show-eleves"
                checked={showEleves}
                onCheckedChange={setShowEleves}
              />
              <Label htmlFor="show-eleves" className="font-bold cursor-pointer">
                Afficher les comptes élèves
              </Label>
            </div>
          </div>

          <div className="space-y-4">
            {filteredUsers?.map((user) => (
              <Card key={user.user_id} className="p-6 border-4 border-black">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-black text-xl">
                          {user.prenom} {user.nom}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <p>{user.email}</p>
                    </div>

                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <p>
                        Inscrit le {new Date(user.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="font-bold text-sm">Rôles:</span>
                      {user.roles.map((role) => (
                        <Badge
                          key={role}
                          variant={getRoleBadgeVariant(role)}
                          className="border-2 border-black font-bold"
                        >
                          {role}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-bold text-sm">Campus:</span>
                      {getUserCampus(user.user_id).length > 0 ? (
                        getUserCampus(user.user_id).map((assignment: any) => (
                          <Badge
                            key={assignment.campus_id}
                            variant="outline"
                            className="border-2 border-black font-bold"
                          >
                            {assignment.campus?.nom}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="secondary" className="border-2 border-black font-bold">
                          <Eye className="h-3 w-3 mr-1" />
                          Tous les campus
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {!user.roles.includes('admin') && (
                      <Button
                        onClick={() => handleUpdateRole(user.user_id, 'admin', 'add')}
                        disabled={loading}
                        className="brutal-button w-full"
                        size="sm"
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Promouvoir Admin
                      </Button>
                    )}
                    
                    {user.roles.includes('admin') && user.roles.length > 1 && (
                      <Button
                        onClick={() => handleUpdateRole(user.user_id, 'admin', 'remove')}
                        disabled={loading}
                        variant="outline"
                        className="brutal-button w-full"
                        size="sm"
                      >
                        <UserMinus className="h-4 w-4 mr-2" />
                        Retirer Admin
                      </Button>
                    )}

                    <Dialog open={campusDialogOpen && selectedUser?.user_id === user.user_id} onOpenChange={setCampusDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          onClick={() => {
                            setSelectedUser(user);
                            setSelectedCampusIds(getUserCampus(user.user_id).map((a: any) => a.campus_id));
                          }}
                          variant="outline"
                          className="brutal-button w-full"
                          size="sm"
                        >
                          <Building2 className="h-4 w-4 mr-2" />
                          Gérer Campus
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="brutal-card max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-black">Gérer les campus</DialogTitle>
                          <DialogDescription>
                            {user.prenom} {user.nom}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <Label className="font-bold mb-3 block">Sélectionner les campus</Label>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {campus?.map((c) => (
                                <label
                                  key={c.id}
                                  className="flex items-center gap-3 p-3 rounded-lg border-2 border-black hover:bg-gray-50 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedCampusIds.includes(c.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedCampusIds([...selectedCampusIds, c.id]);
                                      } else {
                                        setSelectedCampusIds(selectedCampusIds.filter(id => id !== c.id));
                                      }
                                    }}
                                    className="w-4 h-4"
                                  />
                                  <Building2 className="h-4 w-4" />
                                  <span className="font-bold">{c.nom}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setCampusDialogOpen(false);
                                setSelectedCampusIds([]);
                              }}
                              className="brutal-button flex-1"
                            >
                              Annuler
                            </Button>
                            <Button
                              onClick={handleManageCampus}
                              disabled={loading}
                              className="brutal-button flex-1"
                            >
                              {loading ? 'Enregistrement...' : 'Enregistrer'}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={passwordDialogOpen && selectedUser?.user_id === user.user_id} onOpenChange={setPasswordDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          onClick={() => setSelectedUser(user)}
                          variant="outline"
                          className="brutal-button w-full"
                          size="sm"
                        >
                          <Key className="h-4 w-4 mr-2" />
                          Changer MDP
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="brutal-card max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-black">Réinitialiser le mot de passe</DialogTitle>
                          <DialogDescription>
                            {user.prenom} {user.nom}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <Label className="font-bold">Nouveau mot de passe</Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setResetPassword(generatePassword())}
                                className="text-xs"
                              >
                                Générer
                              </Button>
                            </div>
                            <div className="flex gap-2">
                              <Input
                                type={showPassword ? 'text' : 'password'}
                                value={resetPassword}
                                onChange={(e) => setResetPassword(e.target.value)}
                                className="brutal-input"
                                placeholder="••••••••"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => setShowPassword(!showPassword)}
                                className="brutal-button"
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                              {resetPassword && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    navigator.clipboard.writeText(resetPassword);
                                    toast({ title: 'Copié!' });
                                  }}
                                  className="brutal-button"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setPasswordDialogOpen(false);
                                setResetPassword('');
                              }}
                              className="brutal-button flex-1"
                            >
                              Annuler
                            </Button>
                            <Button
                              onClick={handleResetPassword}
                              disabled={loading || !resetPassword}
                              className="brutal-button flex-1"
                            >
                              {loading ? 'Mise à jour...' : 'Réinitialiser'}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          className="rounded-xl border-4 border-black w-full"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="brutal-card">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-2xl font-black">
                            Confirmer la suppression
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-lg">
                            Êtes-vous sûr de vouloir supprimer <strong>{user.prenom} {user.nom}</strong> ?
                            Cette action est irréversible.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="brutal-button">Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteUser(user.user_id, `${user.prenom} ${user.nom}`)}
                            className="bg-red-500 hover:bg-red-600 text-white rounded-xl border-4 border-black font-bold"
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Card>
            ))}

            {filteredUsers?.length === 0 && (
              <div className="text-center py-12">
                <UserCog className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-xl text-muted-foreground">
                  Aucun utilisateur trouvé
                </p>
              </div>
            )}
          </div>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="brutal-card p-8 bg-blue-50">
            <h3 className="text-2xl font-black mb-4">ℹ️ Rôles disponibles</h3>
            <div className="space-y-3 text-lg">
              <div className="flex items-start gap-3">
                <Badge variant="destructive" className="border-2 border-black font-bold mt-1">
                  admin
                </Badge>
                <p>Accès complet: gestion utilisateurs, paramètres système, tous les droits</p>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="border-2 border-black font-bold mt-1">
                  gestionnaire
                </Badge>
                <p>Gestion quotidienne: élèves, règlements, échéances, rapports</p>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="border-2 border-black font-bold mt-1">
                  finance
                </Badge>
                <p>Gestion financière et comptabilité</p>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="border-2 border-black font-bold mt-1">
                  pedagogie
                </Badge>
                <p>Gestion pédagogique des élèves</p>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="border-2 border-black font-bold mt-1">
                  <Eye className="h-3 w-3 mr-1" />
                  lecteur
                </Badge>
                <p>Consultation uniquement, aucune modification possible</p>
              </div>
            </div>
          </Card>

          <Card className="brutal-card p-8 bg-green-50">
            <h3 className="text-2xl font-black mb-4">📊 Statistiques</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold">Total utilisateurs:</span>
                <span className="text-2xl font-black">{users?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold">Administrateurs:</span>
                <span className="text-2xl font-black">
                  {users?.filter(u => u.roles.includes('admin')).length || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold">Gestionnaires:</span>
                <span className="text-2xl font-black">
                  {users?.filter(u => u.roles.includes('gestionnaire')).length || 0}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default GestionUtilisateurs;
