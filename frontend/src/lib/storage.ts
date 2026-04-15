const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const THEME_KEY = 'theme';

export type StoredTheme = 'light' | 'dark' | 'system';

export const storage = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  },
  getUserRaw() {
    return localStorage.getItem(USER_KEY);
  },
  setUserRaw(value: string) {
    localStorage.setItem(USER_KEY, value);
  },
  clearUser() {
    localStorage.removeItem(USER_KEY);
  },
  clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  getTheme(): StoredTheme {
    const t = localStorage.getItem(THEME_KEY);
    if (t === 'light' || t === 'dark' || t === 'system') return t;
    return 'system';
  },
  setTheme(theme: StoredTheme) {
    localStorage.setItem(THEME_KEY, theme);
  }
};

