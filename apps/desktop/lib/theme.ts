export const THEME_STORAGE_KEY = 'rolodex.theme';

export type ThemePreference = 'light' | 'dark';

export function getStoredTheme(): ThemePreference {
  const value = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (value === 'dark' || value === 'light') {
    return value;
  }
  return 'light';
}

export function applyTheme(theme: ThemePreference): void {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}
