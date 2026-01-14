-- Insérer des modèles d'emails par défaut pour AURLOM BTS+
INSERT INTO public.modeles_documents (nom, type_modele, contenu_html, variables, actif) VALUES
(
  'Relance Niveau 1 - Rappel Amical AURLOM BTS+',
  'email_relance',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: #ffffff; padding: 40px 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 36px; font-weight: 900; letter-spacing: 2px;">AURLOM BTS+</h1>
      <p style="margin: 10px 0 0; font-size: 14px; font-weight: 600; opacity: 0.9;">CENTRE DE FORMATION</p>
    </div>
    
    <div style="padding: 40px 30px;">
      <h2 style="color: #000000; font-size: 22px; font-weight: bold; margin: 0 0 20px;">
        Bonjour {prenom} {nom},
      </h2>
      
      <p style="font-size: 16px; line-height: 1.8; color: #333333;">
        Nous vous contactons concernant votre dossier de scolarité pour l''année en cours.
      </p>
      
      <div style="background: #f0f9ff; padding: 25px; border-radius: 12px; border: 3px solid #06b6d4; margin: 30px 0; text-align: center;">
        <p style="margin: 0 0 10px; font-size: 14px; font-weight: bold; text-transform: uppercase; color: #0891b2;">
          MONTANT RESTANT À RÉGLER
        </p>
        <p style="margin: 0; font-size: 42px; font-weight: 900; color: #06b6d4;">
          {montant} MAD
        </p>
      </div>
      
      <p style="font-size: 15px; line-height: 1.8; color: #666666;">
        Nous vous invitons à régulariser votre situation dès que possible. Pour toute question ou arrangement de paiement, notre équipe administrative reste à votre disposition.
      </p>
      
      <div style="text-align: center; margin: 40px 0;">
        <p style="font-size: 14px; color: #0891b2; font-weight: bold;">
          📧 Contact : administration@aurlombtsplus.ma<br>
          📞 Téléphone : +212 XXX XXX XXX
        </p>
      </div>
      
      <p style="font-size: 14px; color: #999999; text-align: center; margin: 30px 0 0;">
        Cordialement,<br>
        <strong>L''équipe AURLOM BTS+</strong>
      </p>
    </div>
    
    <div style="background: #06b6d4; color: #ffffff; padding: 20px; text-align: center;">
      <p style="margin: 0; font-size: 12px;">© 2025 AURLOM BTS+ - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>',
  jsonb_build_object(
    'niveau', '1',
    'sujet', 'Rappel de paiement - AURLOM BTS+',
    'categorie', 'niveau_1'
  ),
  true
),
(
  'Relance Niveau 2 - Relance Formelle AURLOM BTS+',
  'email_relance',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; padding: 40px 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 36px; font-weight: 900; letter-spacing: 2px;">AURLOM BTS+</h1>
      <p style="margin: 10px 0 0; font-size: 14px; font-weight: 600; opacity: 0.9;">CENTRE DE FORMATION</p>
    </div>
    
    <div style="padding: 40px 30px;">
      <h2 style="color: #d97706; font-size: 22px; font-weight: bold; margin: 0 0 20px;">
        ⚠️ RELANCE FORMELLE
      </h2>
      
      <p style="font-size: 16px; line-height: 1.8; color: #333333;">
        Madame, Monsieur {nom},
      </p>
      
      <p style="font-size: 15px; line-height: 1.8; color: #333333;">
        Malgré notre premier rappel, nous constatons que votre dossier de scolarité présente toujours un impayé.
      </p>
      
      <div style="background: #fef3c7; padding: 25px; border-radius: 12px; border-left: 6px solid #f59e0b; margin: 30px 0;">
        <p style="margin: 0 0 15px; font-size: 14px; font-weight: bold; text-transform: uppercase; color: #92400e;">
          MONTANT DÛ
        </p>
        <p style="margin: 0; font-size: 42px; font-weight: 900; color: #d97706;">
          {montant} MAD
        </p>
      </div>
      
      <div style="background: #fee2e2; padding: 20px; border-radius: 12px; border-left: 4px solid #ef4444; margin: 30px 0;">
        <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #991b1b;">
          <strong>⚠️ Important :</strong> Nous vous demandons de régulariser votre situation sous <strong>7 jours</strong>. À défaut, nous serons contraints de suspendre l''accès à vos services pédagogiques.
        </p>
      </div>
      
      <p style="font-size: 15px; line-height: 1.8; color: #666666;">
        Pour éviter cette situation, veuillez contacter notre service administratif dans les plus brefs délais afin d''établir un plan de règlement adapté.
      </p>
      
      <div style="text-align: center; margin: 40px 0;">
        <p style="font-size: 14px; color: #d97706; font-weight: bold;">
          📧 Contact urgent : administration@aurlombtsplus.ma<br>
          📞 Téléphone : +212 XXX XXX XXX
        </p>
      </div>
      
      <p style="font-size: 14px; color: #999999; text-align: center; margin: 30px 0 0;">
        Cordialement,<br>
        <strong>Le Service Administratif - AURLOM BTS+</strong>
      </p>
    </div>
    
    <div style="background: #f59e0b; color: #ffffff; padding: 20px; text-align: center;">
      <p style="margin: 0; font-size: 12px;">© 2025 AURLOM BTS+ - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>',
  jsonb_build_object(
    'niveau', '2',
    'sujet', '⚠️ Relance Formelle - Règlement en retard - AURLOM BTS+',
    'categorie', 'niveau_2'
  ),
  true
),
(
  'Relance Niveau 3 - Mise en Demeure AURLOM BTS+',
  'email_relance',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; padding: 40px 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 36px; font-weight: 900; letter-spacing: 2px;">AURLOM BTS+</h1>
      <p style="margin: 10px 0 0; font-size: 14px; font-weight: 600; opacity: 0.9;">CENTRE DE FORMATION</p>
    </div>
    
    <div style="padding: 40px 30px;">
      <h2 style="color: #dc2626; font-size: 22px; font-weight: bold; margin: 0 0 20px;">
        🚨 MISE EN DEMEURE - DERNIÈRE RELANCE
      </h2>
      
      <p style="font-size: 16px; line-height: 1.8; color: #333333;">
        Madame, Monsieur {nom},
      </p>
      
      <p style="font-size: 15px; line-height: 1.8; color: #333333;">
        En l''absence de règlement malgré nos multiples relances, nous vous adressons cette <strong>mise en demeure formelle</strong>.
      </p>
      
      <div style="background: #fee2e2; padding: 25px; border-radius: 12px; border: 4px solid #ef4444; margin: 30px 0;">
        <div style="text-align: center; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 48px;">⚠️</p>
        </div>
        <p style="margin: 0 0 15px; font-size: 14px; font-weight: bold; text-transform: uppercase; color: #7f1d1d; text-align: center;">
          MONTANT TOTAL DÛ
        </p>
        <p style="margin: 0; font-size: 48px; font-weight: 900; color: #dc2626; text-align: center;">
          {montant} MAD
        </p>
      </div>
      
      <div style="background: #7f1d1d; color: #ffffff; padding: 25px; border-radius: 12px; margin: 30px 0;">
        <p style="margin: 0 0 15px; font-size: 16px; font-weight: bold;">
          ⚖️ CONSÉQUENCES IMMÉDIATES :
        </p>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
          <li>Suspension immédiate de l''accès aux cours et services pédagogiques</li>
          <li>Non-délivrance des documents administratifs et certifications</li>
          <li>Engagement de poursuites judiciaires après 48 heures</li>
          <li>Inscription aux fichiers des impayés</li>
        </ul>
      </div>
      
      <div style="background: #fffbeb; padding: 20px; border-radius: 12px; border-left: 4px solid #f59e0b; margin: 30px 0;">
        <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #78350f;">
          <strong>🕐 Délai impératif :</strong> Vous disposez de <strong>48 heures</strong> à compter de la réception de ce courrier pour régulariser votre situation. Passé ce délai, les procédures légales seront engagées sans autre préavis.
        </p>
      </div>
      
      <p style="font-size: 15px; line-height: 1.8; color: #666666;">
        Pour éviter ces mesures, contactez immédiatement notre service administratif.
      </p>
      
      <div style="text-align: center; margin: 40px 0; background: #fee2e2; padding: 20px; border-radius: 8px;">
        <p style="font-size: 14px; color: #dc2626; font-weight: bold; margin: 0;">
          📧 Contact URGENT : administration@aurlombtsplus.ma<br>
          📞 Téléphone : +212 XXX XXX XXX<br>
          ⏰ Du Lundi au Vendredi : 9h-17h
        </p>
      </div>
      
      <p style="font-size: 13px; color: #999999; text-align: center; margin: 30px 0 0; font-style: italic;">
        Document à valeur juridique<br>
        <strong>Le Service Juridique et Administratif - AURLOM BTS+</strong>
      </p>
    </div>
    
    <div style="background: #dc2626; color: #ffffff; padding: 20px; text-align: center;">
      <p style="margin: 0; font-size: 12px;">© 2025 AURLOM BTS+ - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>',
  jsonb_build_object(
    'niveau', '3',
    'sujet', '🚨 MISE EN DEMEURE - Action juridique imminente - AURLOM BTS+',
    'categorie', 'niveau_3'
  ),
  true
);