import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { storage } from '../lib/storage';
import { bootstrapTheme } from '../lib/theme';
import type { SessionUser } from '../lib/types';

type AuthContextValue = {
  token: string | null;
  user: SessionUser | null;
  isBootstrapping: boolean;
  login: (payload: { token: string; user: SessionUser }) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function parseStoredUser(raw: string | null): SessionUser | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => storage.getToken());
  const [user, setUser] = useState<SessionUser | null>(() => parseStoredUser(storage.getUserRaw()));
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    bootstrapTheme();
  }, []);

  useEffect(() => {
    let active = true;
    async function boot() {
      const t = storage.getToken();
      const u = parseStoredUser(storage.getUserRaw());
      setToken(t);
      setUser(u);

      if (t && u) {
        const result = await api.verifyToken(t);
        if (active && !result.success) {
          storage.clearAuth();
          setToken(null);
          setUser(null);
        }
      }
      if (active) setIsBootstrapping(false);
    }
    boot();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      isBootstrapping,
      login: ({ token: nextToken, user: nextUser }) => {
        storage.setToken(nextToken);
        storage.setUserRaw(JSON.stringify(nextUser));
        setToken(nextToken);
        setUser(nextUser);
      },
      logout: () => {
        if (token) {
          api.logout(token).catch(console.error);
        }
        storage.clearAuth();
        setToken(null);
        setUser(null);
      }
    }),
    [token, user, isBootstrapping]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

