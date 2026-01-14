import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedRow {
  nom: string;
  prenom: string;
  email: string;
  immatriculation?: string;
  telephone?: string;
  adresse?: string;
  statut_inscription?: string;
  filiere?: string;
  rythme?: string;
  campus?: string;
  annee?: string;
  tarif_scolarite: number;
  impaye_anterieur: number;
  commentaire?: string;
  reglements: Array<{
    montant: number;
    moyen_paiement: string;
    date_reglement: string;
    numero_piece?: string;
    statut?: string;
  }>;
}

// Fonction pour canonicaliser les en-têtes (normalisation)
function canonicalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les diacritiques
    .replace(/[^a-z0-9]/g, '') // Garde seulement lettres et chiffres
    .trim();
}

// Fonction pour extraire nom/prénom depuis l'email
function extractNameFromEmail(email: string): { nom: string; prenom: string } {
  const localPart = email.split('@')[0];
  const parts = localPart.split(/[._-]/);
  
  if (parts.length >= 2) {
    return {
      prenom: parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase(),
      nom: parts[1].toUpperCase()
    };
  } else if (parts.length === 1) {
    return {
      prenom: parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase(),
      nom: ''
    };
  }
  
  return { nom: '', prenom: '' };
}

function normaliserMontant(valeur: string): number {
  if (!valeur) return 0;
  // Nettoyer tous les espaces (y compris insécables), euros, et remplacer virgule par point
  const nettoye = valeur
    .replace(/[\s\u00A0\u202F]/g, '') // espaces normaux, insécables, et espaces fines
    .replace(/€/g, '')
    .replace(/,/g, '.');
  const nombre = parseFloat(nettoye);
  return isNaN(nombre) ? 0 : nombre;
}

function normaliserDate(valeur: string): { date: string; isInvalid: boolean; originalValue?: string } {
  const today = new Date().toISOString().split('T')[0];
  
  if (!valeur || !valeur.trim()) {
    return { date: today, isInvalid: true, originalValue: valeur };
  }
  
  // Si la valeur contient "IMPAYE" ou tout autre texte non-date, marquer comme invalide
  const valeurNormalisee = valeur.trim().toUpperCase();
  if (valeurNormalisee.includes('IMPAYE') || 
      valeurNormalisee.includes('IMPAYÉ') ||
      valeurNormalisee.includes('ATTENTE') ||
      valeurNormalisee.includes('NON') ||
      valeurNormalisee.includes('PENDING') ||
      valeurNormalisee === 'X' ||
      valeurNormalisee === '-') {
    return { date: today, isInvalid: true, originalValue: valeur };
  }
  
  const formats = [
    /^(\d{2})\/(\d{2})\/(\d{4})$/,  // JJ/MM/AAAA
    /^(\d{2})\/(\d{2})$/,            // JJ/MM
    /^(\d{4})-(\d{2})-(\d{2})$/,     // AAAA-MM-JJ
  ];
  
  for (const format of formats) {
    const match = valeur.match(format);
    if (match) {
      let jour: string, mois: string, annee: string;
      
      if (match.length === 3) {
        // Format JJ/MM sans année
        jour = match[1];
        mois = match[2];
        annee = new Date().getFullYear().toString();
      } else if (match.length === 4) {
        if (format === formats[2]) {
          // Format ISO AAAA-MM-JJ
          annee = match[1];
          mois = match[2];
          jour = match[3];
        } else {
          // Format JJ/MM/AAAA
          jour = match[1];
          mois = match[2];
          annee = match[3];
        }
      } else {
        continue;
      }
      
      // VALIDATION : Vérifier que le mois et le jour sont valides
      const jourNum = parseInt(jour, 10);
      const moisNum = parseInt(mois, 10);
      const anneeNum = parseInt(annee, 10);
      
      // Mois doit être entre 1 et 12
      if (moisNum < 1 || moisNum > 12) {
        console.log(`⚠️ Date invalide (mois): ${valeur} - mois=${moisNum}`);
        return { date: today, isInvalid: true, originalValue: valeur };
      }
      
      // Jour doit être entre 1 et 31 (validation basique)
      if (jourNum < 1 || jourNum > 31) {
        console.log(`⚠️ Date invalide (jour): ${valeur} - jour=${jourNum}`);
        return { date: today, isInvalid: true, originalValue: valeur };
      }
      
      // Validation complète avec Date
      const dateISO = `${annee}-${mois.padStart(2, '0')}-${jour.padStart(2, '0')}`;
      const dateTest = new Date(dateISO);
      
      // Vérifier que la date est valide (pas de 31 février, etc.)
      if (isNaN(dateTest.getTime()) || 
          dateTest.getFullYear() !== anneeNum ||
          dateTest.getMonth() + 1 !== moisNum ||
          dateTest.getDate() !== jourNum) {
        console.log(`⚠️ Date invalide (format): ${valeur} -> ${dateISO}`);
        return { date: today, isInvalid: true, originalValue: valeur };
      }
      
      return { date: dateISO, isInvalid: false, originalValue: valeur };
    }
  }
  
  // Si aucun format ne correspond, marquer comme invalide
  console.log(`⚠️ Date invalide (format non reconnu): ${valeur}`);
  return { date: today, isInvalid: true, originalValue: valeur };
}

// Fonction pour normaliser les chaînes en supprimant les accents et en uniformisant
function normaliserTexte(texte: string): string {
  if (!texte) return '';
  
  return texte
    .toLowerCase()
    .trim()
    .normalize('NFD') // Décompose les caractères accentués
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/['']/g, '') // Supprime les apostrophes
    .replace(/[\s-]+/g, ' ') // Normalise les espaces et tirets
    .trim();
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

// Fonction pour créer un objet normalisé depuis une ligne CSV
function createNormalizedRow(headers: string[], values: string[]): Record<string, string> {
  const normalized: Record<string, string> = {};
  
  headers.forEach((header, index) => {
    const canonicalKey = canonicalizeHeader(header);
    normalized[canonicalKey] = values[index] || '';
  });
  
  return normalized;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { csvContent, importId, useLocalEmails = false } = await req.json();
    
    // Fonction pour transformer un email en .local si demandé
    const transformEmail = (email: string): string => {
      if (!useLocalEmails || !email) return email;
      const [localPart] = email.split('@');
      return `${localPart}@email.local`;
    };
    
    // Précharger référentiels pour éviter des allers-retours coûteux
    const { data: campusList } = await supabaseClient.from('campus').select('id, nom');
    const { data: filiereList } = await supabaseClient.from('filieres').select('id, nom');
    const { data: anneeList } = await supabaseClient.from('annees_scolaires').select('id, libelle');

    console.log('Référentiels chargés:', {
      campus: campusList?.length,
      filieres: filiereList?.length,
      annees: anneeList?.length
    });

    // Fonction pour créer ou récupérer un campus
    const getOrCreateCampusId = async (name?: string) => {
      if (!name || !name.trim()) return null;
      const normalizedSearch = normaliserTexte(name);
      
      // Chercher dans la liste préchargée
      let found = campusList?.find(c => normaliserTexte(c.nom) === normalizedSearch);
      if (found) return found.id;
      
      // Créer le campus s'il n'existe pas
      console.log(`Création du campus: "${name}"`);
      const { data: newCampus, error } = await supabaseClient
        .from('campus')
        .insert({ nom: name.trim(), actif: true })
        .select()
        .single();
      
      if (error) {
        console.error(`Erreur création campus "${name}":`, error);
        return null;
      }
      
      // Ajouter à la liste pour réutilisation
      if (campusList) {
        campusList.push(newCampus);
      }
      
      return newCampus.id;
    };
    
    // Fonction pour créer ou récupérer une filière
    const getOrCreateFiliereId = async (name?: string) => {
      if (!name || !name.trim()) return null;
      const normalizedSearch = normaliserTexte(name);
      
      // Chercher dans la liste préchargée
      let found = filiereList?.find(f => normaliserTexte(f.nom) === normalizedSearch);
      if (found) return found.id;
      
      // Créer la filière si elle n'existe pas
      console.log(`Création de la filière: "${name}"`);
      const { data: newFiliere, error } = await supabaseClient
        .from('filieres')
        .insert({ nom: name.trim(), actif: true })
        .select()
        .single();
      
      if (error) {
        console.error(`Erreur création filière "${name}":`, error);
        return null;
      }
      
      // Ajouter à la liste pour réutilisation
      if (filiereList) {
        filiereList.push(newFiliere);
      }
      
      return newFiliere.id;
    };
    
    // Fonction pour créer ou récupérer une année scolaire
    const getOrCreateAnneeId = async (libelle?: string) => {
      const search = libelle || '1A';
      const normalizedSearch = normaliserTexte(search);
      
      // Chercher dans la liste préchargée
      let found = anneeList?.find(a => normaliserTexte(a.libelle) === normalizedSearch);
      if (found) return found.id;
      
      // Créer l'année si elle n'existe pas
      console.log(`Création de l'année: "${search}"`);
      const ordre = search.includes('2') ? 2 : (search.toLowerCase().includes('prepa') ? 0 : 1);
      
      const { data: newAnnee, error } = await supabaseClient
        .from('annees_scolaires')
        .insert({ libelle: search.trim(), ordre })
        .select()
        .single();
      
      if (error) {
        console.error(`Erreur création année "${search}":`, error);
        return null;
      }
      
      // Ajouter à la liste pour réutilisation
      if (anneeList) {
        anneeList.push(newAnnee);
      }
      
      return newAnnee.id;
    };
    
    const lines = csvContent.split('\n').filter((l: string) => l.trim());
    let rawHeaders = parseCsvLine(lines[0]);
    
    // Supprimer le BOM si présent sur le premier en-tête
    if (rawHeaders[0]) {
      rawHeaders[0] = rawHeaders[0].replace(/^\uFEFF/, '');
    }
    
    const headers = rawHeaders;
    
    const elevesMap = new Map<string, ParsedRow>();
    const anomalies: any[] = [];
    let lignesTraitees = 0;
    
    // Statistiques détaillées d'import
    const stats = {
      lignes_csv_total: lines.length - 1, // -1 pour header
      eleves_trouves: 0,
      eleves_importes: 0,
      reglements_trouves: 0,
      reglements_importes: 0,
      reglements_rejetes: [] as Array<{
        eleve: string;
        email: string;
        reglement_numero: number;
        montant: string;
        date: string;
        date_originale?: string;
        motif: string;
      }>
    };
    
    for (let i = 1; i < lines.length; i++) {
      lignesTraitees++;
      const values = parseCsvLine(lines[i]);
      
      if (values.length < headers.length || !values[2]) {
        continue;
      }
      
      const row: any = {};
      const rowNormalized: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
        rowNormalized[canonicalizeHeader(header)] = values[index] || '';
      });
      
      const email = transformEmail((rowNormalized.mail || rowNormalized.email || '')?.toLowerCase().trim());
      if (!email || !email.includes('@')) {
        anomalies.push({
          type_anomalie: 'email_invalide',
          severite: 'critique',
          description: `Email invalide à la ligne ${i + 1}`,
          details: { ligne: i + 1, email }
        });
        continue;
      }
      
      let nom = (rowNormalized.nom || '').toUpperCase().trim();
      let prenom = (rowNormalized.prenom || rowNormalized.prenoms || '').trim();
      
      // Fallback : extraire depuis l'email si nom ou prénom vide
      if (!nom || !prenom) {
        const extracted = extractNameFromEmail(email);
        if (!nom) nom = extracted.nom;
        if (!prenom) prenom = extracted.prenom;
        
        if (!nom || !prenom) {
          anomalies.push({
            type_anomalie: 'identite_incomplete',
            severite: 'info',
            description: `Nom ou prénom manquant pour ${email}`,
            details: { ligne: i + 1 }
          });
        }
      }
      
      const tarifStr = rowNormalized.tarifscolarite || rowNormalized.tarif_scolarite || '0';
      const tarif = normaliserMontant(tarifStr);
      
      if (tarif <= 0) {
        anomalies.push({
          type_anomalie: 'donnees_manquantes',
          severite: 'alerte',
          description: `Tarif de scolarité manquant ou invalide pour ${nom} ${prenom}`,
          details: { ligne: i + 1, tarif: tarifStr },
          action_proposee: 'Renseigner le tarif de scolarité dans le dossier'
        });
      }
      
      const reglements: any[] = [];
      
      // Parser l'ACOMPTE (qui est le premier règlement)
      // L'acompte utilise MOYEN RGLT1 et DATE RGLT1
      const acompteStr = rowNormalized.acompte;
      if (acompteStr && acompteStr.trim()) {
        stats.reglements_trouves++; // Règlement trouvé
        const montantAcompte = normaliserMontant(acompteStr);
        if (montantAcompte > 0) {
          const moyenAcompte = rowNormalized.moyenrglt1 || 'Acompte';
          const dateAcompteStr = rowNormalized.daterglt1;
          const dateResult = normaliserDate(dateAcompteStr);
          
          // Importer le règlement même avec date invalide, mais marquer comme impaye
          const statut = dateResult.isInvalid ? 'impaye' : 'valide';
          
          if (dateResult.isInvalid) {
            stats.reglements_rejetes.push({
              eleve: `${nom} ${prenom}`,
              email: email,
              reglement_numero: 1,
              montant: acompteStr,
              date: dateAcompteStr || 'VIDE',
              date_originale: dateResult.originalValue,
              motif: 'Importé avec statut IMPAYE (date invalide)'
            });
            console.log(`⚠️ ACOMPTE marqué IMPAYE pour ${nom} ${prenom}: date="${dateAcompteStr}"`);
          } else {
            console.log(`✅ ACOMPTE IMPORTÉ pour ${nom} ${prenom}: ${montantAcompte}€ le ${dateResult.date}`);
          }
          
          reglements.push({
            montant: montantAcompte,
            moyen_paiement: moyenAcompte.trim(),
            date_reglement: dateResult.date,
            date_originale: dateResult.originalValue,
            statut: statut,
          });
          stats.reglements_importes++;
        }
      }
      
      // Parser RGLT2 à RGLT13 (RGLT1 est utilisé pour l'acompte)
      for (let j = 2; j <= 13; j++) {
        const montantKey = `montantrglt${j}`;
        const moyenKey = `moyenrglt${j}`;
        const dateKey = `daterglt${j}`;
        
        const montantStr = rowNormalized[montantKey];
        const moyen = rowNormalized[moyenKey];
        const dateStr = rowNormalized[dateKey];
        
        if (montantStr && montantStr.trim()) {
          stats.reglements_trouves++; // Règlement trouvé
          const montant = normaliserMontant(montantStr);
          
          if (montant > 0) {
            const dateResult = normaliserDate(dateStr);
            
            // Importer le règlement même avec date invalide, mais marquer comme impaye
            const statut = dateResult.isInvalid ? 'impaye' : 'valide';
            
            if (dateResult.isInvalid) {
              stats.reglements_rejetes.push({
                eleve: `${nom} ${prenom}`,
                email: email,
                reglement_numero: j,
                montant: montantStr,
                date: dateStr || 'VIDE',
                date_originale: dateResult.originalValue,
                motif: 'Importé avec statut IMPAYE (date invalide)'
              });
              console.log(`⚠️ RGLT${j} marqué IMPAYE pour ${nom} ${prenom}: date="${dateStr}"`);
            } else {
              console.log(`✅ RGLT${j} IMPORTÉ pour ${nom} ${prenom}: ${montant}€ le ${dateResult.date}`);
            }
            
            // Si pas de moyen de paiement, utiliser "Non spécifié" mais accepter le règlement
            const moyenFinal = (moyen && moyen.trim()) ? moyen.trim() : 'Non spécifié';
            
            if (!moyen || !moyen.trim()) {
              anomalies.push({
                type_anomalie: 'moyen_manquant',
                severite: 'info',
                description: `Moyen de paiement manquant pour ${nom} ${prenom} - RGLT${j}`,
                details: { ligne: i + 1, reglement: j, montant }
              });
            }
            
            if (montant > tarif * 3) {
              anomalies.push({
                type_anomalie: 'montant_aberrant',
                severite: 'alerte',
                description: `Montant aberrant pour ${nom} ${prenom} - RGLT${j}`,
                details: { ligne: i + 1, montant, tarif }
              });
            }
            
            reglements.push({
              montant,
              moyen_paiement: moyenFinal,
              date_reglement: dateResult.date,
              date_originale: dateResult.originalValue,
              statut: statut,
            });
            stats.reglements_importes++;
          }
        }
      }
      
      // IMPORTANT: NE PAS utiliser les colonnes "IMPAYE 24/25" et "DIFFERENCE" du CSV
      // car elles sont fausses. On met impaye_anterieur à 0 par défaut.
      // Le système calculera automatiquement le statut en comparant tarif et règlements.
      const impaye_anterieur = 0;
      
      // Calculer le total versé pour validation
      const totalVerse = reglements.reduce((sum, r) => sum + r.montant, 0);
      
      // Log pour débogage
      console.log(`${nom} ${prenom}: Tarif=${tarif}, Total versé calculé=${totalVerse}, Nb règlements=${reglements.length}`);
      
      // Vérifier cohérence
      if (totalVerse > tarif * 2) {
        anomalies.push({
          type_anomalie: 'total_aberrant',
          severite: 'alerte',
          description: `${nom} ${prenom} a versé plus de 2x le tarif (${totalVerse}€ > ${tarif * 2}€)`,
          details: { ligne: i + 1, totalVerse, tarif }
        });
      }
      
      // Récupérer l'immatriculation depuis le CSV (colonnes ID ou IMMATRICULATION)
      const immatriculationCsv = rowNormalized.immatriculation || rowNormalized.id || rowNormalized.identifiant || '';
      
      stats.eleves_trouves++; // Élève trouvé dans le CSV
      
      elevesMap.set(email, {
        nom,
        prenom,
        email,
        immatriculation: immatriculationCsv.trim(),
        telephone: rowNormalized.numero || rowNormalized.telephone || '',
        adresse: rowNormalized.adresse || '',
        statut_inscription: 'Inscrit', // Par défaut "Inscrit", modifiable ensuite
        filiere: rowNormalized.filiere || rowNormalized.filiare || '',
        rythme: rowNormalized.rythme || '',
        campus: rowNormalized.campus || '',
        annee: rowNormalized['1a2a'] || rowNormalized.annee || rowNormalized.anneeetude || '',
        tarif_scolarite: tarif,
        impaye_anterieur: impaye_anterieur,
        commentaire: rowNormalized.commentaire || '',
        reglements,
      });
    }
    
    // Préparer les données pour insertion en masse
    const elevesArray = Array.from(elevesMap.values());
    console.log(`\n📊 STATISTIQUES IMPORT:
    - Lignes CSV totales: ${stats.lignes_csv_total}
    - Élèves trouvés: ${stats.eleves_trouves}
    - Élèves uniques: ${elevesArray.length}
    - Règlements trouvés: ${stats.reglements_trouves}
    - Règlements importés: ${stats.reglements_importes}
    - Règlements rejetés: ${stats.reglements_rejetes.length}
    `);
    
    // Étape 1: Créer tous les référentiels nécessaires d'un coup
    const uniqueCampus = [...new Set(elevesArray.map(e => e.campus).filter(Boolean))];
    const uniqueFilieres = [...new Set(elevesArray.map(e => e.filiere).filter(Boolean))];
    const uniqueAnnees = [...new Set(elevesArray.map(e => e.annee || '1A'))];
    
    for (const campus of uniqueCampus) {
      await getOrCreateCampusId(campus);
    }
    for (const filiere of uniqueFilieres) {
      await getOrCreateFiliereId(filiere);
    }
    for (const annee of uniqueAnnees) {
      await getOrCreateAnneeId(annee);
    }
    
    // Étape 2: UPSERT en masse de tous les élèves
    const elevesToUpsert = elevesArray.map(e => ({
      email: e.email,
      nom: e.nom,
      prenom: e.prenom,
      telephone: e.telephone,
      adresse: e.adresse,
      statut_inscription: e.statut_inscription,
      immatriculation: e.immatriculation || undefined,
    }));
    
    const { data: elevesUpserted, error: upsertError } = await supabaseClient
      .from('eleves')
      .upsert(elevesToUpsert, { 
        onConflict: 'email',
        ignoreDuplicates: false 
      })
      .select('id, email');
    
    if (upsertError) {
      console.error('Erreur upsert élèves:', upsertError);
      throw new Error(`Erreur lors de l\'insertion des élèves: ${upsertError.message}`);
    }
    
    const elevesInseres = elevesUpserted?.length || 0;
    stats.eleves_importes = elevesInseres; // Élèves effectivement importés
    
    console.log(`✅ ${elevesInseres} élèves insérés/mis à jour sur ${elevesArray.length} uniques`);
    
    // Créer un map email -> eleve_id
    const emailToId = new Map(elevesUpserted?.map(e => [e.email, e.id]) || []);
    
    // Étape 3: Préparer et insérer tous les dossiers en masse
    const dossiersToInsert = [];
    const reglementsData = []; // Stocke les règlements avec l'email de l'élève
    
    for (const eleveData of elevesArray) {
      const eleveId = emailToId.get(eleveData.email);
      if (!eleveId) continue;
      
      const campusId = await getOrCreateCampusId(eleveData.campus || undefined);
      const filiereId = await getOrCreateFiliereId(eleveData.filiere || undefined);
      const anneeId = await getOrCreateAnneeId(eleveData.annee || '1A');
      
      dossiersToInsert.push({
        eleve_id: eleveId,
        campus_id: campusId,
        filiere_id: filiereId,
        annee_id: anneeId,
        rythme: eleveData.rythme,
        tarif_scolarite: eleveData.tarif_scolarite,
        impaye_anterieur: eleveData.impaye_anterieur,
        commentaire: eleveData.commentaire,
        annee_scolaire: '2025_2026',
      });
      
      // Stocker les règlements avec l'email pour les associer après
      if (eleveData.reglements.length > 0) {
        reglementsData.push({
          eleveEmail: eleveData.email,
          reglements: eleveData.reglements,
          eleveData: eleveData // Pour calcul des anomalies
        });
      }
    }
    
    const { data: dossiersInserted, error: dossierError } = await supabaseClient
      .from('dossiers_scolarite')
      .insert(dossiersToInsert)
      .select('id, eleve_id');
    
    if (dossierError) {
      console.error('Erreur insertion dossiers:', dossierError);
      throw new Error(`Erreur lors de l\'insertion des dossiers: ${dossierError.message}`);
    }
    
    // Créer un map eleve_id -> dossier_id
    const eleveIdToDossierId = new Map(dossiersInserted?.map(d => [d.eleve_id, d.id]) || []);
    
    // Étape 4: Insérer tous les règlements en masse
    const reglementsToInsert = [];
    for (const { eleveEmail, reglements } of reglementsData) {
      const eleveId = emailToId.get(eleveEmail);
      const dossierId = eleveIdToDossierId.get(eleveId!);
      
      if (dossierId) {
        for (const r of reglements) {
          reglementsToInsert.push({
            dossier_id: dossierId,
            montant: r.montant,
            moyen_paiement: r.moyen_paiement,
            date_reglement: r.date_reglement,
            statut: r.statut || 'valide',
          });
        }
      } else {
        console.error(`❌ DOSSIER INTROUVABLE pour ${eleveEmail} - ${reglements.length} règlements perdus`);
      }
    }
    
    // Log détaillé pour certains cas spécifiques (debug)
    const casSpecifiques = ['KEREKPING', 'ADEOSSI', 'AICHA'];
    for (const nom of casSpecifiques) {
      const eleve = elevesArray.find(e => e.nom.includes(nom));
      if (eleve) {
        const eleveId = emailToId.get(eleve.email);
        const dossierId = eleveIdToDossierId.get(eleveId!);
        const reglementsEleve = reglementsToInsert.filter(r => r.dossier_id === dossierId);
        console.log(`🔍 DEBUG ${nom}:`, {
          email: eleve.email,
          eleve_id: eleveId,
          dossier_id: dossierId,
          reglements_csv: eleve.reglements.length,
          reglements_to_insert: reglementsEleve.length,
          montants: reglementsEleve.map(r => r.montant)
        });
      }
    }
    
    let reglementsInseres = 0;
    const erreursInsertion: any[] = [];
    
    if (reglementsToInsert.length > 0) {
      console.log(`\n🔄 INSERTION DE ${reglementsToInsert.length} RÈGLEMENTS EN BASE`);
      
      // Insérer par batch de 100 (réduit pour meilleur suivi)
      const batchSize = 100;
      for (let i = 0; i < reglementsToInsert.length; i += batchSize) {
        const batch = reglementsToInsert.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(reglementsToInsert.length / batchSize);
        
        console.log(`  📦 Batch ${batchNum}/${totalBatches} (${batch.length} règlements)`);
        
        const { data: inserted, error: reglementError } = await supabaseClient
          .from('reglements')
          .insert(batch)
          .select('id, dossier_id, montant');
        
        if (reglementError) {
          console.error(`  ❌ ERREUR BATCH ${batchNum}:`, reglementError);
          
          // Logger chaque règlement du batch échoué
          batch.forEach((r, idx) => {
            erreursInsertion.push({
              batch: batchNum,
              index: i + idx,
              dossier_id: r.dossier_id,
              montant: r.montant,
              date: r.date_reglement,
              moyen: r.moyen_paiement,
              statut: r.statut,
              erreur: reglementError.message,
              code: reglementError.code,
              details: reglementError.details
            });
          });
          
          // Essayer d'insérer un par un pour isoler les problématiques
          console.log(`  🔍 Tentative insertion unitaire pour batch ${batchNum}...`);
          for (let j = 0; j < batch.length; j++) {
            const { error: singleError } = await supabaseClient
              .from('reglements')
              .insert([batch[j]]);
            
            if (!singleError) {
              reglementsInseres++;
              console.log(`    ✅ Règlement ${j + 1}/${batch.length} inséré`);
            } else {
              console.error(`    ❌ Règlement ${j + 1}/${batch.length} échoué:`, {
                dossier_id: batch[j].dossier_id,
                montant: batch[j].montant,
                erreur: singleError.message
              });
            }
          }
        } else {
          reglementsInseres += batch.length;
          console.log(`  ✅ Batch ${batchNum} inséré (${inserted?.length || batch.length} règlements)`);
        }
      }
      
      console.log(`\n✨ RÉSULTAT INSERTION: ${reglementsInseres}/${reglementsToInsert.length} règlements insérés`);
      if (erreursInsertion.length > 0) {
        console.log(`⚠️ ${erreursInsertion.length} erreurs d'insertion détectées`);
      }
    }
    
    // Étape 5: Calculer les anomalies financières
    for (const { eleveEmail, eleveData } of reglementsData) {
      const eleveId = emailToId.get(eleveEmail);
      const dossierId = eleveIdToDossierId.get(eleveId!);
      
      if (!dossierId) continue;
      
      const totalVerse = eleveData.reglements.reduce((sum: number, r: any) => sum + r.montant, 0);
      const difference = eleveData.tarif_scolarite - totalVerse;
      
      if (Math.abs(difference) >= 0.01 || eleveData.impaye_anterieur !== 0) {
        if (difference < -10) {
          anomalies.push({
            dossier_id: dossierId,
            type_anomalie: 'eleve_crediteur',
            severite: 'alerte',
            description: `${eleveData.nom} ${eleveData.prenom} a versé plus que son tarif`,
            details: { tarif: eleveData.tarif_scolarite, verse: totalVerse, difference }
          });
        } else if (difference > eleveData.tarif_scolarite * 0.5) {
          anomalies.push({
            dossier_id: dossierId,
            type_anomalie: 'solde_important',
            severite: 'info',
            description: `${eleveData.nom} ${eleveData.prenom} a un solde important`,
            details: { tarif: eleveData.tarif_scolarite, verse: totalVerse, reste: difference }
          });
        }
      }
    }
    
    if (anomalies.length > 0) {
      await supabaseClient
        .from('anomalies')
        .insert(anomalies);
    }
    
    await supabaseClient
      .from('imports')
      .update({
        statut: 'termine',
        lignes_total: lignesTraitees,
        lignes_inserees: elevesInseres,
        lignes_ignorees: 0,
        lignes_rejetees: lignesTraitees - elevesInseres,
        rapport: {
          // Statistiques générales
          lignes_csv_total: stats.lignes_csv_total,
          eleves_trouves: stats.eleves_trouves,
          eleves_uniques: elevesArray.length,
          eleves_importes: stats.eleves_importes,
          
          // Statistiques règlements
          reglements_trouves: stats.reglements_trouves,
          reglements_importes: stats.reglements_importes,
          reglements_rejetes_count: stats.reglements_rejetes.length,
          reglements_rejetes_details: stats.reglements_rejetes,
          
          // Insertion en base
          reglements_a_inserer: reglementsToInsert.length,
          reglements_inseres_db: reglementsInseres,
          reglements_perdus: reglementsToInsert.length - reglementsInseres,
          erreurs_insertion_count: erreursInsertion.length,
          erreurs_insertion_details: erreursInsertion.slice(0, 50), // Limiter à 50 pour éviter rapport trop lourd
          
          // Autres
          anomaliesDetectees: anomalies.length,
          
          // Résumé
          resume: {
            taux_import_eleves: `${Math.round((stats.eleves_importes / stats.lignes_csv_total) * 100)}%`,
            taux_import_reglements: stats.reglements_trouves > 0 
              ? `${Math.round((stats.reglements_importes / stats.reglements_trouves) * 100)}%` 
              : 'N/A',
            taux_insertion_db: reglementsToInsert.length > 0
              ? `${Math.round((reglementsInseres / reglementsToInsert.length) * 100)}%`
              : 'N/A',
            eleves_non_importes: stats.eleves_trouves - stats.eleves_importes,
            reglements_perdus_insertion: reglementsToInsert.length - reglementsInseres
          }
        }
      })
      .eq('id', importId);

    console.log(`\n✅ IMPORT TERMINÉ:
    📊 Élèves: ${stats.eleves_importes}/${stats.eleves_trouves} importés
    💰 Règlements: ${stats.reglements_importes}/${stats.reglements_trouves} importés
    ❌ Règlements rejetés: ${stats.reglements_rejetes.length}
    ⚠️ Anomalies: ${anomalies.length}
    `);

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          lignes_csv_total: stats.lignes_csv_total,
          eleves_trouves: stats.eleves_trouves,
          eleves_importes: stats.eleves_importes,
          reglements_trouves: stats.reglements_trouves,
          reglements_importes: stats.reglements_importes,
          reglements_rejetes: stats.reglements_rejetes.length,
        },
        elevesInseres,
        reglementsInseres,
        anomaliesDetectees: anomalies.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erreur:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';

    // Marquer l'import en échec pour ne pas rester bloqué "en_cours"
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      const { importId } = await req.json().catch(() => ({ importId: null }));
      if (importId) {
        await supabaseClient
          .from('imports')
          .update({
            statut: 'echec',
            rapport: { erreur: errorMessage },
          })
          .eq('id', importId);
      }
    } catch (e) {
      console.error('Erreur lors de la mise à jour du statut import:', e);
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
