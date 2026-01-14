import { AppLayout } from '@/components/layout/AppLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, Palette, Wrench } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { themes, type ThemeName, applyTheme } from '@/lib/themes';
import { Switch } from '@/components/ui/switch';
import { RecuTemplateEditor } from '@/components/parametres/RecuTemplateEditor';
import { PlansPaiementManager } from '@/components/parametres/PlansPaiementManager';
import { TypeformConfigManager } from '@/components/parametres/TypeformConfigManager';
import { FileText, CreditCard, FormInput } from 'lucide-react';
export default function Parametres() {
  const [editingCampus, setEditingCampus] = useState<string | null>(null);
  const [editingFiliere, setEditingFiliere] = useState<string | null>(null);
  const [newCampusNom, setNewCampusNom] = useState('');
  const [newCampusCode, setNewCampusCode] = useState('');
  const [newFiliereNom, setNewFiliereNom] = useState('');
  const [newFiliereCode, setNewFiliereCode] = useState('');
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();

  // Paramètres globaux
  const {
    data: parametres
  } = useQuery({
    queryKey: ['parametres-globaux'],
    queryFn: async () => {
      const {
        data
      } = await supabase.from('parametres_globaux').select('*');
      const params: Record<string, string> = {};
      data?.forEach(p => {
        params[p.cle] = p.valeur;
      });
      return params;
    }
  });
  const updateParametre = useMutation({
    mutationFn: async ({
      cle,
      valeur
    }: {
      cle: string;
      valeur: string;
    }) => {
      const {
        error
      } = await supabase.from('parametres_globaux').update({
        valeur
      }).eq('cle', cle);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['parametres-globaux']
      });
      toast({
        title: 'Paramètre mis à jour'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  const {
    data: campus,
    refetch: refetchCampus
  } = useQuery({
    queryKey: ['campus'],
    queryFn: async () => {
      const {
        data
      } = await supabase.from('campus').select('*').order('nom');
      return data;
    }
  });
  const {
    data: filieres,
    refetch: refetchFilieres
  } = useQuery({
    queryKey: ['filieres'],
    queryFn: async () => {
      const {
        data
      } = await supabase.from('filieres').select('*').order('nom');
      return data;
    }
  });
  const {
    data: annees
  } = useQuery({
    queryKey: ['annees'],
    queryFn: async () => {
      const {
        data
      } = await supabase.from('annees_scolaires').select('*').order('ordre');
      return data;
    }
  });
  const ajouterCampus = async () => {
    if (!newCampusNom.trim()) return;
    const {
      error
    } = await supabase.from('campus').insert({
      nom: newCampusNom,
      code: newCampusCode || null
    });
    if (error) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Campus ajouté'
      });
      setNewCampusNom('');
      setNewCampusCode('');
      refetchCampus();
    }
  };
  const ajouterFiliere = async () => {
    if (!newFiliereNom.trim()) return;
    const {
      error
    } = await supabase.from('filieres').insert({
      nom: newFiliereNom,
      code: newFiliereCode || null
    });
    if (error) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Filière ajoutée'
      });
      setNewFiliereNom('');
      setNewFiliereCode('');
      refetchFilieres();
    }
  };
  const supprimerCampus = async (id: string) => {
    const {
      error
    } = await supabase.from('campus').delete().eq('id', id);
    if (error) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Campus supprimé'
      });
      refetchCampus();
    }
  };
  const supprimerFiliere = async (id: string) => {
    const {
      error
    } = await supabase.from('filieres').delete().eq('id', id);
    if (error) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Filière supprimée'
      });
      refetchFilieres();
    }
  };
  return <AppLayout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-6xl font-black mb-4">PARAMÈTRES</h1>
        <p className="text-2xl font-bold text-muted-foreground mb-8">Configuration du système</p>

        <Tabs defaultValue="base" className="space-y-6">
          <TabsList className="brutal-card p-2 grid w-full grid-cols-6 gap-2">
            <TabsTrigger value="base" className="data-[state=active]:bg-cyan-400 font-black">
              BASE
            </TabsTrigger>
            <TabsTrigger value="apparence" className="data-[state=active]:bg-purple-400 font-black">
              <Palette className="w-4 h-4 mr-2" />
              APPARENCE
            </TabsTrigger>
            <TabsTrigger value="recus" className="data-[state=active]:bg-green-400 font-black">
              <FileText className="w-4 h-4 mr-2" />
              REÇUS
            </TabsTrigger>
            <TabsTrigger value="plans" className="data-[state=active]:bg-blue-400 font-black">
              <CreditCard className="w-4 h-4 mr-2" />
              PLANS
            </TabsTrigger>
            <TabsTrigger value="typeform" className="data-[state=active]:bg-pink-400 font-black">
              <FormInput className="w-4 h-4 mr-2" />
              TYPEFORM
            </TabsTrigger>
            <TabsTrigger value="migration" className="data-[state=active]:bg-orange-400 font-black">
              🎓 MIGRATION
            </TabsTrigger>
          </TabsList>

          <TabsContent value="base" className="space-y-6">
          <div className="brutal-card p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black">CAMPUS</h2>
              <span className="px-4 py-2 rounded-xl border-2 border-black font-black text-lg bg-primary">
                {campus?.length || 0}
              </span>
            </div>

            <div className="mb-6 p-6 bg-muted rounded-2xl border-2 border-black">
              <h3 className="text-xl font-black mb-4">AJOUTER UN CAMPUS</h3>
              <div className="flex gap-4">
                <input type="text" placeholder="Nom du campus" value={newCampusNom} onChange={e => setNewCampusNom(e.target.value)} className="brutal-input flex-1" />
                <input type="text" placeholder="Code (ex: SEN)" value={newCampusCode} onChange={e => setNewCampusCode(e.target.value)} className="brutal-input w-48" />
                <button onClick={ajouterCampus} className="brutal-button bg-primary text-primary-foreground flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  AJOUTER
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {campus?.map(c => <div key={c.id} className="p-4 bg-white rounded-2xl border-2 border-black flex items-center justify-between hover:bg-yellow-50 transition-colors">
                  <div>
                    <p className="text-xl font-black">{c.nom}</p>
                    {c.code && <p className="text-sm font-bold text-muted-foreground">Code: {c.code}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 rounded-xl border-2 border-black hover:bg-black hover:text-white transition-colors">
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button onClick={() => supprimerCampus(c.id)} className="p-2 rounded-xl border-2 border-black hover:bg-red-500 hover:text-white transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>)}
            </div>
          </div>

          <div className="brutal-card p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black">FILIÈRES</h2>
              <span className="px-4 py-2 rounded-xl border-2 border-black font-black text-lg bg-secondary">
                {filieres?.length || 0}
              </span>
            </div>

            <div className="mb-6 p-6 bg-muted rounded-2xl border-2 border-black">
              <h3 className="text-xl font-black mb-4">AJOUTER UNE FILIÈRE</h3>
              <div className="flex gap-4">
                <input type="text" placeholder="Nom de la filière" value={newFiliereNom} onChange={e => setNewFiliereNom(e.target.value)} className="brutal-input flex-1" />
                <input type="text" placeholder="Code (ex: BTS_AV)" value={newFiliereCode} onChange={e => setNewFiliereCode(e.target.value)} className="brutal-input w-48" />
                <button onClick={ajouterFiliere} className="brutal-button bg-secondary text-secondary-foreground flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  AJOUTER
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {filieres?.map(f => <div key={f.id} className="p-4 bg-white rounded-2xl border-2 border-black flex items-center justify-between hover:bg-cyan-50 transition-colors">
                  <div>
                    <p className="text-xl font-black">{f.nom}</p>
                    {f.code && <p className="text-sm font-bold text-muted-foreground">Code: {f.code}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 rounded-xl border-2 border-black hover:bg-black hover:text-white transition-colors">
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button onClick={() => supprimerFiliere(f.id)} className="p-2 rounded-xl border-2 border-black hover:bg-red-500 hover:text-white transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>)}
            </div>
          </div>

          <div className="brutal-card p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black">ANNÉES SCOLAIRES</h2>
              <span className="px-4 py-2 rounded-xl border-2 border-black font-black text-lg bg-accent">
                {annees?.length || 0}
              </span>
            </div>

            <div className="space-y-3">
              {annees?.map(a => <div key={a.id} className="p-4 bg-white rounded-2xl border-2 border-black flex items-center justify-between">
                  <div>
                    <p className="text-xl font-black">{a.libelle}</p>
                    <p className="text-sm font-bold text-muted-foreground">Ordre: {a.ordre}</p>
                  </div>
                </div>)}
            </div>
          </div>
          </TabsContent>

          <TabsContent value="apparence" className="space-y-6">
            {/* Thèmes */}
            <div className="brutal-card p-8">
              <div className="flex items-center gap-3 mb-6">
                <Palette className="w-8 h-8 text-purple-500" />
                <div>
                  <h2 className="text-3xl font-black">THÈMES</h2>
                  <p className="text-sm font-bold text-muted-foreground">Personnalisez l'apparence de l'application</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(themes).map(([key, theme]) => {
                const isActive = parametres?.theme === key;
                return <button key={key} onClick={() => {
                  updateParametre.mutate({
                    cle: 'theme',
                    valeur: key
                  });
                  applyTheme(key as ThemeName);
                }} className={`brutal-card p-6 text-left transition-all hover:scale-105 relative overflow-hidden ${isActive ? 'border-4 border-primary shadow-[8px_8px_0px_0px_hsl(var(--primary))]' : 'bg-white hover:bg-gray-50'}`}>
                      {/* Background gradient preview */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-20 -z-10`}></div>
                      
                      <div className="relative z-10">
                        <div className="text-5xl mb-4 animate-bounce">{theme.icon}</div>
                        <h3 className="text-2xl font-black mb-3">{theme.name}</h3>
                        <p className="text-xs font-bold text-muted-foreground mb-3">
                          {key === 'aurlom' && 'Thème officiel Aurlom BTS+ 🎓'}
                          {key === 'default' && 'Style classique et moderne'}
                          {key === 'halloween' && 'Orange et violet mystique'}
                          {key === 'noel' && 'Rouge, vert et doré festif'}
                          {key === 'ete' && 'Jaune soleil et bleu océan'}
                          {key === 'printemps' && 'Rose et vert printanier'}
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {Object.entries(theme.colors).slice(0, 4).map(([name, color], idx) => <div key={idx} className="flex flex-col items-center gap-1">
                              <div className="w-10 h-10 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" style={{
                          backgroundColor: `hsl(${color})`
                        }} title={name} />
                              <span className="text-[8px] font-bold uppercase">{name}</span>
                            </div>)}
                        </div>
                        {isActive && <div className="mt-4 px-4 py-2 bg-primary text-primary-foreground text-sm font-black rounded-xl inline-flex items-center gap-2 animate-pulse">
                            ✓ ACTIF
                          </div>}
                      </div>
                    </button>;
              })}
              </div>
            </div>

            {/* Mode Maintenance */}
            <div className="brutal-card p-8 bg-gradient-to-br from-yellow-50 to-white">
              <div className="flex items-center gap-3 mb-6">
                <Wrench className="w-8 h-8 text-warning" />
                <div>
                  <h2 className="text-3xl font-black">MODE MAINTENANCE</h2>
                  <p className="text-sm font-bold text-muted-foreground">Bloquer l'accès au site (sauf admins)</p>
                </div>
              </div>

              <div className="brutal-card p-6 bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black mb-2">Activer le mode maintenance</h3>
                    
                  </div>
                  <Switch checked={parametres?.mode_maintenance === 'true'} onCheckedChange={checked => {
                  updateParametre.mutate({
                    cle: 'mode_maintenance',
                    valeur: checked ? 'true' : 'false'
                  });
                }} className="data-[state=checked]:bg-warning" />
                </div>

                {parametres?.mode_maintenance === 'true' && <div className="mt-6 p-4 bg-warning/15 rounded-xl border-2 border-warning">
                    <p className="font-black text-warning text-sm flex items-center gap-2">
                      <Wrench className="w-4 h-4" />
                      MODE MAINTENANCE ACTIVÉ
                    </p>
                    
                  </div>}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="recus" className="space-y-6">
            <div className="brutal-card p-8">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="w-8 h-8 text-green-500" />
                <div>
                  <h2 className="text-3xl font-black">MODÈLE DE REÇU</h2>
                  <p className="text-sm font-bold text-muted-foreground">Personnalisez l'apparence de vos reçus de paiement</p>
                </div>
              </div>

              <RecuTemplateEditor />
            </div>
          </TabsContent>

          <TabsContent value="plans" className="space-y-6">
            <PlansPaiementManager />
          </TabsContent>

          <TabsContent value="typeform" className="space-y-6">
            <TypeformConfigManager />
          </TabsContent>

          <TabsContent value="migration" className="space-y-6">
            <div className="brutal-card p-8 bg-gradient-to-br from-orange-50 to-white">
              <div className="flex items-center gap-3 mb-6">
                <div className="text-5xl">🎓</div>
                <div>
                  <h2 className="text-3xl font-black">MIGRATION D'ANNÉE SCOLAIRE</h2>
                  <p className="text-sm font-bold text-muted-foreground">Gérer le passage d'une année à l'autre</p>
                </div>
              </div>
              
              <button
                onClick={() => window.location.href = '/parametres/migration-annee'}
                className="brutal-button bg-orange-400 hover:bg-orange-500 w-full text-xl py-6"
              >
                🎓 ACCÉDER À L'OUTIL DE MIGRATION
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>;
}