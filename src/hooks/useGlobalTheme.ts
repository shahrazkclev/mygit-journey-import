import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_USER_ID } from "@/lib/demo-auth";
import { setCssThemeFromHex } from "@/lib/theme";

// Global state for theme persistence across tab switches
let globalThemeState = {
  primary: "#374151", // Dark gray from the image
  secondary: "#fed7aa", // Light orange/peach from the image  
  accent: "#0e4a6e", // Dark blue from the image
  initialized: false
};

export const useGlobalTheme = () => {
  const [themeColors, setThemeColors] = useState(globalThemeState);

  const updateTheme = (colors: Partial<typeof globalThemeState>) => {
    globalThemeState = { ...globalThemeState, ...colors };
    setThemeColors(globalThemeState);
    setCssThemeFromHex(
      globalThemeState.primary,
      globalThemeState.secondary,
      globalThemeState.accent
    );
  };

  const initializeTheme = async () => {
    if (globalThemeState.initialized) return;
    
    try {
      const { data, error } = await supabase
        .from('style_guides')
        .select('page_theme_primary, page_theme_secondary, page_theme_accent')
        .eq('user_id', DEMO_USER_ID)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Database error loading theme:', error);
        globalThemeState.initialized = true;
        return;
      }

      if (data && data.length > 0) {
        const guide = data[0];
        console.log('Loading saved theme:', guide);
        
        // Update global state with loaded theme
        globalThemeState = {
          primary: guide.page_theme_primary || globalThemeState.primary,
          secondary: guide.page_theme_secondary || globalThemeState.secondary, 
          accent: guide.page_theme_accent || globalThemeState.accent,
          initialized: true
        };
        
        // Apply theme to CSS immediately
        setCssThemeFromHex(
          globalThemeState.primary,
          globalThemeState.secondary,
          globalThemeState.accent
        );
        
        // Update React state to trigger re-render
        setThemeColors({...globalThemeState});
      } else {
        console.log('No saved theme found, using defaults');
        globalThemeState.initialized = true;
        // Apply default theme
        setCssThemeFromHex(
          globalThemeState.primary,
          globalThemeState.secondary,
          globalThemeState.accent
        );
      }
    } catch (error) {
      console.error('Error loading theme:', error);
      globalThemeState.initialized = true;
    }
  };

  useEffect(() => {
    initializeTheme();
  }, []);

  return { themeColors, updateTheme, initializeTheme };
};