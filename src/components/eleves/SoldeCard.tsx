import { SoldeCalcule, formaterMontant, formaterDate } from '@/lib/calculs';
import { TrendingDown, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';

interface SoldeCardProps {
  solde: SoldeCalcule;
}

export const SoldeCard = ({ solde }: SoldeCardProps) => {
  const getColorClass = () => {
    switch (solde.statut) {
      case 'a_jour':
        return 'from-green-400 to-green-300';
      case 'en_cours':
        return 'from-yellow-400 to-yellow-300';
      case 'en_retard':
        return 'from-red-400 to-red-300';
      case 'crediteur':
        return 'from-cyan-400 to-cyan-300';
      default:
        return 'from-gray-400 to-gray-300';
    }
  };

  const getIcon = () => {
    switch (solde.statut) {
      case 'a_jour':
        return <CheckCircle className="w-12 h-12" />;
      case 'en_retard':
        return <AlertCircle className="w-12 h-12" />;
      case 'crediteur':
        return <TrendingDown className="w-12 h-12" />;
      default:
        return <TrendingUp className="w-12 h-12" />;
    }
  };

  const getStatutLabel = () => {
    switch (solde.statut) {
      case 'a_jour':
        return 'À JOUR';
      case 'en_cours':
        return 'EN COURS';
      case 'en_retard':
        return 'EN RETARD';
      case 'crediteur':
        return 'CRÉDITEUR';
      default:
        return 'INCONNU';
    }
  };

  return (
    <div className={`brutal-card bg-gradient-to-br ${getColorClass()} p-8`}>
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-2xl font-black uppercase">Solde</h3>
        {getIcon()}
      </div>
      
      {/* Alerte créditeur */}
      {solde.statut === 'crediteur' && (
        <div className="mb-4 p-4 bg-white border-4 border-black rounded-xl">
          <p className="font-black text-lg flex items-center gap-2">
            💰 L'ÉLÈVE A TROP PAYÉ
          </p>
          <p className="text-sm font-bold text-muted-foreground mt-1">
            Un remboursement de <span className="text-green-600 font-black">{formaterMontant(Math.abs(solde.reste_a_payer))}</span> est à prévoir
          </p>
        </div>
      )}
      
      <div className="space-y-3">
        <div>
          <p className="text-sm font-bold opacity-80 uppercase">
            {solde.reste_a_payer < 0 ? 'Crédit à rembourser' : 'Reste à payer'}
          </p>
          <p className="text-5xl font-black">{formaterMontant(Math.abs(solde.reste_a_payer))}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-black">
          <div>
            <p className="text-xs font-bold opacity-80 uppercase">Total versé</p>
            <p className="text-xl font-black">{formaterMontant(solde.total_verse)}</p>
          </div>
          <div>
            <p className="text-xs font-bold opacity-80 uppercase">Nb règlements</p>
            <p className="text-xl font-black">{solde.nb_reglements}</p>
          </div>
        </div>
        
        {solde.dernier_reglement && (
          <div className="pt-2">
            <p className="text-xs font-bold opacity-80 uppercase">Dernier paiement</p>
            <p className="text-lg font-black">{formaterDate(solde.dernier_reglement)}</p>
          </div>
        )}
        
        <div className="pt-4">
          <span className="inline-block px-6 py-3 rounded-2xl border-4 border-black font-black text-lg bg-black text-white">
            {getStatutLabel()}
          </span>
        </div>
      </div>
    </div>
  );
};
