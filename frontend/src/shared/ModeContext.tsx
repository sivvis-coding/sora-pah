import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { AppMode, UserRole, STORAGE_KEYS } from './constants';

export type { AppMode };

interface ModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  canSwitchMode: boolean;
}

const ModeContext = createContext<ModeContextType>({
  mode: AppMode.STAKEHOLDER,
  setMode: () => {},
  canSwitchMode: false,
});

export function ModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;

  const [mode, setModeState] = useState<AppMode>(() => {
    if (!isAdmin) return AppMode.STAKEHOLDER;
    const stored = localStorage.getItem(STORAGE_KEYS.MODE);
    return stored === AppMode.ADMIN ? AppMode.ADMIN : AppMode.STAKEHOLDER;
  });

  // When user changes (login/logout), re-evaluate mode
  useEffect(() => {
    if (!isAdmin) {
      setModeState(AppMode.STAKEHOLDER);
    }
  }, [isAdmin]);

  const setMode = (newMode: AppMode) => {
    if (!isAdmin) return; // non-admins cannot change mode
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEYS.MODE, newMode);
  };

  return (
    <ModeContext.Provider value={{ mode, setMode, canSwitchMode: isAdmin }}>
      {children}
    </ModeContext.Provider>
  );
}

export const useMode = () => useContext(ModeContext);
