import { type ReactNode, useEffect, useState } from 'react';
import { ApiError, apiFetch } from '../lib/api';
import { SessionContext, type AuthUser } from './SessionContext';

type AuthResponse = {
  data: {
    user_id: string;
    email: string;
    role: 'investor' | 'admin';
  };
};

function normalizeAuthUser(payload: AuthResponse['data']): AuthUser {
  return {
    userId: payload.user_id,
    email: payload.email,
    role: payload.role,
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshSession() {
    setIsLoading(true);

    try {
      const response = await apiFetch<AuthResponse>('/api/auth/me');
      setUser(normalizeAuthUser(response.data));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
      } else {
        console.error(error);
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(credentials: { email: string; password: string }) {
    setIsLoading(true);

    try {
      const response = await apiFetch<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: credentials,
      });

      setUser(normalizeAuthUser(response.data));
    } finally {
      setIsLoading(false);
    }
  }

  async function signUp(credentials: { email: string; password: string }) {
    setIsLoading(true);

    try {
      const response = await apiFetch<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: credentials,
      });

      setUser(normalizeAuthUser(response.data));
    } finally {
      setIsLoading(false);
    }
  }

  async function signOut() {
    setIsLoading(true);

    try {
      await apiFetch<{ data: { ok: true } }>('/api/auth/logout', {
        method: 'POST',
      });
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshSession();
  }, []);

  const value = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    signIn,
    signUp,
    signOut,
    refreshSession,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
