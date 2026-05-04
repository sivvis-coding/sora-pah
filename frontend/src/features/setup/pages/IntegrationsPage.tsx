import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Cloud as AzureIcon,
  AutoAwesome as AiIcon,
  TaskAlt as ClickUpIcon,
  Chat as TeamsIcon,
  WarningAmber as DangerIcon,
  CheckCircle as SavedIcon,
  VpnKey as ConnectionIcon,
  List as ListsIcon,
  Tune as MappingsIcon,
  MenuBook as KbIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { setupApi, SettingRecord } from '../api/setup.api';
import { ClickupListPicker } from '../components/ClickupPickers';
import KnowledgeBaseSection from '../components/KnowledgeBaseSection';
import StatusMappingSection from '../components/StatusMappingSection';
import CardFieldSection from '../components/CardFieldSection';
import PriorityMappingSection from '../components/PriorityMappingSection';

// ─── Integration definitions ─────────────────────────────────────────────────

interface IntegrationDef {
  id: string;
  category: string;
  icon: React.ReactElement;
  titleKey: string;
  descKey: string;
  fields: { key: string; label: string; type?: string; helperText?: string }[];
}

const INTEGRATIONS: IntegrationDef[] = [
  {
    id: 'azure_ad',
    category: 'auth',
    icon: <AzureIcon />,
    titleKey: 'integrations.azureAd.title',
    descKey: 'integrations.azureAd.description',
    fields: [
      { key: 'tenantId', label: 'Tenant ID' },
      { key: 'clientId', label: 'Client ID' },
      { key: 'clientSecret', label: 'Client Secret', type: 'password' },
    ],
  },
  {
    id: 'openai',
    category: 'ai',
    icon: <AiIcon />,
    titleKey: 'integrations.openai.title',
    descKey: 'integrations.openai.description',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password' },
    ],
  },
  {
    id: 'clickup',
    category: 'integrations',
    icon: <ClickUpIcon />,
    titleKey: 'integrations.clickup.title',
    descKey: 'integrations.clickup.description',
    // Only apiKey + teamId are plain text fields; lists/docs use pickers
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password' },
      { key: 'teamId', label: 'Team ID', helperText: 'Found in ClickUp workspace URL' },
    ],
  },
  {
    id: 'teams',
    category: 'integrations',
    icon: <TeamsIcon />,
    titleKey: 'integrations.teams.title',
    descKey: 'integrations.teams.description',
    fields: [
      { key: 'webhookUrl', label: 'Webhook URL' },
    ],
  },
  {
    id: 'app',
    category: 'app',
    icon: <LinkIcon />,
    titleKey: 'integrations.appLinks.title',
    descKey: 'integrations.appLinks.description',
    fields: [
      { key: 'freshserviceUrl', label: 'Freshservice URL', helperText: 'URL for bug/incident reporting (e.g. https://yourcompany.freshservice.com)' },
      { key: 'helpUrl', label: 'Help URL', helperText: 'URL for help/documentation (default: /docs)' },
    ],
  },
];

// ─── ClickUp card (tabbed) ────────────────────────────────────────────────────

function ClickupCard({
  setting,
  onSaved,
}: {
  setting?: SettingRecord;
  onSaved: () => void;
}) {
  const { t } = useTranslation('setup');
  const isActive = setting?.enabled ?? false;
  const hasSavedCreds = !!(setting?.values.apiKey && setting?.values.teamId);
  const hasLists = !!(setting?.values.listId || setting?.values.productBacklogListId);

  const [tab, setTab] = useState(0);

  // ── Connection tab state ──
  const [editingConn, setEditingConn] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [teamId, setTeamId] = useState('');
  const [connSuccess, setConnSuccess] = useState(false);
  const [connError, setConnError] = useState<string | null>(null);

  // ── Lists tab state ──
  const [editingLists, setEditingLists] = useState(false);
  const [listId, setListId] = useState('');
  const [productBacklogListId, setProductBacklogListId] = useState('');
  const [listsSuccess, setListsSuccess] = useState(false);
  const [listsError, setListsError] = useState<string | null>(null);

  // ── Mutations ──
  const connMutation = useMutation({
    mutationFn: () =>
      setupApi.saveSettings({
        id: 'clickup',
        category: 'integrations',
        values: {
          ...setting?.values,
          apiKey: apiKey.trim(),
          teamId: teamId.trim(),
        },
        enabled: true,
      }),
    onSuccess: () => {
      setEditingConn(false);
      setConnSuccess(true);
      setConnError(null);
      setTimeout(() => setConnSuccess(false), 3000);
      onSaved();
    },
    onError: () => setConnError(t('integrations.error')),
  });

  const listsMutation = useMutation({
    mutationFn: () =>
      setupApi.saveSettings({
        id: 'clickup',
        category: 'integrations',
        values: {
          ...setting?.values,
          listId: listId.trim(),
          productBacklogListId: productBacklogListId.trim(),
        },
        enabled: true,
      }),
    onSuccess: () => {
      setEditingLists(false);
      setListsSuccess(true);
      setListsError(null);
      setTimeout(() => setListsSuccess(false), 3000);
      onSaved();
    },
    onError: () => setListsError(t('integrations.error')),
  });

  const toggleMutation = useMutation({
    mutationFn: () => setupApi.toggleSetting('clickup', !isActive),
    onSuccess: () => onSaved(),
  });

  // ── Tab definitions ──
  const tabs = [
    { label: t('integrations.clickup.tabs.connection'), icon: <ConnectionIcon sx={{ fontSize: 16 }} />, disabled: false },
    { label: t('integrations.clickup.tabs.lists'),      icon: <ListsIcon sx={{ fontSize: 16 }} />,      disabled: !hasSavedCreds },
    { label: t('integrations.clickup.tabs.mappings'),   icon: <MappingsIcon sx={{ fontSize: 16 }} />,   disabled: !hasLists },
    { label: t('integrations.clickup.tabs.knowledge'),  icon: <KbIcon sx={{ fontSize: 16 }} />,         disabled: !hasSavedCreds },
  ];

  return (
    <Card variant="outlined">
      {/* ── Header ── */}
      <CardHeader
        avatar={<ClickUpIcon color={isActive ? 'primary' : 'disabled'} />}
        title={t('integrations.clickup.title')}
        subheader={t('integrations.clickup.description')}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Chip
              label={t(isActive ? 'integrations.status.active' : 'integrations.status.inactive')}
              color={isActive ? 'success' : 'default'}
              size="small"
              variant={isActive ? 'filled' : 'outlined'}
            />
            {isActive && (
              <Button
                size="small"
                color="warning"
                onClick={() => toggleMutation.mutate()}
                disabled={toggleMutation.isPending}
                sx={{ textTransform: 'none', fontSize: '0.78rem' }}
              >
                {t('integrations.disable')}
              </Button>
            )}
          </Box>
        }
      />

      <Divider />

      {/* ── Tabs ── */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          px: 2,
          minHeight: 44,
          borderBottom: '1px solid',
          borderColor: 'divider',
          '& .MuiTab-root': { minHeight: 44, textTransform: 'none', fontSize: '0.85rem', gap: 0.75 },
        }}
      >
        {tabs.map((t_, i) => (
          t_.disabled ? (
            <Tooltip key={t_.label} title={t('integrations.clickup.tabDisabledHint')} placement="top">
              {/* Box absorbs MUI Tabs internal props (fullWidth, textColor, etc.) instead of leaking to DOM */}
              <Box component="span" sx={{ display: 'inline-flex' }}>
                <Tab
                  label={t_.label}
                  icon={t_.icon}
                  iconPosition="start"
                  disabled
                  value={i}
                />
              </Box>
            </Tooltip>
          ) : (
            <Tab
              key={t_.label}
              label={t_.label}
              icon={t_.icon}
              iconPosition="start"
              value={i}
            />
          )
        ))}
      </Tabs>

      {/* ── Tab: Connection ── */}
      {tab === 0 && (
        <CardContent>
          {/* Saved state summary */}
          {!editingConn && (
            <Box sx={{ mb: hasSavedCreds ? 2 : 0 }}>
              {hasSavedCreds ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <CredentialRow label="API Key" value={setting!.values.apiKey} masked />
                  <CredentialRow label="Team ID" value={setting!.values.teamId} />
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('integrations.clickup.connection.empty')}
                </Typography>
              )}
            </Box>
          )}

          {/* Edit form */}
          <Collapse in={editingConn}>
            <Stack spacing={2} sx={{ mt: hasSavedCreds ? 2 : 0 }}>
              <TextField
                label="API Key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                size="small"
                fullWidth
                autoFocus
                placeholder={hasSavedCreds ? '••••••••' : undefined}
                helperText={
                  hasSavedCreds && !apiKey
                    ? <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'success.main' }}>
                        <SavedIcon sx={{ fontSize: 13 }} />{t('integrations.clickup.connection.currentlySaved')}
                      </Box>
                    : t('integrations.clickup.connection.apiKeyHint')
                }
              />
              <TextField
                label="Team ID"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                size="small"
                fullWidth
                helperText={
                  hasSavedCreds && !teamId
                    ? <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'success.main' }}>
                        <SavedIcon sx={{ fontSize: 13 }} />{setting!.values.teamId}
                      </Box>
                    : t('integrations.clickup.connection.teamIdHint')
                }
              />
              {connError && <Alert severity="error">{connError}</Alert>}
            </Stack>
          </Collapse>

          <Collapse in={connSuccess}>
            <Alert severity="success" sx={{ mt: 2 }}>{t('integrations.saved')}</Alert>
          </Collapse>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            {editingConn ? (
              <>
                <Button size="small" onClick={() => setEditingConn(false)}>{t('integrations.cancel')}</Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => connMutation.mutate()}
                  disabled={connMutation.isPending || (!apiKey.trim() && !teamId.trim())}
                  startIcon={connMutation.isPending ? <CircularProgress size={14} color="inherit" /> : null}
                >
                  {connMutation.isPending ? t('integrations.saving') : t('integrations.save')}
                </Button>
              </>
            ) : (
              <Button
                size="small"
                variant={hasSavedCreds ? 'outlined' : 'contained'}
                onClick={() => { setApiKey(''); setTeamId(''); setEditingConn(true); setConnError(null); }}
              >
                {hasSavedCreds ? t('integrations.edit') : t('integrations.clickup.connection.configure')}
              </Button>
            )}
          </Box>
        </CardContent>
      )}

      {/* ── Tab: Lists ── */}
      {tab === 1 && (
        <CardContent>
          {/* Saved state summary */}
          {!editingLists && (
            <Box sx={{ mb: 2 }}>
              {hasLists ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {setting?.values.listId && (
                    <CredentialRow label={t('integrations.clickup.lists.sprintLabel')} value={setting.values.listId} />
                  )}
                  {setting?.values.productBacklogListId && (
                    <CredentialRow label={t('integrations.clickup.lists.backlogLabel')} value={setting.values.productBacklogListId} />
                  )}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('integrations.clickup.lists.empty')}
                </Typography>
              )}
            </Box>
          )}

          <Collapse in={editingLists}>
            <Stack spacing={2.5} sx={{ mb: 2 }}>
              <ClickupListPicker
                label={t('integrations.clickup.lists.sprintLabel')}
                helperText={t('integrations.clickup.lists.sprintHint')}
                value={listId}
                onChange={setListId}
                hasSavedCreds={hasSavedCreds}
              />
              <ClickupListPicker
                label={t('integrations.clickup.lists.backlogLabel')}
                helperText={t('integrations.clickup.lists.backlogHint')}
                value={productBacklogListId}
                onChange={setProductBacklogListId}
                hasSavedCreds={hasSavedCreds}
              />
              {listsError && <Alert severity="error">{listsError}</Alert>}
            </Stack>
          </Collapse>

          <Collapse in={listsSuccess}>
            <Alert severity="success" sx={{ mb: 2 }}>{t('integrations.saved')}</Alert>
          </Collapse>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {editingLists ? (
              <>
                <Button size="small" onClick={() => setEditingLists(false)}>{t('integrations.cancel')}</Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => listsMutation.mutate()}
                  disabled={listsMutation.isPending || (!listId.trim() && !productBacklogListId.trim())}
                  startIcon={listsMutation.isPending ? <CircularProgress size={14} color="inherit" /> : null}
                >
                  {listsMutation.isPending ? t('integrations.saving') : t('integrations.save')}
                </Button>
              </>
            ) : (
              <Button
                size="small"
                variant={hasLists ? 'outlined' : 'contained'}
                onClick={() => { setListId(''); setProductBacklogListId(''); setEditingLists(true); setListsError(null); }}
              >
                {hasLists ? t('integrations.edit') : t('integrations.clickup.lists.configure')}
              </Button>
            )}
          </Box>
        </CardContent>
      )}

      {/* ── Tab: Mappings ── */}
      {tab === 2 && (
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            {t('integrations.clickup.mappings.subtitle')}
          </Typography>
          <StatusMappingSection />
          <CardFieldSection />
          <PriorityMappingSection />
        </CardContent>
      )}

      {/* ── Tab: Knowledge Base ── */}
      {tab === 3 && (
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            {t('integrations.clickup.knowledge.subtitle')}
          </Typography>
          <KnowledgeBaseSection />
        </CardContent>
      )}
    </Card>
  );
}

// ─── Credential row (read-only display) ──────────────────────────────────────

function CredentialRow({ label, value, masked }: { label: string; value: string; masked?: boolean }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1, borderRadius: 1.5, bgcolor: 'action.hover' }}>
      <SavedIcon sx={{ fontSize: 14, color: 'success.main', flexShrink: 0 }} />
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, minWidth: 72 }}>
        {label}
      </Typography>
      <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.primary' }}>
        {masked ? `${value.slice(0, 6)}${'•'.repeat(Math.min(value.length - 6, 12))}` : value}
      </Typography>
    </Box>
  );
}

// ─── Generic card (for Azure AD, OpenAI, Teams) ───────────────────────────────

function IntegrationCard({
  def,
  setting,
  onSaved,
}: {
  def: IntegrationDef;
  setting?: SettingRecord;
  onSaved: () => void;
}) {
  const { t } = useTranslation('setup');
  const isActive = setting?.enabled ?? false;
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: () =>
      setupApi.saveSettings({ id: def.id, category: def.category, values, enabled: true }),
    onSuccess: () => {
      setEditing(false);
      setSuccess(true);
      setError(null);
      setTimeout(() => setSuccess(false), 3000);
      onSaved();
    },
    onError: () => setError(t('integrations.error')),
  });

  const toggleMutation = useMutation({
    mutationFn: () => setupApi.toggleSetting(def.id, !isActive),
    onSuccess: () => onSaved(),
  });

  const handleEdit = () => {
    const initial: Record<string, string> = {};
    def.fields.forEach((f) => { initial[f.key] = ''; });
    setValues(initial);
    setEditing(true);
    setError(null);
  };

  return (
    <Card variant="outlined">
      <CardHeader
        avatar={React.cloneElement(def.icon, { color: isActive ? 'primary' : 'disabled' })}
        title={t(def.titleKey)}
        subheader={t(def.descKey)}
        action={
          <Chip
            label={t(isActive ? 'integrations.status.active' : 'integrations.status.inactive')}
            color={isActive ? 'success' : 'default'}
            size="small"
            variant={isActive ? 'filled' : 'outlined'}
          />
        }
      />
      <Collapse in={editing}>
        <Divider />
        <CardContent>
          <Stack spacing={2}>
            {def.fields.map((field) => {
              const savedVal = setting?.values[field.key];
              const currentVal = values[field.key] || '';
              return (
                <TextField
                  key={field.key}
                  label={field.label}
                  type={field.type || 'text'}
                  value={currentVal}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  helperText={
                    savedVal && !currentVal
                      ? <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'success.main' }}>
                          <SavedIcon sx={{ fontSize: 13 }} />
                          Saved: {savedVal}
                        </Box>
                      : field.helperText
                  }
                  size="small"
                  fullWidth
                  placeholder={savedVal && !currentVal ? '••••••••' : undefined}
                />
              );
            })}
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </CardContent>
      </Collapse>
      <Collapse in={success}>
        <Box sx={{ px: 2, pb: 1 }}>
          <Alert severity="success">{t('integrations.saved')}</Alert>
        </Box>
      </Collapse>
      <CardActions sx={{ px: 2, pb: 2 }}>
        {editing ? (
          <>
            <Button size="small" onClick={() => setEditing(false)}>{t('integrations.cancel')}</Button>
            <Button
              size="small"
              variant="contained"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              startIcon={saveMutation.isPending ? <CircularProgress size={14} color="inherit" /> : null}
            >
              {saveMutation.isPending ? t('integrations.saving') : t('integrations.save')}
            </Button>
          </>
        ) : (
          <>
            <Button size="small" onClick={handleEdit}>{t('integrations.edit')}</Button>
            {isActive && (
              <Button
                size="small"
                color="warning"
                onClick={() => toggleMutation.mutate()}
                disabled={toggleMutation.isPending}
              >
                {t('integrations.disable')}
              </Button>
            )}
          </>
        )}
      </CardActions>
    </Card>
  );
}

// ─── Factory Reset ───────────────────────────────────────────────────────────

function FactoryResetCard() {
  const { t } = useTranslation('setup');
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const resetMutation = useMutation({
    mutationFn: () => setupApi.factoryReset(),
    onSuccess: () => {
      localStorage.clear();
      window.location.href = '/';
    },
    onError: () => setError('Factory reset failed. Check server logs.'),
  });

  const handleReset = () => {
    if (confirmText !== 'RESET') {
      setError(t('integrations.factoryReset.confirmError'));
      return;
    }
    resetMutation.mutate();
  };

  return (
    <>
      <Card variant="outlined" sx={{ borderColor: 'error.main', borderWidth: 2 }}>
        <CardHeader
          avatar={<DangerIcon color="error" />}
          title={t('integrations.factoryReset.title')}
          subheader={t('integrations.factoryReset.description')}
          titleTypographyProps={{ color: 'error' }}
        />
        <CardActions sx={{ px: 2, pb: 2 }}>
          <Button color="error" variant="outlined" onClick={() => setOpen(true)}>
            {t('integrations.factoryReset.button')}
          </Button>
        </CardActions>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle color="error">{t('integrations.factoryReset.title')}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {t('integrations.factoryReset.description')}
          </DialogContentText>
          <TextField
            label={t('integrations.factoryReset.confirm')}
            placeholder={t('integrations.factoryReset.confirmPlaceholder')}
            value={confirmText}
            onChange={(e) => { setConfirmText(e.target.value); setError(null); }}
            error={!!error}
            helperText={error}
            fullWidth
            autoFocus
          />
          {resetMutation.isPending && (
            <Alert severity="info" sx={{ mt: 2 }}>
              {t('integrations.factoryReset.resetting')}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{t('integrations.cancel')}</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleReset}
            disabled={resetMutation.isPending}
            startIcon={resetMutation.isPending ? <CircularProgress size={14} color="inherit" /> : null}
          >
            {t('integrations.factoryReset.button')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const { t } = useTranslation('setup');
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<SettingRecord[]>({
    queryKey: ['setup-settings'],
    queryFn: setupApi.getSettings,
  });

  const settingsMap = new Map(settings?.map((s) => [s.id, s]));

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['setup-settings'] });
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 0.5 }}>{t('integrations.title')}</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {t('integrations.subtitle')}
      </Typography>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={2} sx={{ maxWidth: 640 }}>
          {INTEGRATIONS.filter((d) => d.id !== 'clickup').map((def) => (
            <IntegrationCard
              key={def.id}
              def={def}
              setting={settingsMap.get(def.id)}
              onSaved={handleSaved}
            />
          ))}

          <ClickupCard setting={settingsMap.get('clickup')} onSaved={handleSaved} />

          <Divider sx={{ my: 2 }} />
          <FactoryResetCard />
        </Stack>
      )}
    </Box>
  );
}
