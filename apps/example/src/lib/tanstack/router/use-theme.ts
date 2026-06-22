import { useThemeContext } from "./theme-provider";

export function useTheme() {
  const { theme, resolvedTheme, setTheme } = useThemeContext();
  return {
    theme: resolvedTheme,
    updateTheme: setTheme,
  };
}
