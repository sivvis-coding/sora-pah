import React, { useState } from 'react';
import { Button, Box, Typography, CircularProgress, Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

/** Brand tagline — never translated, always shown in English as part of the SORA identity. */
const BRAND_TAGLINE = 'Shared Opinions for Rapid Adoption';

export default function LoginPage() {
  const { login } = useAuth();
  const { t: tAuth } = useTranslation('auth');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await login();
      navigate('/products', { replace: true });
    } catch {
      setError('Login failed. Make sure the backend is running.');
      setLoading(false);
    }
  };

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
      <Typography variant="h3">SORA</Typography>
      <Typography variant="subtitle1" color="text.secondary">
        {BRAND_TAGLINE}
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Button
        variant="contained"
        size="large"
        onClick={handleLogin}
        disabled={loading}
        startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
      >
        {tAuth('signIn')}
      </Button>
    </Box>
  );
}
