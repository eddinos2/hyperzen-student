import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extraire le type de formulaire depuis l'URL
    const url = new URL(req.url);
    const formType = url.searchParams.get('type') || 'inscription_standard';

    console.log('🔔 Typeform webhook received');
    console.log('📋 Form type:', formType);

    // Récupérer la configuration depuis la DB
    const { data: config, error: configError } = await supabase
      .from('typeform_configs')
      .select('*')
      .eq('form_type', formType)
      .eq('actif', true)
      .single();

    if (configError || !config) {
      console.error('❌ Configuration not found or inactive for type:', formType);
      throw new Error(`Configuration not found for form type: ${formType}`);
    }

    console.log('✅ Configuration loaded:', config.form_name);

    const mapping = config.field_mappings;

    const payload = await req.json();

    const formResponse = payload.form_response;
    if (!formResponse) {
      throw new Error('Invalid Typeform payload');
    }

    const answers = formResponse.answers || [];
    const fields = formResponse.definition?.fields || [];

    console.log('📊 Total answers:', answers.length);
    console.log('📊 Total fields:', fields.length);

    // Helper function to find answer by field title or ref
    const findAnswer = (titleKeywords: string[], ref?: string): string | null => {
      // Try by ref first if provided
      if (ref) {
        const answerByRef = answers.find((a: any) => a.field?.ref === ref);
        if (answerByRef) {
          const value = answerByRef.text || answerByRef.email || answerByRef.phone_number || answerByRef.date || null;
          if (value) {
            console.log(`✅ Found by ref ${ref}:`, value);
            return value;
          }
        }
      }

      // Try by title keywords
      for (const answer of answers) {
        const field = fields.find((f: any) => f.id === answer.field?.id);
        if (field) {
          const fieldTitle = field.title?.toLowerCase() || '';
          const matchesKeyword = titleKeywords.some(keyword => 
            fieldTitle.includes(keyword.toLowerCase())
          );
          
          if (matchesKeyword) {
            const value = answer.text || answer.email || answer.phone_number || answer.date || null;
            if (value) {
              console.log(`✅ Found by title "${field.title}":`, value);
              return value;
            }
          }
        }
      }
      
      console.log(`❌ Not found for keywords:`, titleKeywords);
      return null;
    };

    // Helper for choice fields
    const findChoice = (titleKeywords: string[], ref?: string): string | null => {
      if (ref) {
        const answerByRef = answers.find((a: any) => a.field?.ref === ref && a.type === 'choice');
        if (answerByRef && answerByRef.choice) {
          console.log(`✅ Choice found by ref ${ref}:`, answerByRef.choice.label);
          return answerByRef.choice.label;
        }
      }

      for (const answer of answers) {
        if (answer.type === 'choice') {
          const field = fields.find((f: any) => f.id === answer.field?.id);
          if (field) {
            const fieldTitle = field.title?.toLowerCase() || '';
            const matchesKeyword = titleKeywords.some(keyword => 
              fieldTitle.includes(keyword.toLowerCase())
            );
            
            if (matchesKeyword && answer.choice) {
              console.log(`✅ Choice found by title "${field.title}":`, answer.choice.label);
              return answer.choice.label;
            }
          }
        }
      }
      
      console.log(`❌ Choice not found for keywords:`, titleKeywords);
      return null;
    };

    // Extract student data using the mapping configuration
    const studentData: any = {
      email: findAnswer(mapping.email?.keywords || ['email'], mapping.email?.ref) || '',
      prenom: findAnswer(mapping.prenom?.keywords || ['prenom'], mapping.prenom?.ref) || '',
      nom: findAnswer(mapping.nom?.keywords || ['nom'], mapping.nom?.ref) || '',
      telephone: findAnswer(mapping.telephone?.keywords || ['telephone'], mapping.telephone?.ref) || '',
      date_naissance: findAnswer(mapping.date_naissance?.keywords || ['date de naissance'], mapping.date_naissance?.ref),
      source_inscription: `typeform_${formType}`,
      statut_inscription: config.statut_dossier || 'En attente',
      date_inscription: formResponse.submitted_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    };

    // Build address from multiple fields
    const addressParts: string[] = [];
    const addr1 = mapping.address ? findAnswer(mapping.address.keywords, mapping.address.ref) : null;
    const addr2 = mapping.address2 ? findAnswer(mapping.address2.keywords, mapping.address2.ref) : null;
    const city = mapping.city ? findAnswer(mapping.city.keywords, mapping.city.ref) : null;
    const zip = mapping.zip ? findAnswer(mapping.zip.keywords, mapping.zip.ref) : null;
    const country = mapping.country ? findAnswer(mapping.country.keywords, mapping.country.ref) : null;
    
    if (addr1) addressParts.push(addr1);
    if (addr2) addressParts.push(addr2);
    if (city) addressParts.push(city);
    if (zip) addressParts.push(zip);
    if (country) addressParts.push(country);
    
    const adresse = addressParts.filter(Boolean).join(', ');
    if (adresse) {
      studentData.adresse = adresse;
    }

    // Emergency contact
    const representantNom = mapping.contact_urgence_nom 
      ? findAnswer(mapping.contact_urgence_nom.keywords, mapping.contact_urgence_nom.ref)
      : null;
    const representantEmail = mapping.contact_urgence_email 
      ? findAnswer(mapping.contact_urgence_email.keywords, mapping.contact_urgence_email.ref)
      : null;
    
    if (representantNom || representantEmail) {
      studentData.contact_urgence = {
        nom: representantNom || '',
        email: representantEmail || '',
        relation: 'Représentant légal',
      };
    }

    // Get chosen program
    const filiereChoisie = mapping.filiere 
      ? findChoice(mapping.filiere.keywords, mapping.filiere.ref) || ''
      : '';

    console.log('📝 Extracted data:', {
      email: studentData.email,
      prenom: studentData.prenom,
      nom: studentData.nom,
      telephone: studentData.telephone,
      filiere: filiereChoisie,
    });

    // Validate required fields
    if (!studentData.email || !studentData.nom || !studentData.prenom) {
      console.error('❌ Missing required fields:', {
        email: !!studentData.email,
        nom: !!studentData.nom,
        prenom: !!studentData.prenom,
      });
      throw new Error('Missing required fields (nom, prenom, email)');
    }

    // Check if student already exists
    const { data: existingStudent } = await supabase
      .from('eleves')
      .select('id')
      .eq('email', studentData.email)
      .maybeSingle();

    let studentId: string;
    let action: string;

    if (existingStudent) {
      // Update existing student
      const { error: updateError } = await supabase
        .from('eleves')
        .update(studentData)
        .eq('id', existingStudent.id);

      if (updateError) throw updateError;

      studentId = existingStudent.id;
      action = 'updated';
      console.log('✏️ Student updated:', existingStudent.id);
    } else {
      // Create new student
      const { data: newStudent, error: insertError } = await supabase
        .from('eleves')
        .insert([studentData])
        .select()
        .single();

      if (insertError) throw insertError;

      studentId = newStudent.id;
      action = 'created';
      console.log('✨ New student created:', newStudent.id);
    }

    // Create/update dossier if filiere provided
    let dossierId: string | null = null;
    if (filiereChoisie && studentId) {
      const { data: filiereData } = await supabase
        .from('filieres')
        .select('id, nom')
        .ilike('nom', `%${filiereChoisie.substring(0, 15)}%`)
        .maybeSingle();

      if (filiereData) {
        console.log('📚 Filière found:', filiereData.nom);
        
        const { data: existingDossier } = await supabase
          .from('dossiers_scolarite')
          .select('id')
          .eq('eleve_id', studentId)
          .eq('annee_scolaire', config.annee_scolaire)
          .maybeSingle();

        if (existingDossier) {
          await supabase
            .from('dossiers_scolarite')
            .update({ filiere_id: filiereData.id })
            .eq('id', existingDossier.id);
          dossierId = existingDossier.id;
          console.log('📝 Dossier updated');
        } else {
          const { data: newDossier } = await supabase
            .from('dossiers_scolarite')
            .insert([{
              eleve_id: studentId,
              filiere_id: filiereData.id,
              annee_scolaire: config.annee_scolaire,
              tarif_scolarite: config.tarif_scolarite,
              statut_dossier: config.statut_dossier,
              commentaire: `Créé automatiquement depuis Typeform (${formType})`,
            }])
            .select('id')
            .single();
          dossierId = newDossier?.id || null;
          console.log('📂 Dossier created');
        }

        // Parse payment choices and create règlements
        if (dossierId && mapping.choix_paiement) {
          const choixPaiement = findChoice(
            mapping.choix_paiement.keywords || ['souhaitez-vous régler'],
            mapping.choix_paiement.ref
          );

          let reglementsCreated = 0;

          // Check if "acompte" in choice
          if (choixPaiement && choixPaiement.toLowerCase().includes('acompte')) {
            console.log('💰 Parsing acompte payment...');
            
            // Extract acompte amount (default 900)
            const acompteMatch = choixPaiement.match(/(\d+)€/);
            const montantAcompte = acompteMatch ? parseFloat(acompteMatch[1]) : 900;

            // Get acompte payment method
            const moyenAcompte = mapping.moyen_acompte 
              ? findChoice(mapping.moyen_acompte.keywords || ['régler l\'acompte'], mapping.moyen_acompte.ref)
              : null;

            if (moyenAcompte) {
              const moyenClean = moyenAcompte.includes('Espèces') ? 'Espèces' :
                                 moyenAcompte.includes('Carte') || moyenAcompte.includes('CB') ? 'Carte bancaire' :
                                 moyenAcompte;

              await supabase.from('reglements').insert([{
                dossier_id: dossierId,
                montant: montantAcompte,
                date_reglement: studentData.date_inscription,
                moyen_paiement: moyenClean,
                statut: 'en_attente',
                type_operation: 'paiement',
                commentaire: 'Acompte - En attente de réception',
              }]);
              reglementsCreated++;
              console.log(`✅ Acompte créé: ${montantAcompte}€ (${moyenClean})`);
            }

            // Get solde payment method
            const moyenSolde = mapping.moyen_solde 
              ? findChoice(mapping.moyen_solde.keywords || ['régler le solde'], mapping.moyen_solde.ref)
              : null;

            if (moyenSolde) {
              console.log('💳 Processing solde payment:', moyenSolde);
              
              // Extract number of installments from choice text
              const nbMatch = moyenSolde.match(/(\d+)\s*(chèques|chèque|prélèvements|prélèvement)/i);
              const nbEcheances = nbMatch ? parseInt(nbMatch[1]) : 1;
              
              // Extract amount per installment
              const montantMatch = moyenSolde.match(/(\d+)€/);
              const montantParEcheance = montantMatch ? parseFloat(montantMatch[1]) : 500;

              const moyenClean = moyenSolde.toLowerCase().includes('chèque') ? 'Chèque' :
                                 moyenSolde.toLowerCase().includes('prélèvement') ? 'Prélèvement' :
                                 'Virement';

              // Create multiple règlements for solde
              const reglementsSolde = [];
              for (let i = 1; i <= nbEcheances; i++) {
                const dateEcheance = new Date(studentData.date_inscription);
                dateEcheance.setMonth(dateEcheance.getMonth() + i);
                
                reglementsSolde.push({
                  dossier_id: dossierId,
                  montant: montantParEcheance,
                  date_reglement: dateEcheance.toISOString().split('T')[0],
                  moyen_paiement: moyenClean,
                  numero_piece: moyenClean === 'Chèque' ? `CHQ-${i}` : `PREL-${i}`,
                  statut: 'en_attente',
                  type_operation: 'paiement',
                  commentaire: `Échéance ${i}/${nbEcheances} - En attente de réception`,
                });
              }

              if (reglementsSolde.length > 0) {
                await supabase.from('reglements').insert(reglementsSolde);
                reglementsCreated += reglementsSolde.length;
                console.log(`✅ ${nbEcheances} règlements solde créés (${montantParEcheance}€ chacun)`);
              }
            }
          } else if (choixPaiement && choixPaiement.toLowerCase().includes('totalité')) {
            console.log('💰 Parsing full payment...');
            
            // Extract total amount
            const totalMatch = choixPaiement.match(/(\d+)€/);
            const montantTotal = totalMatch ? parseFloat(totalMatch[1]) : config.tarif_scolarite;

            // Get payment method for totalité
            const moyenTotal = mapping.moyen_totalite 
              ? findChoice(mapping.moyen_totalite.keywords || ['régler les frais'], mapping.moyen_totalite.ref)
              : null;

            if (moyenTotal) {
              const moyenClean = moyenTotal.includes('Espèces') ? 'Espèces' :
                                 moyenTotal.includes('Virement') ? 'Virement' :
                                 moyenTotal.includes('Carte') || moyenTotal.includes('CB') ? 'Carte bancaire' :
                                 moyenTotal;

              await supabase.from('reglements').insert([{
                dossier_id: dossierId,
                montant: montantTotal,
                date_reglement: studentData.date_inscription,
                moyen_paiement: moyenClean,
                statut: 'en_attente',
                type_operation: 'paiement',
                commentaire: 'Paiement totalité - En attente de réception',
              }]);
              reglementsCreated++;
              console.log(`✅ Paiement totalité créé: ${montantTotal}€ (${moyenClean})`);
            }
          }

          console.log(`💳 Total règlements créés: ${reglementsCreated}`);
        }
      }
    }

    console.log('✅ Webhook processed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        action, 
        studentId,
        filiere: filiereChoisie,
        formType,
        configName: config.form_name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('💥 Error processing Typeform webhook:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
