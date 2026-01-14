import { useState } from 'react';
import { Plus, X, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface QuickAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  shortcut?: string;
  color?: string;
}

interface QuickActionsProps {
  actions: QuickAction[];
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export const QuickActions = ({
  actions,
  position = 'bottom-right',
}: QuickActionsProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
  };

  const actionPositionClasses = {
    'bottom-right': 'flex-col-reverse',
    'bottom-left': 'flex-col-reverse',
    'top-right': 'flex-col',
    'top-left': 'flex-col',
  };

  return (
    <TooltipProvider>
      <div className={`fixed ${positionClasses[position]} z-50 flex ${actionPositionClasses[position]} items-end gap-3`}>
        {/* Actions secondaires */}
        {isOpen && (
          <div className={`flex ${actionPositionClasses[position]} gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200`}>
            {actions.map((action, index) => (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      action.onClick();
                      setIsOpen(false);
                    }}
                    className={`w-14 h-14 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center ${
                      action.color || 'bg-cyan-400'
                    }`}
                  >
                    <action.icon className="w-6 h-6" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="brutal-card">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{action.label}</span>
                    {action.shortcut && (
                      <kbd className="px-2 py-1 bg-black text-white rounded text-xs font-mono">
                        {action.shortcut}
                      </kbd>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}

        {/* Bouton principal */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-16 h-16 rounded-2xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center ${
            isOpen ? 'bg-red-400 rotate-45' : 'bg-primary rotate-0'
          }`}
        >
          {isOpen ? <X className="w-8 h-8" /> : <Plus className="w-8 h-8" />}
        </button>
      </div>
    </TooltipProvider>
  );
};
