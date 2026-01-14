import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, X, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImportUploadProps {
  onFileSelected: (file: File) => void;
}

export const ImportUpload = ({ onFileSelected }: ImportUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      validerFichier(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validerFichier(file);
    }
  };

  const validerFichier = (file: File) => {
    const extensions = ['.csv', '.xlsx', '.xls'];
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!extensions.includes(extension)) {
      toast({
        title: 'Format invalide',
        description: 'Seuls les fichiers CSV et Excel sont acceptés',
        variant: 'destructive',
      });
      return;
    }
    
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: 'Fichier trop volumineux',
        description: 'La taille maximale est de 20 MB',
        variant: 'destructive',
      });
      return;
    }
    
    setSelectedFile(file);
    onFileSelected(file);
  };

  const supprimerFichier = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`brutal-card p-16 text-center cursor-pointer transition-all ${
            isDragging ? 'bg-primary scale-105' : 'bg-white hover:bg-muted'
          }`}
        >
          <FileSpreadsheet className="w-24 h-24 mx-auto mb-6" />
          <h2 className="text-4xl font-black mb-4">GLISSEZ VOTRE FICHIER ICI</h2>
          <p className="text-xl font-bold text-muted-foreground mb-8">
            ou cliquez pour parcourir
          </p>
          <div className="brutal-button bg-primary text-primary-foreground flex items-center gap-3 mx-auto inline-flex">
            <Upload className="w-6 h-6" />
            SÉLECTIONNER UN FICHIER
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      ) : (
        <div className="brutal-card p-8 bg-gradient-to-br from-green-100 to-green-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
              <div>
                <h3 className="text-2xl font-black">{selectedFile.name}</h3>
                <p className="text-lg font-bold text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={supprimerFichier}
              className="p-3 rounded-xl border-2 border-black hover:bg-black hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
