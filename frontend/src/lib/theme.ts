// Theme utilities for applying CSS variables from HEX colors
export const hexToHsl = (hex: string): [number, number, number] => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h: number, s: number, l: number = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: h = 0;
    }
    h /= 6;
  }

  return [
    Math.round(h * 360),
    Math.round(s * 100),
    Math.round(l * 100)
  ];
};

export const setCssThemeFromHex = (primary?: string, secondary?: string, accent?: string) => {
  const root = document.documentElement;

  const setColor = (name: 'primary' | 'secondary' | 'accent', hex?: string) => {
    if (!hex || !/^#([0-9a-f]{3}){1,2}$/i.test(hex)) return;
    const [h, s, l] = hexToHsl(hex);
    
    // Set both regular and email-specific CSS variables
    root.style.setProperty(`--${name}`, `${h} ${s}% ${l}%`);
    root.style.setProperty(`--email-${name}`, `${h} ${s}% ${l}%`);
    
    // Ensure good contrast by dynamically setting the foreground color
    const foreground = l < 55 ? '0 0% 100%' : '220 15% 25%';
    root.style.setProperty(`--${name}-foreground`, foreground);
    root.style.setProperty(`--email-${name}-foreground`, foreground);
  };

  setColor('primary', primary);
  setColor('secondary', secondary);
  setColor('accent', accent);
  
  // Also set other email-specific colors if needed
  if (primary) {
    const [h, s, l] = hexToHsl(primary);
    root.style.setProperty('--email-background', `${h} ${Math.max(s - 70, 5)}% ${Math.min(l + 30, 98)}%`);
    root.style.setProperty('--email-muted', `${h} ${Math.max(s - 60, 10)}% ${Math.min(l + 20, 95)}%`);
  }
};
