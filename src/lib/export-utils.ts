import { formaterMontant, formaterDate } from './calculs';

export const exportToCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    alert('Aucune donnée à exporter');
    return;
  }

  // Extract headers from the first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    // Headers with BOM for proper Excel encoding
    '\uFEFF' + headers.join(';'),
    // Data rows
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values with semicolons or quotes
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(';') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(';')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportReglementsToCSV = (reglements: any[]) => {
  const formattedData = reglements.map(r => {
    const eleve = r.dossiers_scolarite?.eleves;
    return {
      'Nom': eleve?.nom || '',
      'Prénom': eleve?.prenom || '',
      'Email': eleve?.email || '',
      'Date': formaterDate(r.date_reglement),
      'Moyen de paiement': r.moyen_paiement,
      'Montant': formaterMontant(r.montant),
      'N° de pièce': r.numero_piece || '',
      'Commentaire': r.commentaire || '',
      'Statut': r.statut,
    };
  });

  exportToCSV(formattedData, 'reglements');
};

export const exportElevesToCSV = (eleves: any[]) => {
  const formattedData = eleves.map(e => ({
    'Nom': e.nom,
    'Prénom': e.prenom,
    'Email': e.email,
    'Téléphone': e.telephone || '',
    'Adresse': e.adresse || '',
    'Statut inscription': e.statut_inscription || 'Non renseigné',
    'Statut paiement': e.statut_paiement || 'Non calculé',
  }));

  exportToCSV(formattedData, 'eleves');
};

export const exportComptesElevesToCSV = (eleves: any[]) => {
  const formattedData = eleves.map(e => {
    // Gérer l'affichage du mot de passe
    let motDePasse = 'Pas de compte';
    let mdpChange = 'N/A';
    let noteSecurite = '';
    
    if (e.has_account) {
      if (e.credentials?.mot_de_passe_initial) {
        // Compte avec credentials enregistrés
        motDePasse = e.credentials.mot_de_passe_initial;
        mdpChange = e.credentials.mot_de_passe_change ? 'Oui' : 'Non';
      } else {
        // Compte créé mais credentials non enregistrés
        motDePasse = 'NON ENREGISTRÉ';
        mdpChange = 'N/A';
        noteSecurite = 'Compte existe mais mot de passe non sauvegardé dans le système';
      }
    }
    
    return {
      'Nom': e.nom,
      'Prénom': e.prenom,
      'Email': e.email,
      'Immatriculation': e.immatriculation || '',
      'Mot de passe initial': motDePasse,
      'MDP changé': mdpChange,
      'Compte actif': e.has_account ? 'Oui' : 'Non',
      'Note': noteSecurite,
    };
  });

  exportToCSV(formattedData, 'comptes_eleves');
};

export const exportErreursImportToCSV = (erreurs: any[]) => {
  const formattedData = erreurs.map(err => ({
    'Nom': err.eleve?.split(' ')[0] || '',
    'Prénom': err.eleve?.split(' ').slice(1).join(' ') || '',
    'Email': err.email || 'Non disponible',
    'N° Règlement': err.reglement_numero || '',
    'Montant': err.montant || '',
    'Date invalide': err.date || '',
    'Moyen paiement': err.moyen || '',
    'Erreur': err.motif || err.erreur || '',
    'Code erreur': err.code || '',
  }));

  exportToCSV(formattedData, 'erreurs_import');
};

export const exportErreursInsertionToCSV = (erreurs: any[]) => {
  const formattedData = erreurs.map(err => {
    // Extraire le nom/prénom/email depuis le dossier_id en cherchant dans les données
    // Pour l'instant, afficher les infos disponibles
    return {
      'Nom': err.nom || 'N/A',
      'Prénom': err.prenom || 'N/A', 
      'Email': err.email || 'N/A',
      'Batch': err.batch || '',
      'Index dans batch': err.index || '',
      'Dossier ID': err.dossier_id?.substring(0, 8) + '...' || '',
      'Montant': err.montant || '',
      'Date dans CSV': err.date_originale || err.date || '',
      'Moyen paiement': err.moyen || '',
      'Statut prévu': err.statut || '',
      'Erreur PostgreSQL': err.erreur || '',
      'Code erreur': err.code || '',
      'Solution': err.date_originale === '25/26' ? 'Corriger en 25/06/2025 probablement' : 'Vérifier la date dans le CSV'
    };
  });

  exportToCSV(formattedData, 'erreurs_insertion_db');
};

export const exportEcheancesToCSV = (echeances: any[]) => {
  const formattedData = echeances.map(e => {
    const eleve = e.dossiers_scolarite?.eleves;
    return {
      'Nom': eleve?.nom || '',
      'Prénom': eleve?.prenom || '',
      'Email': eleve?.email || '',
      'Date échéance': formaterDate(e.date_echeance),
      'Montant': formaterMontant(e.montant),
      'Statut': e.statut,
    };
  });

  exportToCSV(formattedData, 'echeances');
};

export const exportAnomaliestoCSV = (anomalies: any[]) => {
  const formattedData = anomalies.map(a => {
    const eleve = a.dossiers_scolarite?.eleves;
    return {
      'Nom': eleve?.nom || '',
      'Prénom': eleve?.prenom || '',
      'Type': a.type_anomalie,
      'Sévérité': a.severite,
      'Description': a.description,
      'Action proposée': a.action_proposee || '',
      'Statut': a.statut,
      'Date détection': formaterDate(a.created_at),
    };
  });

  exportToCSV(formattedData, 'anomalies');
};

export const exportRetardsToCSV = (retards: any[]) => {
  const formattedData = retards.map(r => {
    const eleve = r.eleves;
    return {
      'Nom': eleve?.nom || '',
      'Prénom': eleve?.prenom || '',
      'Email': eleve?.email || '',
      'Téléphone': eleve?.telephone || '',
      'Tarif total': formaterMontant(r.tarif_scolarite + (r.impaye_anterieur || 0)),
      'Déjà versé': formaterMontant(r.totalVerse || 0),
      'Reste à payer': formaterMontant(r.resteAPayer || 0),
      'Échéances en retard': r.nbEcheancesRetard || 0,
    };
  });

  exportToCSV(formattedData, 'eleves_retards');
};
