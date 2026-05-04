import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CheckCircleOutline as DoneIcon,
  RocketLaunch as RocketIcon,
} from '@mui/icons-material';
import { STORAGE_KEYS } from '../../../shared/constants';
import { setupApi } from '../api/setup.api';
import { useSetup } from '../SetupProvider';
import { ClickupListPicker, ClickupDocPicker } from '../components/ClickupPickers';

const STEPS = ['account', 'azureAd', 'integrations', 'done'] as const;

export default function SetupWizard() {
  const { t } = useTranslation('setup');
  const { refetch } = useSetup();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));

  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Step 0: Account
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);

  // Step 1: Azure AD
  const [tenantId, setTenantId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [azureAdLoading, setAzureAdLoading] = useState(false);

  // Step 2: Integrations
  const [openaiEnabled, setOpenaiEnabled] = useState(false);
  const [openaiKey, setOpenaiKey] = useState('');
  const [clickupEnabled, setClickupEnabled] = useState(false);
  const [clickupKey, setClickupKey] = useState('');
  const [clickupTeamId, setClickupTeamId] = useState('');
  const [clickupListId, setClickupListId] = useState('');
  const [clickupBacklogListId, setClickupBacklogListId] = useState('');
  const [clickupDocsFolderId, setClickupDocsFolderId] = useState('');
  const [teamsEnabled, setTeamsEnabled] = useState(false);
  const [teamsWebhookUrl, setTeamsWebhookUrl] = useState('');
  const [integrationsLoading, setIntegrationsLoading] = useState(false);

  const next = () => setActiveStep((s) => Math.min(s + 1, STEPS.length - 1));

  // ─── Step 0: Create Account ──────────────────────────────────────────

  const passwordsMatch = password === passwordConfirm;
  const accountValid =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 8 &&
    passwordsMatch;

  const handleBootstrap = async () => {
    setAccountLoading(true);
    setError(null);
    try {
      const result = await setupApi.bootstrap({
        email: email.trim(),
        password,
        name: name.trim(),
      });
      localStorage.setItem(STORAGE_KEYS.TOKEN, result.token);
      next();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Bootstrap failed');
    }
    setAccountLoading(false);
  };

  // ─── Step 1: Azure AD ────────────────────────────────────────────────

  const azureAdFilled = tenantId.trim() && clientId.trim() && clientSecret.trim();

  const handleSaveAzureAd = async () => {
    setAzureAdLoading(true);
    setError(null);
    try {
      await setupApi.saveSettings({
        id: 'azure_ad',
        category: 'auth',
        values: {
          tenantId: tenantId.trim(),
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
        },
        enabled: true,
      });
      next();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save Azure AD config');
    }
    setAzureAdLoading(false);
  };

  // ─── Step 2: Integrations ────────────────────────────────────────────

  const handleSaveIntegrations = async () => {
    setIntegrationsLoading(true);
    setError(null);
    try {
      if (openaiEnabled && openaiKey.trim()) {
        await setupApi.saveSettings({
          id: 'openai',
          category: 'ai',
          values: { apiKey: openaiKey.trim() },
          enabled: true,
        });
      }
      if (clickupEnabled && clickupKey.trim()) {
        await setupApi.saveSettings({
          id: 'clickup',
          category: 'integrations',
          values: {
            apiKey: clickupKey.trim(),
            teamId: clickupTeamId.trim(),
            listId: clickupListId.trim(),
            productBacklogListId: clickupBacklogListId.trim(),
            docsFolderId: clickupDocsFolderId.trim(),
          },
          enabled: true,
        });
      }
      if (teamsEnabled && teamsWebhookUrl.trim()) {
        await setupApi.saveSettings({
          id: 'teams',
          category: 'integrations',
          values: { webhookUrl: teamsWebhookUrl.trim() },
          enabled: true,
        });
      }
      next();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save integrations');
    }
    setIntegrationsLoading(false);
  };

  // ─── Step 3: Done ────────────────────────────────────────────────────

  const handleEnter = async () => {
    await refetch();
    // Force a full reload to pick up fresh AuthContext state
    window.location.href = '/';
  };

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        bgcolor: 'background.default',
        py: { xs: 3, sm: 6 },
        px: 2,
      }}
    >
      {/* Header */}
      <Typography variant="h3" fontWeight={800} sx={{ mb: 0.5 }}>
        SORA
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        {t('wizard.subtitle')}
      </Typography>

      {/* Stepper */}
      <Stepper
        activeStep={activeStep}
        alternativeLabel={!isXs}
        orientation={isXs ? 'vertical' : 'horizontal'}
        sx={{ width: '100%', maxWidth: 600, mb: 4 }}
      >
        {STEPS.map((key) => (
          <Step key={key}>
            <StepLabel>{t(`wizard.steps.${key}`)}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Error */}
      <Collapse in={!!error} sx={{ width: '100%', maxWidth: 480, mb: 2 }}>
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Collapse>

      {/* Step content */}
      <Card variant="outlined" sx={{ width: '100%', maxWidth: 480 }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          {/* ─── Step 0: Account ─── */}
          {activeStep === 0 && (
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  {t('wizard.account.title')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('wizard.account.subtitle')}
                </Typography>
              </Box>
              <TextField
                label={t('wizard.account.name')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                autoFocus
              />
              <TextField
                label={t('wizard.account.email')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
              />
              <TextField
                label={t('wizard.account.password')}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                helperText={t('wizard.account.passwordHint')}
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label={t('wizard.account.passwordConfirm')}
                type={showPassword ? 'text' : 'password'}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                error={passwordConfirm.length > 0 && !passwordsMatch}
                helperText={
                  passwordConfirm.length > 0 && !passwordsMatch
                    ? t('wizard.account.passwordMismatch')
                    : undefined
                }
                fullWidth
              />
              <Button
                variant="contained"
                size="large"
                onClick={handleBootstrap}
                disabled={!accountValid || accountLoading}
                startIcon={
                  accountLoading ? <CircularProgress size={18} color="inherit" /> : null
                }
              >
                {accountLoading
                  ? t('wizard.account.creating')
                  : t('wizard.account.submit')}
              </Button>
            </Stack>
          )}

          {/* ─── Step 1: Azure AD ─── */}
          {activeStep === 1 && (
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  {t('wizard.azureAd.title')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('wizard.azureAd.subtitle')}
                </Typography>
              </Box>
              <TextField
                label={t('wizard.azureAd.tenantId')}
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                helperText={t('wizard.azureAd.tenantHint')}
                fullWidth
                autoFocus
              />
              <TextField
                label={t('wizard.azureAd.clientId')}
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                fullWidth
              />
              <TextField
                label={t('wizard.azureAd.clientSecret')}
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                fullWidth
              />
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={next}
                  sx={{ flex: 1 }}
                >
                  {t('wizard.azureAd.skip')}
                </Button>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleSaveAzureAd}
                  disabled={!azureAdFilled || azureAdLoading}
                  startIcon={
                    azureAdLoading ? <CircularProgress size={18} color="inherit" /> : null
                  }
                  sx={{ flex: 1 }}
                >
                  {azureAdLoading
                    ? t('wizard.azureAd.saving')
                    : t('wizard.azureAd.save')}
                </Button>
              </Stack>
            </Stack>
          )}

          {/* ─── Step 2: Integrations ─── */}
          {activeStep === 2 && (
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  {t('wizard.integrations.title')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('wizard.integrations.subtitle')}
                </Typography>
              </Box>

              {/* OpenAI */}
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="subtitle1" fontWeight={600}>
                    {t('wizard.integrations.openai.title')}
                  </Typography>
                  <Switch
                    checked={openaiEnabled}
                    onChange={(e) => setOpenaiEnabled(e.target.checked)}
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {t('wizard.integrations.openai.description')}
                </Typography>
                <Collapse in={openaiEnabled}>
                  <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                    <TextField
                      label={t('wizard.integrations.openai.apiKey')}
                      type="password"
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                      size="small"
                      fullWidth
                    />
                  </Stack>
                </Collapse>
              </Box>

              <Divider />

              {/* ClickUp */}
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="subtitle1" fontWeight={600}>
                    {t('wizard.integrations.clickup.title')}
                  </Typography>
                  <Switch
                    checked={clickupEnabled}
                    onChange={(e) => setClickupEnabled(e.target.checked)}
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {t('wizard.integrations.clickup.description')}
                </Typography>
                <Collapse in={clickupEnabled}>
                  <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                    <TextField
                      label={t('wizard.integrations.clickup.apiKey')}
                      type="password"
                      value={clickupKey}
                      onChange={(e) => setClickupKey(e.target.value)}
                      size="small"
                      fullWidth
                    />
                    <TextField
                      label={t('wizard.integrations.clickup.teamId')}
                      value={clickupTeamId}
                      onChange={(e) => setClickupTeamId(e.target.value)}
                      helperText={
                        clickupKey.trim() && clickupTeamId.trim()
                          ? 'Lists and docs loaded — select below'
                          : 'Enter API Key and Team ID to browse your workspace'
                      }
                      size="small"
                      fullWidth
                    />
                    <ClickupListPicker
                      label={t('wizard.integrations.clickup.listId')}
                      helperText="Where US tasks will be created"
                      value={clickupListId}
                      onChange={setClickupListId}
                      apiKey={clickupKey}
                      teamId={clickupTeamId}
                    />
                    <ClickupListPicker
                      label={t('wizard.integrations.clickup.productBacklogListId')}
                      helperText="US created by the workspace tool"
                      value={clickupBacklogListId}
                      onChange={setClickupBacklogListId}
                      apiKey={clickupKey}
                      teamId={clickupTeamId}
                    />
                    <ClickupDocPicker
                      label={t('wizard.integrations.clickup.docsFolderId')}
                      helperText="Doc to index for the knowledge assistant"
                      value={clickupDocsFolderId}
                      onChange={setClickupDocsFolderId}
                      apiKey={clickupKey}
                      teamId={clickupTeamId}
                    />
                  </Stack>
                </Collapse>
              </Box>

              <Divider />

              {/* Teams */}
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="subtitle1" fontWeight={600}>
                    {t('wizard.integrations.teams.title')}
                  </Typography>
                  <Switch
                    checked={teamsEnabled}
                    onChange={(e) => setTeamsEnabled(e.target.checked)}
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {t('wizard.integrations.teams.description')}
                </Typography>
                <Collapse in={teamsEnabled}>
                  <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                    <TextField
                      label={t('wizard.integrations.teams.webhookUrl')}
                      value={teamsWebhookUrl}
                      onChange={(e) => setTeamsWebhookUrl(e.target.value)}
                      size="small"
                      fullWidth
                    />
                  </Stack>
                </Collapse>
              </Box>

              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={next}
                  sx={{ flex: 1 }}
                >
                  {t('wizard.integrations.skip')}
                </Button>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleSaveIntegrations}
                  disabled={integrationsLoading}
                  startIcon={
                    integrationsLoading ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : null
                  }
                  sx={{ flex: 1 }}
                >
                  {integrationsLoading
                    ? t('wizard.integrations.saving')
                    : t('wizard.integrations.save')}
                </Button>
              </Stack>
            </Stack>
          )}

          {/* ─── Step 3: Done ─── */}
          {activeStep === 3 && (
            <Stack spacing={3} alignItems="center" sx={{ py: 2 }}>
              <DoneIcon color="success" sx={{ fontSize: 64 }} />
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={700}>
                  {t('wizard.done.title')}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                  {t('wizard.done.subtitle')}
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="large"
                startIcon={<RocketIcon />}
                onClick={handleEnter}
                sx={{ mt: 2, px: 6 }}
              >
                {t('wizard.done.enter')}
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
