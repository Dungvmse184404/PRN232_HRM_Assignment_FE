import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi, tokenStore, type AuthResponse } from '../lib/api';

interface AuthUser {
  userId: string;
  email: string;
  fullName: string;
  roles: string[];
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const STORAGE_KEY = 'hrm.user';
const AuthContext = createContext<AuthState | undefined>(undefined);

function loadUser(): AuthUser | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw || !tokenStore.access) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadUser);

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  }, [user]);

  const value = useMemo<AuthState>(() => {
    const store = (auth: AuthResponse) => {
      tokenStore.set(auth.accessToken, auth.refreshToken);
      setUser({ userId: auth.userId, email: auth.email, fullName: auth.fullName, roles: auth.roles });
    };
    return {
      user,
      isAuthenticated: !!user,
      isAdmin: !!user?.roles.includes('Admin'),
      async login(email, password) {
        store(await authApi.login(email, password));
      },
      logout() {
        tokenStore.clear();
        setUser(null);
      },
    };
  }, [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
