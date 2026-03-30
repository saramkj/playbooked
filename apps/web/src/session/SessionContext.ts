import { createContext } from 'react';

export type SessionContextValue = {
  isAuthenticated: boolean;
  signIn: () => void;
  signOut: () => void;
};

export const SessionContext = createContext<SessionContextValue | undefined>(undefined);
