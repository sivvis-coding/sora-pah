import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiClient from '../../shared/api/client';

interface AuthUser {
  email: string;
  name: string;
  oid: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: () => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => {},
  logout: () => {},
  isAuthenticated: false,
});

function parseToken(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return { email: payload.email, name: payload.name, oid: payload.oid };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('sora_token'),
  );
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('sora_token');
    return stored ? parseToken(stored) : null;
  });

  // Keep user in sync if token is cleared externally (e.g. 401 interceptor)
  useEffect(() => {
    if (!token) setUser(null);
  }, [token]);

  /**
   * Calls the backend dev-token endpoint to get a properly signed JWT.
   * In production this will be replaced with the MSAL redirect flow.
   */
  const login = async () => {
    const { data } = await apiClient.post<{ token: string }>('/auth/dev-token');
    const parsed = parseToken(data.token);
    localStorage.setItem('sora_token', data.token);
    setToken(data.token);
    setUser(parsed);
  };

  const logout = () => {
    localStorage.removeItem('sora_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, isAuthenticated: !!token }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
