export const themes = {
  aurlom: {
    name: 'Aurlom BTS+',
    icon: '🎓',
    gradient: 'from-purple-200 via-purple-100 to-white',
    colors: {
      primary: '270 90% 65%',        // Violet Aurlom
      secondary: '270 80% 75%',      // Violet clair
      accent: '0 0% 0%',             // Noir
      success: '142 76% 36%',
      warning: '38 92% 50%',
      destructive: '0 84% 60%',
    }
  },
  default: {
    name: 'Default',
    icon: '⚡',
    gradient: 'from-cyan-100 via-white to-purple-100',
    colors: {
      primary: '47 100% 50%',
      secondary: '180 100% 50%',
      accent: '330 100% 50%',
      success: '142 76% 36%',
      warning: '38 92% 50%',
      destructive: '0 84% 60%',
    }
  },
  halloween: {
    name: 'Halloween',
    icon: '🎃',
    gradient: 'from-orange-200 via-purple-900/20 to-black/30',
    colors: {
      primary: '24 100% 50%',        // Orange vif
      secondary: '270 95% 35%',      // Violet foncé
      accent: '270 95% 65%',         // Violet clair
      success: '142 76% 36%',
      warning: '38 92% 50%',
      destructive: '0 0% 10%',       // Noir
    }
  },
  noel: {
    name: 'Noël',
    icon: '🎄',
    gradient: 'from-red-100 via-green-100 to-yellow-100',
    colors: {
      primary: '0 84% 60%',          // Rouge
      secondary: '142 76% 36%',      // Vert
      accent: '48 100% 67%',         // Doré
      success: '48 100% 67%',
      warning: '38 92% 50%',
      destructive: '0 84% 60%',
    }
  },
  ete: {
    name: 'Été',
    icon: '☀️',
    gradient: 'from-yellow-200 via-orange-100 to-blue-200',
    colors: {
      primary: '43 100% 51%',        // Jaune soleil
      secondary: '197 71% 52%',      // Bleu océan
      accent: '33 100% 60%',         // Orange
      success: '142 76% 36%',
      warning: '38 92% 50%',
      destructive: '0 84% 60%',
    }
  },
  printemps: {
    name: 'Printemps',
    icon: '🌸',
    gradient: 'from-pink-200 via-purple-100 to-green-100',
    colors: {
      primary: '340 82% 52%',        // Rose
      secondary: '91 100% 50%',      // Vert clair
      accent: '280 100% 70%',        // Lavande
      success: '142 76% 36%',
      warning: '38 92% 50%',
      destructive: '0 84% 60%',
    }
  }
};

export type ThemeName = keyof typeof themes;

export const applyTheme = (themeName: ThemeName) => {
  const theme = themes[themeName] || themes.default;
  const root = document.documentElement;
  
  // Appliquer toutes les couleurs du thème
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });
  
  // Appliquer le gradient au body
  document.body.className = document.body.className.replace(
    /bg-gradient-to-br\s+from-\S+\s+via-\S+\s+to-\S+/g, 
    ''
  );
  document.body.classList.add('bg-gradient-to-br', ...theme.gradient.split(' '));
  
  console.log(`🎨 Thème "${theme.name}" appliqué avec succès!`, theme);
};
