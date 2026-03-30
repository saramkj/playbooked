import { type ReactNode, useState } from 'react';
import { SessionContext } from './SessionContext';
const SESSION_STORAGE_KEY = 'playbooked.session.stub';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.localStorage.getItem(SESSION_STORAGE_KEY) === 'authenticated';
  });

  const value = {
    isAuthenticated,
    signIn: () => {
      window.localStorage.setItem(SESSION_STORAGE_KEY, 'authenticated');
      setIsAuthenticated(true);
    },
    signOut: () => {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      setIsAuthenticated(false);
    },
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
