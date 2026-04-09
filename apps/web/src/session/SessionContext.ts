import { createContext } from 'react';

export type AuthUser = {
  userId: string;
  email: string;
  role: 'investor' | 'admin';
};

export type SessionContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (credentials: { email: string; password: string }) => Promise<void>;
  signUp: (credentials: { email: string; password: string }) => Promise<{ email: string }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

export const SessionContext = createContext<SessionContextValue | undefined>(undefined);
