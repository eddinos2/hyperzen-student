import { useMemo } from 'react';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

interface PasswordStrength {
  score: number; // 0-100
  level: 'weak' | 'medium' | 'strong' | 'very-strong';
  label: string;
  color: string;
  feedback: string[];
}

const COMMON_PASSWORDS = [
  'password', 'admin', '123456', 'qwerty', 'letmein', 
  'welcome', 'monkey', 'dragon', 'master', '12345678'
];

export const PasswordStrengthIndicator = ({ password, className = '' }: PasswordStrengthIndicatorProps) => {
  const strength = useMemo((): PasswordStrength => {
    if (!password) {
      return {
        score: 0,
        level: 'weak',
        label: 'Très faible',
        color: 'hsl(var(--destructive))',
        feedback: ['Entrez un mot de passe']
      };
    }

    let score = 0;
    const feedback: string[] = [];

    // Longueur (max 30 points)
    if (password.length >= 10) {
      score += 30;
    } else if (password.length >= 8) {
      score += 20;
      feedback.push('Au moins 10 caractères recommandés');
    } else {
      score += 10;
      feedback.push('Minimum 10 caractères requis');
    }

    // Majuscules (15 points)
    if (/[A-Z]/.test(password)) {
      score += 15;
    } else {
      feedback.push('Ajoutez des majuscules');
    }

    // Minuscules (15 points)
    if (/[a-z]/.test(password)) {
      score += 15;
    } else {
      feedback.push('Ajoutez des minuscules');
    }

    // Chiffres (15 points)
    if (/[0-9]/.test(password)) {
      score += 15;
    } else {
      feedback.push('Ajoutez des chiffres');
    }

    // Caractères spéciaux (15 points)
    if (/[@#$%&*!?_\-+=]/.test(password)) {
      score += 15;
    } else {
      feedback.push('Ajoutez des caractères spéciaux (@#$%&*)');
    }

    // Variété de caractères (10 points)
    const uniqueChars = new Set(password).size;
    if (uniqueChars >= password.length * 0.7) {
      score += 10;
    } else {
      feedback.push('Variez davantage les caractères');
    }

    // Pénalités
    // Mots communs (-30 points)
    if (COMMON_PASSWORDS.some(common => password.toLowerCase().includes(common))) {
      score -= 30;
      feedback.push('Évitez les mots communs');
    }

    // Séquences répétées (-10 points)
    if (/(.)\1{2,}/.test(password)) {
      score -= 10;
      feedback.push('Évitez les répétitions');
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    // Déterminer le niveau
    let level: PasswordStrength['level'] = 'weak';
    let label = 'Très faible';
    let color = 'hsl(var(--destructive))';

    if (score >= 80) {
      level = 'very-strong';
      label = 'Très fort';
      color = 'hsl(142 76% 36%)'; // green
      feedback.length = 0; // Pas de feedback si excellent
      feedback.push('Excellent mot de passe !');
    } else if (score >= 60) {
      level = 'strong';
      label = 'Fort';
      color = 'hsl(142 76% 36%)';
    } else if (score >= 40) {
      level = 'medium';
      label = 'Moyen';
      color = 'hsl(48 96% 53%)'; // yellow/warning
    }

    return { score, level, label, color, feedback };
  }, [password]);

  const Icon = strength.level === 'very-strong' ? ShieldCheck : 
               strength.level === 'strong' ? Shield : 
               ShieldAlert;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" style={{ color: strength.color }} />
          <span className="text-muted-foreground">Force du mot de passe:</span>
          <span className="font-medium" style={{ color: strength.color }}>
            {strength.label}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{strength.score}%</span>
      </div>
      
      <Progress value={strength.score} className="h-2" />

      {strength.feedback.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-1 pl-6">
          {strength.feedback.map((item, index) => (
            <li key={index} className="list-disc">{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

// Fonction utilitaire pour valider un mot de passe (utilisable côté serveur aussi)
export const validatePasswordStrength = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 10) {
    errors.push('Le mot de passe doit contenir au moins 10 caractères');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }

  if (!/[@#$%&*!?_\-+=]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un caractère spécial (@#$%&*!?_-+=)');
  }

  if (COMMON_PASSWORDS.some(common => password.toLowerCase().includes(common))) {
    errors.push('Le mot de passe ne doit pas contenir de mots communs');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};
