import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'yellow' | 'cyan' | 'pink' | 'green' | 'red';
  subtitle?: string;
  onClick?: () => void;
}

const colorClasses = {
  yellow: 'from-yellow-400 to-yellow-300',
  cyan: 'from-cyan-400 to-cyan-300',
  pink: 'from-pink-400 to-pink-300',
  green: 'from-green-400 to-green-300',
  red: 'from-red-400 to-red-300',
};

export const StatsCard = ({ title, value, icon: Icon, color = 'yellow', subtitle, onClick }: StatsCardProps) => {
  const isClickable = !!onClick;
  
  return (
    <div 
      className={`brutal-card bg-gradient-to-br ${colorClasses[color]} p-5 sm:p-6 overflow-hidden min-w-0 ${
        isClickable ? 'cursor-pointer hover:scale-[1.02] transition-transform active:scale-[0.98]' : ''
      }`}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="flex items-start justify-between mb-4 sm:mb-5">
        <h3 className="text-sm sm:text-base lg:text-lg font-black uppercase tracking-wide leading-tight break-words">{title}</h3>
        <Icon className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" />
      </div>
      <div className="text-lg sm:text-2xl lg:text-3xl font-black mb-1 sm:mb-2 leading-tight tracking-tight break-all">{value}</div>
      {subtitle && <p className="text-xs sm:text-sm lg:text-base font-bold opacity-80 break-words">{subtitle}</p>}
    </div>
  );
};
