import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ModelesEmailDialog } from './ModelesEmailDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ListeModelesEmail() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedModele, setSelectedModele] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [modeleToDelete, setModeleToDelete] = useState<string | null>(null);

  const { data: modeles, isLoading } = useQuery({
    queryKey: ['modeles-relance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modeles_documents')
        .select('*')
        .eq('type_modele', 'email_relance')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  const supprimerModele = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('modeles_documents')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Modèle supprimé',
        description: 'Le modèle d\'email a été supprimé avec succès'
      });
      queryClient.invalidateQueries({ queryKey: ['modeles-relance'] });
      setDeleteDialogOpen(false);
      setModeleToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const getNiveauBadge = (niveau: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
      '1': { variant: 'default', label: 'Niveau 1' },
      '2': { variant: 'secondary', label: 'Niveau 2' },
      '3': { variant: 'destructive', label: 'Niveau 3' }
    };
    const config = variants[niveau] || { variant: 'default', label: `Niveau ${niveau}` };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Modèles d'emails de relance
              </CardTitle>
              <CardDescription>
                Créez et gérez vos modèles d'emails pour les différents niveaux de relance
              </CardDescription>
            </div>
            <Button onClick={() => {
              setSelectedModele(null);
              setDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau modèle
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : modeles && modeles.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Niveau</TableHead>
                  <TableHead>Sujet</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modeles.map((modele) => (
                  <TableRow key={modele.id}>
                    <TableCell className="font-medium">{modele.nom}</TableCell>
                    <TableCell>{getNiveauBadge((modele.variables as any)?.niveau || '1')}</TableCell>
                    <TableCell className="max-w-md truncate">{(modele.variables as any)?.sujet}</TableCell>
                    <TableCell>
                      <Badge variant={modele.actif ? 'default' : 'secondary'}>
                        {modele.actif ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedModele(modele);
                            setDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setModeleToDelete(modele.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun modèle d'email créé</p>
              <p className="text-sm mt-2">Cliquez sur "Nouveau modèle" pour commencer</p>
            </div>
          )}
        </CardContent>
      </Card>

      <ModelesEmailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        modele={selectedModele}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce modèle d'email ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => modeleToDelete && supprimerModele.mutate(modeleToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
