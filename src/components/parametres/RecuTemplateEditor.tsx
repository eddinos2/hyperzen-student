import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { FileText, Upload, Eye, Save, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const VARIABLES_DISPONIBLES = [
  { key: '{{logo_url}}', description: 'URL du logo' },
  { key: '{{recu_numero}}', description: 'Numéro du reçu' },
  { key: '{{eleve_nom}}', description: 'Nom de l\'élève' },
  { key: '{{eleve_prenom}}', description: 'Prénom de l\'élève' },
  { key: '{{immatriculation}}', description: 'Immatriculation' },
  { key: '{{date_paiement}}', description: 'Date du paiement' },
  { key: '{{montant}}', description: 'Montant payé' },
  { key: '{{moyen_paiement}}', description: 'Moyen de paiement' },
  { key: '{{numero_piece}}', description: 'Numéro de pièce' },
  { key: '{{annee_scolaire}}', description: 'Année scolaire' },
  { key: '{{campus_nom}}', description: 'Nom du campus' },
  { key: '{{etablissement_nom}}', description: 'Nom de l\'établissement' },
  { key: '{{etablissement_adresse}}', description: 'Adresse de l\'établissement' },
];

export function RecuTemplateEditor() {
  const [contenuHtml, setContenuHtml] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [etablissementNom, setEtablissementNom] = useState('');
  const [etablissementAdresse, setEtablissementAdresse] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: modele, isLoading } = useQuery({
    queryKey: ['modele-recu'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modeles_documents')
        .select('*')
        .eq('type_modele', 'recu')
        .eq('actif', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    if (modele) {
      setContenuHtml(modele.contenu_html || '');
      const vars = modele.variables as any;
      setLogoUrl(vars?.logo_url || '');
      setEtablissementNom(vars?.etablissement_nom || '');
      setEtablissementAdresse(vars?.etablissement_adresse || '');
    }
  }, [modele]);

  const uploadLogo = async (file: File): Promise<string> => {
    const fileName = `logo-${Date.now()}.${file.name.split('.').pop()}`;
    const { error: uploadError, data } = await supabase.storage
      .from('recu-assets')
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('recu-assets')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const sauvegarderModele = useMutation({
    mutationFn: async () => {
      let finalLogoUrl = logoUrl;

      // Upload du logo si un fichier est sélectionné
      if (logoFile) {
        finalLogoUrl = await uploadLogo(logoFile);
      }

      const variables = {
        logo_url: finalLogoUrl,
        etablissement_nom: etablissementNom,
        etablissement_adresse: etablissementAdresse,
      };

      if (modele) {
        // Mise à jour
        const { error } = await supabase
          .from('modeles_documents')
          .update({
            contenu_html: contenuHtml,
            variables,
          })
          .eq('id', modele.id);

        if (error) throw error;
      } else {
        // Création
        const { error } = await supabase
          .from('modeles_documents')
          .insert({
            type_modele: 'recu',
            nom: 'Modèle de reçu personnalisé',
            actif: true,
            contenu_html: contenuHtml,
            variables,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modele-recu'] });
      toast({
        title: 'Modèle enregistré',
        description: 'Le modèle de reçu a été mis à jour avec succès.',
      });
      setLogoFile(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const insererVariable = (variable: string) => {
    const textarea = document.getElementById('html-editor') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = contenuHtml.substring(0, start) + variable + contenuHtml.substring(end);
      setContenuHtml(newText);
      
      // Remettre le focus et la sélection
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    }
  };

  const getPreviewHtml = () => {
    return contenuHtml
      .replace(/{{logo_url}}/g, logoUrl || 'https://placehold.co/200x100?text=LOGO')
      .replace(/{{recu_numero}}/g, 'RECU-2025-ABC123')
      .replace(/{{eleve_nom}}/g, 'DUPONT')
      .replace(/{{eleve_prenom}}/g, 'Marie')
      .replace(/{{immatriculation}}/g, '202500123')
      .replace(/{{date_paiement}}/g, '15/01/2025')
      .replace(/{{montant}}/g, '1 200,00 €')
      .replace(/{{moyen_paiement}}/g, 'Carte bancaire')
      .replace(/{{numero_piece}}/g, 'CB123456')
      .replace(/{{annee_scolaire}}/g, '2025_2026')
      .replace(/{{campus_nom}}/g, 'Campus Paris')
      .replace(/{{etablissement_nom}}/g, etablissementNom || 'École')
      .replace(/{{etablissement_adresse}}/g, etablissementAdresse || 'Adresse');
  };

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Variables disponibles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Variables disponibles
          </CardTitle>
          <CardDescription>
            Cliquez sur une variable pour l'insérer dans le modèle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {VARIABLES_DISPONIBLES.map((variable) => (
              <Button
                key={variable.key}
                variant="outline"
                size="sm"
                onClick={() => insererVariable(variable.key)}
                title={variable.description}
              >
                {variable.key}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Logo de l'établissement</Label>
            <div className="flex items-center gap-4">
              {logoUrl && (
                <img src={logoUrl} alt="Logo" className="h-16 w-auto border rounded" />
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setLogoFile(file);
                    // Prévisualisation
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      setLogoUrl(e.target?.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="etablissement-nom">Nom de l'établissement</Label>
            <Input
              id="etablissement-nom"
              value={etablissementNom}
              onChange={(e) => setEtablissementNom(e.target.value)}
              placeholder="Ex: École HyperZen"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="etablissement-adresse">Adresse de l'établissement</Label>
            <Input
              id="etablissement-adresse"
              value={etablissementAdresse}
              onChange={(e) => setEtablissementAdresse(e.target.value)}
              placeholder="Ex: 123 Rue de la Paix, 75001 Paris"
            />
          </div>
        </CardContent>
      </Card>

      {/* Éditeur HTML */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Modèle HTML</CardTitle>
              <CardDescription>
                Éditez le HTML du reçu. Utilisez les variables ci-dessus.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {showPreview ? 'Masquer' : 'Prévisualiser'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            id="html-editor"
            value={contenuHtml}
            onChange={(e) => setContenuHtml(e.target.value)}
            className="font-mono text-sm min-h-[400px]"
            placeholder="Entrez votre HTML ici..."
          />
        </CardContent>
      </Card>

      {/* Prévisualisation */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Prévisualisation</CardTitle>
            <CardDescription>
              Aperçu avec des données de test
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-6 bg-white">
              <div dangerouslySetInnerHTML={{ __html: getPreviewHtml() }} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => {
            if (modele) {
              setContenuHtml(modele.contenu_html || '');
              const vars = modele.variables as any;
              setLogoUrl(vars?.logo_url || '');
              setEtablissementNom(vars?.etablissement_nom || '');
              setEtablissementAdresse(vars?.etablissement_adresse || '');
              setLogoFile(null);
            }
          }}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Annuler
        </Button>
        <Button
          onClick={() => sauvegarderModele.mutate()}
          disabled={sauvegarderModele.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          {sauvegarderModele.isPending ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  );
}
