import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JotFormRow {
  prenom: string;
  nom: string;
  immatriculation_id: string;
  date_naissance: string;
  email: string;
  telephone: string;
  adresse: string;
  ville: string;
  code_postal: string;
  filiere_1ere?: string;
  filiere_2eme?: string;
  annee_entree: string;
  moyen_paiement_acompte: string;
  moyen_paiement_scolarite: string;
  echeancier_sepa?: string;
  documents_cni?: string;
  documents_rib?: string;
  submission_id: string;
  submission_date: string;
  submission_url: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { csvContent } = await req.json();

    if (!csvContent) {
      throw new Error('csvContent is required');
    }

    // Créer un log de synchronisation
    const { data: syncLog } = await supabase
      .from('sync_logs')
      .insert({
        type_sync: 'google_sheets',
        statut: 'en_cours'
      })
      .select()
      .single();

    const rapport = {
      crees: 0,
      doublons: 0,
      erreurs: [] as string[],
      details: [] as any[]
    };

    // Parser le CSV
    const lines = csvContent.split('\n').filter((l: string) => l.trim());
    const headers = parseCsvLine(lines[0]);
    
    // Mapper les colonnes CSV vers nos champs
    const colonneMap: Record<string, number> = {};
    headers.forEach((header: string, index: number) => {
      const normalized = normalizeHeader(header);
      colonneMap[normalized] = index;
    });

    console.log('Headers détectés:', Object.keys(colonneMap));

    // Traiter chaque ligne (en sautant l'en-tête)
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCsvLine(lines[i]);
        
        // Extraire les données
        const prenom = values[colonneMap['prenom']] || '';
        const nom = values[colonneMap['nom']] || '';
        const immatriculation_id = values[colonneMap['immatriculation_id']] || '';
        const email = values[colonneMap['email']] || '';
        
        if (!email || !prenom || !nom) {
          rapport.erreurs.push(`Ligne ${i + 1}: Données incomplètes (email, prénom ou nom manquant)`);
          continue;
        }

        // Vérifier les doublons par email
        const { data: existingByEmail } = await supabase
          .from('eleves')
          .select('id, email')
          .eq('email', email)
          .maybeSingle();

        if (existingByEmail) {
          rapport.doublons++;
          rapport.details.push({
            ligne: i + 1,
            email,
            raison: 'Email existe déjà'
          });
          continue;
        }

        // Vérifier les doublons par submission_id
        const submission_id = values[colonneMap['submission_id']] || '';
        if (submission_id) {
          const { data: existingBySubmission } = await supabase
            .from('eleves')
            .select('id, jotform_submission_id')
            .eq('jotform_submission_id', submission_id)
            .maybeSingle();

          if (existingBySubmission) {
            rapport.doublons++;
            rapport.details.push({
              ligne: i + 1,
              email,
              raison: 'Submission ID existe déjà'
            });
            continue;
          }
        }

        // Préparer les données de l'élève
        const telephone = values[colonneMap['telephone']]?.replace(/[^\d+]/g, '') || '';
        const adresse = [
          values[colonneMap['adresse']],
          values[colonneMap['code_postal']],
          values[colonneMap['ville']]
        ].filter(Boolean).join(', ');

        // Documents joints
        const documents_joints: any = {};
        const cni_url = values[colonneMap['cni']] || '';
        const rib_url = values[colonneMap['rib']] || '';
        
        if (cni_url) {
          documents_joints.cni = cni_url.split('\n').filter((url: string) => url.trim());
        }
        if (rib_url) {
          documents_joints.rib = rib_url;
        }

        // Préférences de paiement
        const preferences_paiement = {
          acompte: values[colonneMap['moyen_paiement_acompte']] || '',
          scolarite: values[colonneMap['moyen_paiement_scolarite']] || '',
          echeancier_sepa: values[colonneMap['echeancier_sepa']] || ''
        };

        // Créer l'élève
        const { data: eleve, error: eleveError } = await supabase
          .from('eleves')
          .insert({
            nom,
            prenom,
            email,
            telephone: telephone || null,
            adresse: adresse || null,
            immatriculation: immatriculation_id || null, // Si vide, trigger générera automatiquement
            statut_validation: 'en_attente',
            source_inscription: 'jotform',
            documents_joints,
            preferences_paiement,
            jotform_submission_id: submission_id,
            jotform_submission_date: values[colonneMap['submission_date']] || null
          })
          .select()
          .single();

        if (eleveError) {
          console.error('Erreur création élève:', eleveError);
          rapport.erreurs.push(`Ligne ${i + 1} (${email}): ${eleveError.message}`);
          continue;
        }

        // Créer le dossier de scolarité
        const annee_entree = values[colonneMap['annee_entree']] || '';
        const filiere = values[colonneMap['filiere_1ere']] || values[colonneMap['filiere_2eme']] || '';

        const { error: dossierError } = await supabase
          .from('dossiers_scolarite')
          .insert({
            eleve_id: eleve.id,
            annee_scolaire: '2025_2026',
            tarif_scolarite: 0, // À définir manuellement
            statut_dossier: 'en_cours',
            moyen_paiement_acompte: preferences_paiement.acompte,
            moyen_paiement_scolarite: preferences_paiement.scolarite,
            echeancier_sepa: preferences_paiement.echeancier_sepa,
            validation_paiement_manuelle: true,
            commentaire: `Importé depuis JotForm - Filière souhaitée: ${filiere}, Année: ${annee_entree}`
          });

        if (dossierError) {
          console.error('Erreur création dossier:', dossierError);
          rapport.erreurs.push(`Ligne ${i + 1} (${email}): Erreur création dossier - ${dossierError.message}`);
        } else {
          rapport.crees++;
        }

      } catch (error: any) {
        console.error(`Erreur ligne ${i + 1}:`, error);
        rapport.erreurs.push(`Ligne ${i + 1}: ${error.message}`);
      }
    }

    // Mettre à jour le log de synchronisation
    await supabase
      .from('sync_logs')
      .update({
        ended_at: new Date().toISOString(),
        statut: rapport.erreurs.length > 0 ? 'partial' : 'success',
        rapport
      })
      .eq('id', syncLog.id);

    console.log('Rapport final:', rapport);

    return new Response(
      JSON.stringify({
        success: true,
        rapport
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Erreur globale:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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

function normalizeHeader(header: string): string {
  const map: Record<string, string> = {
    'identité de l\'étudiant - prénom': 'prenom',
    'identité de l\'étudiant - nom de famille': 'nom',
    '<strong>immatriculation id</strong>': 'immatriculation_id',
    'date de naissance de l\'étudiant': 'date_naissance',
    'adresse mail de l\'étudiant': 'email',
    'numéro de téléphone de l\'étudiant': 'telephone',
    'adresse de résidence actuelle de l\'étudiant - adresse': 'adresse',
    'adresse de résidence actuelle de l\'étudiant - ville': 'ville',
    'adresse de résidence actuelle de l\'étudiant - code postal': 'code_postal',
    'filière choisie pour une admission en 1ère année de bts :': 'filiere_1ere',
    'filière choisie pour une admission en 2ème année de bts :': 'filiere_2eme',
    'vous postulez à aurlom bts+ pour une entrée en :': 'annee_entree',
    'choisissez votre moyen de paiement pour le versement de l\'acompte de 400 euros couvrant les frais d\'inscription et de gestion administrative': 'moyen_paiement_acompte',
    'choisissez à présent votre moyen de paiement pour le règlement des frais de scolarité pour l\'année scolaire 2025-2026': 'moyen_paiement_scolarite',
    'si vous optez pour le prélèvement automatique sepa, merci de sélectionner l\'échéancier souhaité ci-dessous :': 'echeancier_sepa',
    'merci de déposer une copie recto et verso de votre carte d\'identité ou de votre titre de séjour en cours de validité au moment de votre inscription (ou du récépissé de demande de renouvellement)': 'cni',
    'joindre le rib du compte à prélever': 'rib',
    'submission id': 'submission_id',
    'submission date': 'submission_date',
    'submission url': 'submission_url'
  };

  const normalized = header.toLowerCase().replace(/\s+/g, ' ').trim();
  return map[normalized] || normalized;
}