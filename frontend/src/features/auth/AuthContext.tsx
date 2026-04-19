import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import apiClient from '../../shared/api/client';
import { UserRole, STORAGE_KEYS } from '../../shared/constants';

export interface AuthUser {
  id?: string;
  email: string;
  name: string;
  oid: string;
  role?: UserRole;
  hasSeenLanding?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  isNewUser: boolean;
  isImpersonating: boolean;
  impersonate: (userId: string) => Promise<void>;
  stopImpersonating: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => {},
  logout: () => {},
  refreshUser: async () => {},
  isAuthenticated: false,
  isNewUser: false,
  isImpersonating: false,
  impersonate: async () => {},
  stopImpersonating: () => {},
});

function parseTokenFallback(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      email: payload.email,
      name: payload.name,
      oid: payload.oid,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem(STORAGE_KEYS.TOKEN),
  );
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.TOKEN);
    return stored ? parseTokenFallback(stored) : null;
  });

  // isImpersonating is true when an admin token is stored in sora_admin_token
  const [isImpersonating, setIsImpersonating] = useState<boolean>(
    () => !!localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN),
  );

  const fetchUser = useCallback(async () => {
    if (!token) { setUser(null); return; }
    try {
      const { data } = await apiClient.get<AuthUser>('/me');
      setUser(data);
    } catch {
      setUser(parseTokenFallback(token));
    }
  }, [token]);

  // Keep user in sync if token is cleared externally (e.g. 401 interceptor)
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  const login = async () => {
    const { data } = await apiClient.post<{ token: string }>('/auth/dev-token');
    localStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
    setToken(data.token);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
    setToken(null);
    setUser(null);
    setIsImpersonating(false);
  };

  /**
   * Admin-only: fetch a token for another user and switch to their perspective.
   * The original admin token is stored so impersonation can be reversed.
   */
  const impersonate = async (userId: string) => {
    const { data } = await apiClient.post<{ token: string }>(
      `/auth/impersonate/${userId}`,
    );
    // Stash current token so we can go back
    const current = localStorage.getItem(STORAGE_KEYS.TOKEN)!;
    localStorage.setItem(STORAGE_KEYS.ADMIN_TOKEN, current);
    localStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
    setToken(data.token);
    setIsImpersonating(true);
  };

  /** Restore the original admin token and exit impersonation. */
  const stopImpersonating = () => {
    const adminToken = localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
    if (!adminToken) return;
    localStorage.setItem(STORAGE_KEYS.TOKEN, adminToken);
    localStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
    setToken(adminToken);
    setIsImpersonating(false);
  };

  const isNewUser = !!user && user.hasSeenLanding === false && !isImpersonating;

  return (
    <AuthContext.Provider
      value={{
        user, token, login, logout, refreshUser,
        isAuthenticated: !!token,
        isNewUser,
        isImpersonating, impersonate, stopImpersonating,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
