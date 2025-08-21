import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_USER_ID } from "@/lib/demo-auth";
import { setCssThemeFromHex } from "@/lib/theme";

// Global state for theme persistence across tab switches
let globalThemeState = {
  primary: "#684cff",
  secondary: "#22d3ee",
  accent: "#34d399",
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

      if (error) return;

      if (data && data.length > 0) {
        const guide = data[0];
        globalThemeState = {
          primary: guide.page_theme_primary,
          secondary: guide.page_theme_secondary,
          accent: guide.page_theme_accent,
          initialized: true
        };
        setThemeColors(globalThemeState);
        setCssThemeFromHex(
          globalThemeState.primary,
          globalThemeState.secondary,
          globalThemeState.accent
        );
      } else {
        globalThemeState.initialized = true;
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