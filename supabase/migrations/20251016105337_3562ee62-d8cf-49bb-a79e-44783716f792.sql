-- Enable RLS on all public tables
ALTER TABLE annees_scolaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE campus ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents_pedagogiques ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossiers_scolarite ENABLE ROW LEVEL SECURITY;
ALTER TABLE echeances ENABLE ROW LEVEL SECURITY;
ALTER TABLE eleves ENABLE ROW LEVEL SECURITY;
ALTER TABLE filieres ENABLE ROW LEVEL SECURITY;
ALTER TABLE imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE justificatifs ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages_ticket ENABLE ROW LEVEL SECURITY;
ALTER TABLE modeles_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_envoyees ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferences_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE recus ENABLE ROW LEVEL SECURITY;
ALTER TABLE reglements ENABLE ROW LEVEL SECURITY;
ALTER TABLE telechargements ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users (gestionnaires and admins)
-- All authenticated users can view and manage data (this is an internal management system)

-- annees_scolaires
CREATE POLICY "Authenticated users can view annees_scolaires" ON annees_scolaires FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert annees_scolaires" ON annees_scolaires FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update annees_scolaires" ON annees_scolaires FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete annees_scolaires" ON annees_scolaires FOR DELETE TO authenticated USING (true);

-- anomalies
CREATE POLICY "Authenticated users can view anomalies" ON anomalies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert anomalies" ON anomalies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update anomalies" ON anomalies FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete anomalies" ON anomalies FOR DELETE TO authenticated USING (true);

-- audit_log
CREATE POLICY "Authenticated users can view audit_log" ON audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert audit_log" ON audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- campus
CREATE POLICY "Authenticated users can view campus" ON campus FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert campus" ON campus FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update campus" ON campus FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete campus" ON campus FOR DELETE TO authenticated USING (true);

-- documents_pedagogiques
CREATE POLICY "Authenticated users can view documents_pedagogiques" ON documents_pedagogiques FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert documents_pedagogiques" ON documents_pedagogiques FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update documents_pedagogiques" ON documents_pedagogiques FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete documents_pedagogiques" ON documents_pedagogiques FOR DELETE TO authenticated USING (true);

-- dossiers_scolarite
CREATE POLICY "Authenticated users can view dossiers_scolarite" ON dossiers_scolarite FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert dossiers_scolarite" ON dossiers_scolarite FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update dossiers_scolarite" ON dossiers_scolarite FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete dossiers_scolarite" ON dossiers_scolarite FOR DELETE TO authenticated USING (true);

-- echeances
CREATE POLICY "Authenticated users can view echeances" ON echeances FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert echeances" ON echeances FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update echeances" ON echeances FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete echeances" ON echeances FOR DELETE TO authenticated USING (true);

-- eleves
CREATE POLICY "Authenticated users can view eleves" ON eleves FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert eleves" ON eleves FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update eleves" ON eleves FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete eleves" ON eleves FOR DELETE TO authenticated USING (true);

-- filieres
CREATE POLICY "Authenticated users can view filieres" ON filieres FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert filieres" ON filieres FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update filieres" ON filieres FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete filieres" ON filieres FOR DELETE TO authenticated USING (true);

-- imports
CREATE POLICY "Authenticated users can view imports" ON imports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert imports" ON imports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update imports" ON imports FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete imports" ON imports FOR DELETE TO authenticated USING (true);

-- justificatifs
CREATE POLICY "Authenticated users can view justificatifs" ON justificatifs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert justificatifs" ON justificatifs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update justificatifs" ON justificatifs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete justificatifs" ON justificatifs FOR DELETE TO authenticated USING (true);

-- messages_ticket
CREATE POLICY "Authenticated users can view messages_ticket" ON messages_ticket FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert messages_ticket" ON messages_ticket FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update messages_ticket" ON messages_ticket FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete messages_ticket" ON messages_ticket FOR DELETE TO authenticated USING (true);

-- modeles_documents
CREATE POLICY "Authenticated users can view modeles_documents" ON modeles_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert modeles_documents" ON modeles_documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update modeles_documents" ON modeles_documents FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete modeles_documents" ON modeles_documents FOR DELETE TO authenticated USING (true);

-- notifications_envoyees
CREATE POLICY "Authenticated users can view notifications_envoyees" ON notifications_envoyees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert notifications_envoyees" ON notifications_envoyees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update notifications_envoyees" ON notifications_envoyees FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete notifications_envoyees" ON notifications_envoyees FOR DELETE TO authenticated USING (true);

-- preferences_notifications
CREATE POLICY "Authenticated users can view preferences_notifications" ON preferences_notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert preferences_notifications" ON preferences_notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update preferences_notifications" ON preferences_notifications FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete preferences_notifications" ON preferences_notifications FOR DELETE TO authenticated USING (true);

-- recus
CREATE POLICY "Authenticated users can view recus" ON recus FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert recus" ON recus FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update recus" ON recus FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete recus" ON recus FOR DELETE TO authenticated USING (true);

-- reglements
CREATE POLICY "Authenticated users can view reglements" ON reglements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert reglements" ON reglements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update reglements" ON reglements FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete reglements" ON reglements FOR DELETE TO authenticated USING (true);

-- telechargements
CREATE POLICY "Authenticated users can view telechargements" ON telechargements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert telechargements" ON telechargements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update telechargements" ON telechargements FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete telechargements" ON telechargements FOR DELETE TO authenticated USING (true);

-- tickets
CREATE POLICY "Authenticated users can view tickets" ON tickets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert tickets" ON tickets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update tickets" ON tickets FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete tickets" ON tickets FOR DELETE TO authenticated USING (true);