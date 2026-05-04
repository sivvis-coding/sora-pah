import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { setupApi, SetupStatus } from './api/setup.api';

interface SetupContextType {
  status: SetupStatus | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const SetupContext = createContext<SetupContextType>({
  status: null,
  loading: true,
  refetch: async () => {},
});

export const useSetup = () => useContext(SetupContext);

/**
 * Returns configured app links from admin settings.
 * Falls back to sensible defaults when not configured.
 */
export function useAppLinks() {
  const { status } = useSetup();
  return {
    freshservice: status?.links?.freshservice || '',
    help: status?.links?.help || '/docs',
  };
}

/**
 * Wraps the app tree. On mount, checks /api/setup/status.
 * While loading → spinner. Exposes status to children via context.
 * The router decides what to render based on `status.bootstrapped`.
 */
export function SetupProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await setupApi.getStatus();
      setStatus(data);
    } catch {
      // If backend is down, assume bootstrapped so normal error handling kicks in
      setStatus({ bootstrapped: true, devMode: false, features: {}, links: { freshservice: '', help: '' } });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  if (loading) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <CircularProgress size={32} />
        <Typography variant="body2" color="text.secondary">
          SORA
        </Typography>
      </Box>
    );
  }

  return (
    <SetupContext.Provider value={{ status, loading, refetch: fetchStatus }}>
      {children}
    </SetupContext.Provider>
  );
}
