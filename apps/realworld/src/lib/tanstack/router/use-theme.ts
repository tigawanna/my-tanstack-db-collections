import { useThemeContext } from "./theme-provider";

export function useTheme() {
  const { resolvedTheme, setTheme } = useThemeContext();
  return {
    theme: resolvedTheme,
    updateTheme: setTheme,
  };
}
