/* ============================================================
   AuthContext — current user + session lifecycle.
   On mount it restores a session: if an access token or refresh
   cookie exists, GET /auth/me (the client auto-refreshes a missing
   access token from the cookie). login()/logout() update state.
   ============================================================ */
'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import * as authApi from '@/lib/api/auth';
import { getAccessToken, getRefreshToken } from '@/lib/api/client';
import type { User } from '@/lib/api/types';

type Status = 'loading' | 'authed' | 'anon';

interface AuthCtx {
  user: User | null;
  status: Status;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (u: User) => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used within <AuthProvider>');
  return c;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const restored = useRef(false);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    (async () => {
      if (getAccessToken() || getRefreshToken()) {
        try {
          const me = await authApi.fetchMe();
          setUser(me);
          setStatus('authed');
          return;
        } catch {
          // fall through to anon
        }
      }
      setStatus('anon');
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await authApi.login(email, password);
    setUser(u);
    setStatus('authed');
    return u;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setStatus('anon');
  }, []);

  return <Ctx.Provider value={{ user, status, login, logout, setUser }}>{children}</Ctx.Provider>;
}
