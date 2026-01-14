import { ReactNode } from 'react';

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const EmptyState = ({
  icon,
  title,
  description,
  action,
  size = 'lg',
}: EmptyStateProps) => {
  const sizeClasses = {
    sm: {
      container: 'py-8',
      icon: 'text-4xl mb-2',
      title: 'text-lg',
      description: 'text-sm',
    },
    md: {
      container: 'py-12',
      icon: 'text-5xl mb-3',
      title: 'text-xl',
      description: 'text-base',
    },
    lg: {
      container: 'py-16 sm:py-20',
      icon: 'text-5xl sm:text-6xl mb-3 sm:mb-4',
      title: 'text-xl sm:text-2xl',
      description: 'text-base sm:text-lg',
    },
  };

  const classes = sizeClasses[size];

  return (
    <div className="brutal-card">
      <div className={`flex flex-col items-center justify-center text-center ${classes.container}`}>
        <div className={classes.icon}>{icon}</div>
        <h3 className={`font-black mb-2 ${classes.title}`}>{title}</h3>
        {description && (
          <p className={`font-bold text-muted-foreground max-w-md ${classes.description}`}>
            {description}
          </p>
        )}
        {action && <div className="mt-4 sm:mt-6">{action}</div>}
      </div>
    </div>
  );
};
