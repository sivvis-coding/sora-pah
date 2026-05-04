import React, { useState } from 'react';
import {
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  TextField,
  Divider,
  Stack,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useSetup } from '../../setup/SetupProvider';
import { setupApi } from '../../setup/api/setup.api';
import { STORAGE_KEYS } from '../../../shared/constants';

/** Brand tagline — never translated, always shown in English as part of the SORA identity. */
const BRAND_TAGLINE = 'Shared Opinions for Rapid Adoption';

export default function LoginPage() {
  const { login } = useAuth();
  const { status } = useSetup();
  const { t: tAuth } = useTranslation('auth');
  const { t: tSetup } = useTranslation('setup');
  const navigate = useNavigate();

  // Azure AD / dev-mode login
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const azureAdConfigured = status?.features?.azure_ad ?? false;
  const devMode = status?.devMode ?? false;
  const showAzureAdLogin = azureAdConfigured || devMode;

  const handleAzureAdLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await login();
      navigate('/', { replace: true });
    } catch {
      setError('Login failed. Make sure the backend is running.');
      setLoading(false);
    }
  };

  const handleLocalLogin = async () => {
    setLocalLoading(true);
    setLocalError(null);
    try {
      const { token } = await setupApi.localLogin({ email, password });
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
      window.location.href = '/';
    } catch {
      setLocalError(tSetup('localLogin.error'));
      setLocalLoading(false);
    }
  };

  const handleLocalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && email && password) handleLocalLogin();
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
        px: 2,
      }}
    >
      <Typography variant="h3" fontWeight={800}>
        SORA
      </Typography>
      <Typography variant="subtitle1" color="text.secondary">
        {BRAND_TAGLINE}
      </Typography>

      {/* Azure AD / Dev-mode login */}
      {showAzureAdLogin && (
        <Box sx={{ mt: 2, width: '100%', maxWidth: 360, textAlign: 'center' }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleAzureAdLogin}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {tAuth('signIn')}
          </Button>
        </Box>
      )}

      {/* Divider when both options available */}
      {showAzureAdLogin && (
        <Divider sx={{ width: '100%', maxWidth: 360, my: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {tSetup('localLogin.or')}
          </Typography>
        </Divider>
      )}

      {/* Local admin login */}
      <Box sx={{ width: '100%', maxWidth: 360 }}>
        <Typography variant="subtitle2" sx={{ mb: 1.5, textAlign: 'center' }}>
          {tSetup('localLogin.subtitle')}
        </Typography>
        {localError && <Alert severity="error" sx={{ mb: 2 }}>{localError}</Alert>}
        <Stack spacing={2}>
          <TextField
            label={tSetup('localLogin.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleLocalKeyDown}
            fullWidth
            size="small"
          />
          <TextField
            label={tSetup('localLogin.password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleLocalKeyDown}
            fullWidth
            size="small"
          />
          <Button
            variant={showAzureAdLogin ? 'outlined' : 'contained'}
            size="large"
            fullWidth
            onClick={handleLocalLogin}
            disabled={localLoading || !email || !password}
            startIcon={localLoading ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {localLoading ? tSetup('localLogin.signingIn') : tSetup('localLogin.submit')}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
