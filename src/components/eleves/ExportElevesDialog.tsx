import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ExportElevesDialogProps {
  onExport: (options: ExportOptions) => void;
  trigger?: React.ReactNode;
}

export interface ExportOptions {
  statutPaiement: string;
  statutInscription: string;
  dateDebut?: Date;
  dateFin?: Date;
  includeReglements: boolean;
  includeEcheances: boolean;
}

export function ExportElevesDialog({ onExport, trigger }: ExportElevesDialogProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    statutPaiement: 'all',
    statutInscription: 'all',
    includeReglements: true,
    includeEcheances: true,
  });

  const handleExport = () => {
    onExport(options);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button className="brutal-button bg-secondary text-secondary-foreground flex items-center gap-2 px-3 sm:px-4 text-sm sm:text-base h-10 sm:h-auto">
            <Download className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">EXPORTER</span>
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">EXPORTER LES ÉLÈVES</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Statut de paiement */}
          <div className="space-y-2">
            <Label className="font-bold">Statut de paiement</Label>
            <Select
              value={options.statutPaiement}
              onValueChange={(value) => setOptions({ ...options, statutPaiement: value })}
            >
              <SelectTrigger className="brutal-input h-12">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="À jour">À jour</SelectItem>
                <SelectItem value="En cours">En cours</SelectItem>
                <SelectItem value="En retard">En retard</SelectItem>
                <SelectItem value="Impayé total">Impayé total</SelectItem>
                <SelectItem value="Créditeur">Créditeur</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Statut d'inscription */}
          <div className="space-y-2">
            <Label className="font-bold">Statut d'inscription</Label>
            <Select
              value={options.statutInscription}
              onValueChange={(value) => setOptions({ ...options, statutInscription: value })}
            >
              <SelectTrigger className="brutal-input h-12">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="Inscrit">Inscrit</SelectItem>
                <SelectItem value="Désinscrit">Désinscrit</SelectItem>
                <SelectItem value="En attente">En attente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Période */}
          <div className="space-y-2">
            <Label className="font-bold">Période de règlements</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Date début</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-12 border-4 border-black rounded-2xl",
                        !options.dateDebut && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {options.dateDebut ? (
                        format(options.dateDebut, "dd/MM/yyyy", { locale: fr })
                      ) : (
                        <span>Optionnel</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={options.dateDebut}
                      onSelect={(date) => setOptions({ ...options, dateDebut: date })}
                      locale={fr}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Date fin</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-12 border-4 border-black rounded-2xl",
                        !options.dateFin && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {options.dateFin ? (
                        format(options.dateFin, "dd/MM/yyyy", { locale: fr })
                      ) : (
                        <span>Optionnel</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={options.dateFin}
                      onSelect={(date) => setOptions({ ...options, dateFin: date })}
                      locale={fr}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Options d'export */}
          <div className="space-y-2">
            <Label className="font-bold">Données à inclure</Label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeReglements}
                  onChange={(e) => setOptions({ ...options, includeReglements: e.target.checked })}
                  className="w-5 h-5 rounded border-2 border-black"
                />
                <span className="font-medium">Inclure les règlements</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeEcheances}
                  onChange={(e) => setOptions({ ...options, includeEcheances: e.target.checked })}
                  className="w-5 h-5 rounded border-2 border-black"
                />
                <span className="font-medium">Inclure les échéances</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="brutal-button bg-white text-black border-4"
          >
            ANNULER
          </Button>
          <Button
            onClick={handleExport}
            className="brutal-button bg-primary text-primary-foreground"
          >
            <Download className="w-4 h-4 mr-2" />
            EXPORTER
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
