import { supabase } from '@/integrations/supabase/client';
import * as crypto from 'crypto-js';

export async function calculerHashFichier(file: File): Promise<string> {
  const text = await file.text();
  return crypto.SHA256(text).toString();
}

export async function verifierImportExistant(hash: string): Promise<boolean> {
  const { data } = await supabase
    .from('imports')
    .select('id')
    .eq('fichier_hash', hash)
    .single();
  
  return !!data;
}

export async function creerImport(fichierNom: string, hash: string) {
  const { data, error } = await supabase
    .from('imports')
    .insert({
      fichier_nom: fichierNom,
      fichier_hash: hash,
      statut: 'en_cours',
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function lancerParsing(importId: string, csvContent: string, useLocalEmails = false) {
  const { data, error } = await supabase.functions.invoke('parse-import', {
    body: { importId, csvContent, useLocalEmails }
  });
  
  if (error) throw error;
  return data;
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

export function previsualiserCsv(content: string, maxLines = 10) {
  const lines = content.split('\n').filter(l => l.trim());
  const headers = parseCsvLine(lines[0]);
  
  const rows = lines.slice(1, maxLines + 1).map(line => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
  
  return { headers, rows, totalLines: lines.length - 1 };
}
