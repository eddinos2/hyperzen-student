import { AppLayout } from '@/components/layout/AppLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, Euro, TrendingUp, AlertCircle, Building2, GraduationCap, Target, BarChart as BarChartIcon } from 'lucide-react';
import { StatsCard } from '@/components/ui/StatsCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formaterMontant } from '@/lib/calculs';
import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function Rapports() {
  const [dateReference, setDateReference] = useState(new Date());
  const [anneeSelectionnee, setAnneeSelectionnee] = useState<string>('2025_2026');
  const { data: statsGenerales } = useQuery({
    queryKey: ['stats-generales'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('stats_dashboard');
      if (error) throw error;
      return data[0];
    },
  });

  const { data: statsCampus } = useQuery({
    queryKey: ['stats-campus'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dossiers_scolarite')
        .select(`
          campus_id,
          tarif_scolarite,
          campus (nom)
        `);

      if (error) throw error;

      const grouped = data.reduce((acc: any, curr) => {
        const campusNom = curr.campus?.nom || 'Non défini';
        if (!acc[campusNom]) {
          acc[campusNom] = { nom: campusNom, total: 0, count: 0 };
        }
        acc[campusNom].total += curr.tarif_scolarite;
        acc[campusNom].count += 1;
        return acc;
      }, {});

      return Object.values(grouped);
    },
  });

  const { data: statsFilieres } = useQuery({
    queryKey: ['stats-filieres'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dossiers_scolarite')
        .select(`
          filiere_id,
          tarif_scolarite,
          filieres (nom)
        `);

      if (error) throw error;

      const grouped = data.reduce((acc: any, curr) => {
        const filiereNom = curr.filieres?.nom || 'Non défini';
        if (!acc[filiereNom]) {
          acc[filiereNom] = { nom: filiereNom, total: 0, count: 0 };
        }
        acc[filiereNom].total += curr.tarif_scolarite;
        acc[filiereNom].count += 1;
        return acc;
      }, {});

      return Object.values(grouped);
    },
  });

  // Taux de recouvrement par campus
  const { data: tauxRecouvrementCampus } = useQuery({
    queryKey: ['taux-recouvrement-campus'],
    queryFn: async () => {
      // Récupérer les dossiers avec campus
      const { data: dossiers } = await supabase
        .from('dossiers_scolarite')
        .select(`
          id,
          tarif_scolarite,
          impaye_anterieur,
          campus_id,
          campus (nom)
        `);

      if (!dossiers) return [];

      // Récupérer tous les règlements
      const { data: reglements } = await supabase
        .from('reglements')
        .select('dossier_id, montant, type_operation')
        .eq('statut', 'valide');

      // Grouper par campus
      const grouped: Record<string, any> = {};
      
      dossiers.forEach(d => {
        const campusNom = d.campus?.nom || 'Non défini';
        if (!grouped[campusNom]) {
          grouped[campusNom] = { 
            nom: campusNom, 
            attendu: 0, 
            encaisse: 0,
            count: 0
          };
        }
        grouped[campusNom].attendu += Number(d.tarif_scolarite) + Number(d.impaye_anterieur || 0);
        grouped[campusNom].count += 1;

        // Calculer encaissé pour ce dossier
        const regsDossier = reglements?.filter(r => r.dossier_id === d.id) || [];
        const encaisseDossier = regsDossier.reduce((sum, r) => {
          return sum + (r.type_operation === 'remboursement' ? -Math.abs(r.montant) : r.montant);
        }, 0);
        grouped[campusNom].encaisse += encaisseDossier;
      });

      return Object.values(grouped).map((g: any) => ({
        ...g,
        taux: g.attendu > 0 ? Math.round((g.encaisse / g.attendu) * 100) : 0
      })).sort((a: any, b: any) => b.taux - a.taux);
    },
  });

  // Taux de recouvrement par filière
  const { data: tauxRecouvrementFiliere } = useQuery({
    queryKey: ['taux-recouvrement-filiere'],
    queryFn: async () => {
      // Récupérer les dossiers avec filière
      const { data: dossiers } = await supabase
        .from('dossiers_scolarite')
        .select(`
          id,
          tarif_scolarite,
          impaye_anterieur,
          filiere_id,
          filieres (nom)
        `);

      if (!dossiers) return [];

      // Récupérer tous les règlements
      const { data: reglements } = await supabase
        .from('reglements')
        .select('dossier_id, montant, type_operation')
        .eq('statut', 'valide');

      // Grouper par filière
      const grouped: Record<string, any> = {};
      
      dossiers.forEach(d => {
        const filiereNom = d.filieres?.nom || 'Non défini';
        if (!grouped[filiereNom]) {
          grouped[filiereNom] = { 
            nom: filiereNom, 
            attendu: 0, 
            encaisse: 0,
            count: 0
          };
        }
        grouped[filiereNom].attendu += Number(d.tarif_scolarite) + Number(d.impaye_anterieur || 0);
        grouped[filiereNom].count += 1;

        // Calculer encaissé pour ce dossier
        const regsDossier = reglements?.filter(r => r.dossier_id === d.id) || [];
        const encaisseDossier = regsDossier.reduce((sum, r) => {
          return sum + (r.type_operation === 'remboursement' ? -Math.abs(r.montant) : r.montant);
        }, 0);
        grouped[filiereNom].encaisse += encaisseDossier;
      });

      return Object.values(grouped).map((g: any) => ({
        ...g,
        taux: g.attendu > 0 ? Math.round((g.encaisse / g.attendu) * 100) : 0
      })).sort((a: any, b: any) => b.taux - a.taux);
    },
  });

  // Statistiques par statut de paiement (via backend optimisé)
  const { data: statsStatuts } = useQuery({
    queryKey: ['stats-statuts', dateReference, anneeSelectionnee],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('stats_statuts_eleves', {
        p_ref_date: dateReference.toISOString().split('T')[0],
        p_annee_scolaire: anneeSelectionnee,
      });
      if (error) throw error;
      return data || [];
    },
  });

  const getStatutColor = (name: string) => {
    switch (name) {
      case 'À jour':
        return 'hsl(var(--status-ajour))';
      case 'En cours':
        return 'hsl(var(--status-encours))';
      case 'En retard':
        return 'hsl(var(--status-enretard))';
      case 'Impayé total':
        return 'hsl(var(--status-impaye))';
      case 'Créditeur':
        return 'hsl(var(--status-crediteur))';
      default:
        return 'hsl(var(--muted-foreground))';
    }
  };

  const getStatutBg = (name: string) => {
    const varName = (
      {
        'À jour': '--status-ajour',
        'En cours': '--status-encours',
        'En retard': '--status-enretard',
        'Impayé total': '--status-impaye',
        'Créditeur': '--status-crediteur',
      } as Record<string, string>
    )[name];
    return varName ? `hsl(var(${varName}) / 0.15)` : 'hsl(var(--muted) / 0.15)';
  };

  // Custom Tooltip pour les graphes Campus/Filières (double axe)
  const CustomTooltipDualAxis = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-scale-in">
          <p className="font-black mb-3 text-lg">{payload[0].payload.nom || payload[0].payload.libelle}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-2">
              <div 
                className="w-3 h-3 border-2 border-black" 
                style={{ backgroundColor: entry.color }}
              />
              <p className="font-bold text-sm">
                {entry.name}: {entry.dataKey === 'count' ? `${entry.value} élèves` : formaterMontant(entry.value)}
              </p>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const totalAttendu = Number(statsCampus?.reduce((sum: number, stat: any) => sum + Number(stat.total || 0), 0) || 0);
  const resteAEncaisser = totalAttendu - Number(statsGenerales?.total_encaissements || 0);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-3 sm:px-4">
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
            <div className="flex-1">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black mb-3">RAPPORTS AVANCÉS</h1>
              <p className="text-sm sm:text-lg lg:text-xl font-bold text-muted-foreground">Analyses et statistiques détaillées</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="brutal-card p-4">
                <label className="text-xs font-bold mb-2 block uppercase">Date de référence</label>
                <input
                  type="date"
                  value={dateReference.toISOString().split('T')[0]}
                  onChange={(e) => setDateReference(new Date(e.target.value))}
                  className="brutal-input"
                />
              </div>
              <div className="brutal-card p-4">
                <label className="text-xs font-bold mb-2 block uppercase">Année scolaire</label>
                <select
                  value={anneeSelectionnee}
                  onChange={(e) => setAnneeSelectionnee(e.target.value)}
                  className="brutal-input"
                >
                  <option value="2025_2026">2025-2026</option>
                  <option value="2024_2025">2024-2025</option>
                  <option value="2023_2024">2023-2024</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Stats générales en haut - Responsive grid */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4 sm:gap-5 mb-8">
          <StatsCard
            title="Élèves"
            value={statsGenerales?.nb_eleves || 0}
            icon={Users}
            color="cyan"
          />
          <StatsCard
            title="Total encaissé"
            value={formaterMontant(statsGenerales?.total_encaissements || 0)}
            icon={Euro}
            color="green"
          />
          <StatsCard
            title="Reste à encaisser"
            value={formaterMontant(resteAEncaisser)}
            icon={TrendingUp}
            color="yellow"
            subtitle={`${statsGenerales?.taux_couverture || 0}% couvert`}
          />
          <StatsCard
            title="Anomalies"
            value={statsGenerales?.nb_anomalies_ouvertes || 0}
            icon={AlertCircle}
            color="red"
          />
          <StatsCard
            title="CA Prévu Total"
            value={formaterMontant(totalAttendu)}
            icon={Target}
            color="pink"
          />
        </div>

        {/* Onglets pour sections */}
        <Tabs defaultValue="financier" className="space-y-6">
          <TabsList className="brutal-card p-3 flex flex-wrap gap-2 w-full justify-center">
            <TabsTrigger value="financier" className="data-[state=active]:bg-info/20 font-bold sm:font-black py-3 px-4 flex-1 min-w-[90px] sm:min-w-[140px] text-xs sm:text-sm">
              FINANCIER
            </TabsTrigger>
            <TabsTrigger value="statuts" className="data-[state=active]:bg-success/20 font-bold sm:font-black py-3 px-4 flex-1 min-w-[90px] sm:min-w-[140px] text-xs sm:text-sm">
              STATUTS ÉLÈVES
            </TabsTrigger>
            <TabsTrigger value="analyse" className="data-[state=active]:bg-warning/20 font-bold sm:font-black py-3 px-4 flex-1 min-w-[90px] sm:min-w-[140px] text-xs sm:text-sm">
              ANALYSES
            </TabsTrigger>
          </TabsList>

          {/* Section Financière */}
          <TabsContent value="financier" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="brutal-card p-6 sm:p-8">
                <h3 className="text-xl sm:text-2xl font-black mb-6 flex items-center gap-2">
                  <Euro className="w-6 h-6" />
                  RÉPARTITION FINANCIÈRE
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-5 brutal-card bg-success/15">
                    <span className="font-bold text-sm sm:text-base">Total attendu</span>
                    <span className="text-lg sm:text-xl font-black">{formaterMontant(totalAttendu)}</span>
                  </div>
                  <div className="flex justify-between items-center p-5 brutal-card bg-info/15">
                    <span className="font-bold text-sm sm:text-base">Total encaissé</span>
                    <span className="text-lg sm:text-xl font-black">{formaterMontant(statsGenerales?.total_encaissements || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center p-5 brutal-card bg-warning/15">
                    <span className="font-bold text-sm sm:text-base">Reste à encaisser</span>
                    <span className="text-lg sm:text-xl font-black">{formaterMontant(resteAEncaisser)}</span>
                  </div>
                  <div className="flex justify-between items-center p-5 brutal-card bg-primary/15">
                    <span className="font-bold text-sm sm:text-base">Taux de couverture</span>
                    <span className="text-lg sm:text-xl font-black">{statsGenerales?.taux_couverture || 0}%</span>
                  </div>
                </div>
              </Card>

              <Card className="brutal-card p-6 sm:p-8">
                <h3 className="text-xl sm:text-2xl font-black mb-6 flex items-center gap-2">
                  <BarChartIcon className="w-6 h-6" />
                  INDICATEURS CLÉS
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-5 brutal-card bg-accent/15">
                    <span className="font-bold text-sm sm:text-base">Règlements validés</span>
                    <span className="text-lg sm:text-xl font-black">{statsGenerales?.nb_reglements || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-5 brutal-card bg-destructive/15">
                    <span className="font-bold text-sm sm:text-base">Échéances en retard</span>
                    <span className="text-lg sm:text-xl font-black">{statsGenerales?.nb_echeances_retard || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-5 brutal-card bg-warning/15">
                    <span className="font-bold text-sm sm:text-base">Anomalies ouvertes</span>
                    <span className="text-lg sm:text-xl font-black">{statsGenerales?.nb_anomalies_ouvertes || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-5 brutal-card bg-info/15">
                    <span className="font-bold text-sm sm:text-base">Montant moyen/élève</span>
                    <span className="text-lg sm:text-xl font-black">
                      {formaterMontant(totalAttendu / (statsGenerales?.nb_eleves || 1))}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Section Statuts Élèves */}
          <TabsContent value="statuts" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="brutal-card p-6 sm:p-8">
                <h3 className="text-xl sm:text-2xl font-black mb-6">RÉPARTITION PAR STATUT</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statsStatuts}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statsStatuts?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getStatutColor(entry.name)} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

              <Card className="brutal-card p-6 sm:p-8">
                <h3 className="text-xl sm:text-2xl font-black mb-6">DÉTAILS PAR STATUT</h3>
                <div className="space-y-4">
                  {statsStatuts?.map((stat, index) => (
                    <div
                      key={stat.name}
                      className="flex justify-between items-center p-5 brutal-card"
                      style={{ backgroundColor: getStatutBg(stat.name) }}
                    >
                      <span className="font-bold text-sm sm:text-base">{stat.name}</span>
                      <span className="text-lg sm:text-xl font-black">{stat.value} élèves</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Section Analyses (Campus + Filières) */}
          <TabsContent value="analyse" className="space-y-4 sm:space-y-6">
            <Card className="brutal-card p-6 bg-gradient-to-br from-cyan-50 to-white">
              <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
                <Building2 className="w-7 h-7 text-info" />
                TOP 10 CAMPUS PAR CA
              </h3>
              <ResponsiveContainer width="100%" height={450}>
                <BarChart data={statsCampus?.slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="5 5" stroke="#06b6d4" strokeOpacity={0.3} />
                  <XAxis 
                    dataKey="nom" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    tick={{ fill: '#000', fontWeight: 'bold', fontSize: 12 }}
                  />
                  <YAxis 
                    yAxisId="left"
                    tick={{ fill: '#06b6d4', fontWeight: 'bold', fontSize: 12 }}
                    label={{ value: 'CA (€)', angle: -90, position: 'insideLeft', style: { fontWeight: 'bold' } }}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right"
                    tick={{ fill: '#10b981', fontWeight: 'bold', fontSize: 12 }}
                    label={{ value: 'Élèves', angle: 90, position: 'insideRight', style: { fontWeight: 'bold' } }}
                  />
                  <Tooltip content={<CustomTooltipDualAxis />} />
                  <Legend 
                    wrapperStyle={{ fontWeight: 'bold', paddingTop: '20px' }}
                    iconType="square"
                  />
                  <Bar 
                    yAxisId="left"
                    dataKey="total" 
                    fill="hsl(var(--info))" 
                    name="CA Prévu"
                    radius={[8, 8, 0, 0]}
                    animationDuration={800}
                  />
                  <Bar 
                    yAxisId="right"
                    dataKey="count" 
                    fill="hsl(var(--success))" 
                    name="Nb Élèves"
                    radius={[8, 8, 0, 0]}
                    animationDuration={800}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="brutal-card p-6 bg-gradient-to-br from-yellow-50 to-white">
              <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
                <GraduationCap className="w-7 h-7 text-warning" />
                TOP 10 FILIÈRES PAR CA
              </h3>
              <ResponsiveContainer width="100%" height={450}>
                <BarChart data={statsFilieres?.slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="5 5" stroke="#f59e0b" strokeOpacity={0.3} />
                  <XAxis 
                    dataKey="nom" 
                    angle={-45} 
                    textAnchor="end" 
                    height={120}
                    tick={{ fill: '#000', fontWeight: 'bold', fontSize: 12 }}
                  />
                  <YAxis 
                    yAxisId="left"
                    tick={{ fill: '#f59e0b', fontWeight: 'bold', fontSize: 12 }}
                    label={{ value: 'CA (€)', angle: -90, position: 'insideLeft', style: { fontWeight: 'bold' } }}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right"
                    tick={{ fill: '#8b5cf6', fontWeight: 'bold', fontSize: 12 }}
                    label={{ value: 'Élèves', angle: 90, position: 'insideRight', style: { fontWeight: 'bold' } }}
                  />
                  <Tooltip content={<CustomTooltipDualAxis />} />
                  <Legend 
                    wrapperStyle={{ fontWeight: 'bold', paddingTop: '20px' }}
                    iconType="square"
                  />
                  <Bar 
                    yAxisId="left"
                    dataKey="total" 
                    fill="hsl(var(--warning))" 
                    name="CA Prévu"
                    radius={[8, 8, 0, 0]}
                    animationDuration={800}
                  />
                  <Bar 
                    yAxisId="right"
                    dataKey="count" 
                    fill="hsl(var(--accent))" 
                    name="Nb Élèves"
                    radius={[8, 8, 0, 0]}
                    animationDuration={800}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Nouveaux graphiques de taux de recouvrement */}
            <Card className="brutal-card p-6 bg-gradient-to-br from-green-50 to-white">
              <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
                <Target className="w-7 h-7 text-success" />
                TAUX DE RECOUVREMENT PAR CAMPUS
              </h3>
              <ResponsiveContainer width="100%" height={450}>
                <BarChart data={tauxRecouvrementCampus?.slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="5 5" stroke="#10b981" strokeOpacity={0.3} />
                  <XAxis 
                    dataKey="nom" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    tick={{ fill: '#000', fontWeight: 'bold', fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fill: '#10b981', fontWeight: 'bold', fontSize: 12 }}
                    label={{ value: 'Taux (%)', angle: -90, position: 'insideLeft', style: { fontWeight: 'bold' } }}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                            <p className="font-black mb-2 text-lg">{data.nom}</p>
                            <div className="space-y-1">
                              <p className="font-bold text-sm">Taux: <span className="text-success">{data.taux}%</span></p>
                              <p className="font-bold text-sm">Encaissé: {formaterMontant(data.encaisse)}</p>
                              <p className="font-bold text-sm">Attendu: {formaterMontant(data.attendu)}</p>
                              <p className="font-bold text-sm">Élèves: {data.count}</p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="taux" 
                    fill="hsl(var(--success))" 
                    name="Taux de recouvrement"
                    radius={[8, 8, 0, 0]}
                    animationDuration={800}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="brutal-card p-6 bg-gradient-to-br from-purple-50 to-white">
              <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
                <Target className="w-7 h-7 text-accent" />
                TAUX DE RECOUVREMENT PAR FILIÈRE
              </h3>
              <ResponsiveContainer width="100%" height={450}>
                <BarChart data={tauxRecouvrementFiliere?.slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="5 5" stroke="#8b5cf6" strokeOpacity={0.3} />
                  <XAxis 
                    dataKey="nom" 
                    angle={-45} 
                    textAnchor="end" 
                    height={120}
                    tick={{ fill: '#000', fontWeight: 'bold', fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fill: '#8b5cf6', fontWeight: 'bold', fontSize: 12 }}
                    label={{ value: 'Taux (%)', angle: -90, position: 'insideLeft', style: { fontWeight: 'bold' } }}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                            <p className="font-black mb-2 text-lg">{data.nom}</p>
                            <div className="space-y-1">
                              <p className="font-bold text-sm">Taux: <span className="text-accent">{data.taux}%</span></p>
                              <p className="font-bold text-sm">Encaissé: {formaterMontant(data.encaisse)}</p>
                              <p className="font-bold text-sm">Attendu: {formaterMontant(data.attendu)}</p>
                              <p className="font-bold text-sm">Élèves: {data.count}</p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="taux" 
                    fill="hsl(var(--accent))" 
                    name="Taux de recouvrement"
                    radius={[8, 8, 0, 0]}
                    animationDuration={800}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="brutal-card p-6">
                <h3 className="text-2xl font-black mb-4">DÉTAIL RECOUVREMENT CAMPUS</h3>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b-2 border-black">
                        <th className="px-2 py-2 text-left font-black text-xs">Campus</th>
                        <th className="px-2 py-2 text-right font-black text-xs">Élèves</th>
                        <th className="px-2 py-2 text-right font-black text-xs">Attendu</th>
                        <th className="px-2 py-2 text-right font-black text-xs">Encaissé</th>
                        <th className="px-2 py-2 text-right font-black text-xs">Taux</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tauxRecouvrementCampus?.map((stat: any, index: number) => (
                        <tr key={index} className="border-b border-black">
                          <td className="px-2 py-2 text-sm font-bold">{stat.nom}</td>
                          <td className="px-2 py-2 text-right font-black">{stat.count}</td>
                          <td className="px-2 py-2 text-right font-black text-xs">
                            {formaterMontant(stat.attendu)}
                          </td>
                          <td className="px-2 py-2 text-right font-black text-xs">
                            {formaterMontant(stat.encaisse)}
                          </td>
                          <td className="px-2 py-2 text-right">
                            <span className={`font-black text-sm px-2 py-1 rounded-lg ${
                              stat.taux >= 80 ? 'bg-success/20 text-success' :
                              stat.taux >= 50 ? 'bg-warning/20 text-warning' :
                              'bg-destructive/20 text-destructive'
                            }`}>
                              {stat.taux}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card className="brutal-card p-6">
                <h3 className="text-2xl font-black mb-4">DÉTAIL RECOUVREMENT FILIÈRES</h3>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b-2 border-black">
                        <th className="px-2 py-2 text-left font-black text-xs">Filière</th>
                        <th className="px-2 py-2 text-right font-black text-xs">Élèves</th>
                        <th className="px-2 py-2 text-right font-black text-xs">Attendu</th>
                        <th className="px-2 py-2 text-right font-black text-xs">Encaissé</th>
                        <th className="px-2 py-2 text-right font-black text-xs">Taux</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tauxRecouvrementFiliere?.map((stat: any, index: number) => (
                        <tr key={index} className="border-b border-black">
                          <td className="px-2 py-2 text-sm font-bold">{stat.nom}</td>
                          <td className="px-2 py-2 text-right font-black">{stat.count}</td>
                          <td className="px-2 py-2 text-right font-black text-xs">
                            {formaterMontant(stat.attendu)}
                          </td>
                          <td className="px-2 py-2 text-right font-black text-xs">
                            {formaterMontant(stat.encaisse)}
                          </td>
                          <td className="px-2 py-2 text-right">
                            <span className={`font-black text-sm px-2 py-1 rounded-lg ${
                              stat.taux >= 80 ? 'bg-success/20 text-success' :
                              stat.taux >= 50 ? 'bg-warning/20 text-warning' :
                              'bg-destructive/20 text-destructive'
                            }`}>
                              {stat.taux}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
