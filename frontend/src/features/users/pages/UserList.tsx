import React, { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Slider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  PersonAdd as InviteIcon,
  Star as VipIcon,
  Visibility as ImpersonateIcon,
  Search as SearchIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import apiClient from '../../../shared/api/client';
import { useAuth } from '../../../features/auth/AuthContext';
import { useMode } from '../../../shared/ModeContext';
import { UserRole, AppMode } from '../../../shared/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRecord {
  id: string;
  oid: string;
  email: string;
  name: string;
  role: UserRole;
  vipLevel: number;
  createdAt: string;
  department?: string;
  jobTitle?: string;
}

interface AadUser {
  oid: string;
  displayName: string;
  mail: string | null;
  userPrincipalName: string;
  jobTitle: string | null;
  department: string | null;
}

// ─── API ──────────────────────────────────────────────────────────────────────

const usersApi = {
  list: (): Promise<UserRecord[]> => apiClient.get('/users').then((r) => r.data),
  update: (id: string, data: Partial<Pick<UserRecord, 'role' | 'vipLevel'>>) =>
    apiClient.patch(`/users/${id}`, data).then((r) => r.data),
  invite: (data: { email: string; role?: string; vipLevel?: number }) =>
    apiClient.post('/users/invite', data).then((r) => r.data),
  searchAad: (search: string): Promise<AadUser[]> =>
    apiClient.get(`/graph/users?search=${encodeURIComponent(search)}`).then((r) => r.data),
};

// ─── BulkActionToolbar ────────────────────────────────────────────────────────

function BulkActionToolbar({
  count,
  onClear,
  onRoleChange,
  onVipChange,
  isApplying,
  t,
}: {
  count: number;
  onClear: () => void;
  onRoleChange: (role: UserRole) => void;
  onVipChange: (vip: number) => void;
  isApplying: boolean;
  t: (key: string) => string;
}) {
  const [vip, setVip] = useState(5);

  return (
    <Toolbar
      sx={{
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        borderRadius: '8px 8px 0 0',
        minHeight: { xs: 48 },
        gap: 2,
        flexWrap: 'wrap',
        px: { xs: 1.5, sm: 2 },
      }}
    >
      <IconButton size="small" onClick={onClear} sx={{ color: 'inherit' }}>
        <CloseIcon fontSize="small" />
      </IconButton>
      <Typography variant="body2" fontWeight={600} sx={{ mr: 'auto' }}>
        {t('bulk.selected').replace('{{count}}', String(count))}
      </Typography>

      {isApplying && <CircularProgress size={20} sx={{ color: 'inherit' }} />}

      {/* Role bulk */}
      <Button
        size="small"
        variant="outlined"
        onClick={() => onRoleChange(UserRole.ADMIN)}
        disabled={isApplying}
        sx={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.5)', textTransform: 'none', fontSize: '0.8rem' }}
      >
        {t('bulk.setAdmin')}
      </Button>
      <Button
        size="small"
        variant="outlined"
        onClick={() => onRoleChange(UserRole.STANDARD)}
        disabled={isApplying}
        sx={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.5)', textTransform: 'none', fontSize: '0.8rem' }}
      >
        {t('bulk.setStandard')}
      </Button>

      {/* VIP bulk */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" sx={{ color: 'inherit', whiteSpace: 'nowrap' }}>VIP</Typography>
        <Slider
          value={vip}
          onChange={(_, val) => setVip(val as number)}
          min={0}
          max={10}
          step={1}
          size="small"
          valueLabelDisplay="auto"
          sx={{ width: { xs: 80, sm: 120 }, color: 'inherit' }}
        />
        <Button
          size="small"
          variant="outlined"
          onClick={() => onVipChange(vip)}
          disabled={isApplying}
          sx={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.5)', textTransform: 'none', fontSize: '0.8rem' }}
        >
          {t('bulk.applyVip')}
        </Button>
      </Box>
    </Toolbar>
  );
}

// ─── InviteDialog ─────────────────────────────────────────────────────────────

function InviteDialog({
  open,
  onClose,
  t,
  tShared,
}: {
  open: boolean;
  onClose: () => void;
  t: (key: string) => string;
  tShared: (key: string) => string;
}) {
  const queryClient = useQueryClient();
  const [options, setOptions] = useState<AadUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<AadUser | null>(null);
  const [role, setRole] = useState<UserRole>(UserRole.STANDARD);
  const [vipLevel, setVipLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inviteMutation = useMutation({
    mutationFn: () =>
      usersApi.invite({
        email: selected!.mail || selected!.userPrincipalName,
        role,
        vipLevel,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      handleClose();
    },
    onError: (err: any) => setError(err?.response?.data?.message || tShared('common.error')),
  });

  const handleInputChange = (_: React.SyntheticEvent, value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) { setOptions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        setOptions(await usersApi.searchAad(value));
      } catch {
        setError(tShared('common.error'));
      }
      setLoading(false);
    }, 350);
  };

  const handleClose = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setOptions([]); setSelected(null); setRole(UserRole.STANDARD); setVipLevel(0); setError(null);
    onClose();
  };

  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={isSmall}>
      <DialogTitle>{t('invite.title')}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {!selected ? (
          <Autocomplete<AadUser>
            sx={{ mt: 1 }}
            options={options}
            loading={loading}
            filterOptions={(x) => x}
            getOptionLabel={(o) => o.displayName}
            isOptionEqualToValue={(o, v) => o.oid === v.oid}
            onInputChange={handleInputChange}
            onChange={(_, value) => value && setSelected(value)}
            noOptionsText={t('invite.noResults')}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder={t('invite.searchPlaceholder')}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loading && <CircularProgress size={18} sx={{ mr: 1 }} />}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props} key={option.oid} sx={{ gap: 1.5 }}>
                <Avatar sx={{ width: 34, height: 34, flexShrink: 0 }}>
                  {option.displayName?.charAt(0)?.toUpperCase()}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>{option.displayName}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {option.mail || option.userPrincipalName}
                    {option.department && ` · ${option.department}`}
                  </Typography>
                </Box>
              </Box>
            )}
          />
        ) : (
          <Box sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Avatar sx={{ width: 48, height: 48 }}>
                {selected.displayName?.charAt(0)?.toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>{selected.displayName}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selected.mail || selected.userPrincipalName}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" color="text.secondary">{t('invite.role')}</Typography>
                <Select
                  value={role}
                  size="small"
                  fullWidth
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  sx={{ mt: 0.5 }}
                >
                  <MenuItem value="admin">{t('role.admin')}</MenuItem>
                  <MenuItem value="standard">{t('role.standard')}</MenuItem>
                </Select>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">{t('invite.vipLevel')}</Typography>
                <Slider
                  value={vipLevel}
                  onChange={(_, val) => setVipLevel(val as number)}
                  min={0} max={10} step={1} size="small" valueLabelDisplay="auto"
                  sx={{ mt: 1 }}
                />
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {selected && <Button onClick={() => setSelected(null)}>{t('invite.back')}</Button>}
        <Button onClick={handleClose}>{tShared('common.cancel')}</Button>
        {selected && (
          <Button
            variant="contained"
            onClick={() => inviteMutation.mutate()}
            disabled={inviteMutation.isPending}
          >
            {t('invite.confirm')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ─── UserList (main) ──────────────────────────────────────────────────────────

export default function UserList() {
  const { t } = useTranslation('users');
  const { t: tShared } = useTranslation('shared');
  const queryClient = useQueryClient();
  const { user: currentUser, impersonate, isImpersonating } = useAuth();
  const { mode } = useMode();

  const navigate = useNavigate();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkApplying, setBulkApplying] = useState(false);

  // Filter state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  const { data, isLoading, error } = useQuery<UserRecord[]>({
    queryKey: ['users'],
    queryFn: usersApi.list,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Pick<UserRecord, 'role' | 'vipLevel'>> }) =>
      usersApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); setUpdateError(null); },
    onError: () => setUpdateError(tShared('common.error')),
  });

  // Bulk actions
  const handleBulkRole = async (role: UserRole) => {
    setBulkApplying(true);
    try {
      await Promise.all([...selected].map((id) => usersApi.update(id, { role })));
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSelected(new Set());
    } catch {
      setUpdateError(tShared('common.error'));
    }
    setBulkApplying(false);
  };

  const handleBulkVip = async (vipLevel: number) => {
    setBulkApplying(true);
    try {
      await Promise.all([...selected].map((id) => usersApi.update(id, { vipLevel })));
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSelected(new Set());
    } catch {
      setUpdateError(tShared('common.error'));
    }
    setBulkApplying(false);
  };

  // Selection helpers
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () => {
    if (!filtered.length) return;
    const allSelected = filtered.every((u) => selected.has(u.id));
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((u) => u.id)));
    }
  };

  // Derived filter options
  const departments = useMemo(
    () => [...new Set((data ?? []).map((u) => u.department).filter(Boolean) as string[])].sort(),
    [data],
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase();
    return data.filter((u) => {
      if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (deptFilter !== 'all' && u.department !== deptFilter) return false;
      return true;
    });
  }, [data, search, roleFilter, deptFilter]);

  const allChecked = filtered.length > 0 && filtered.every((u) => selected.has(u.id));
  const someChecked = filtered.some((u) => selected.has(u.id)) && !allChecked;

  if (isLoading) return <CircularProgress />;
  if (error) return <Alert severity="error">{tShared('common.error')}</Alert>;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {t('title')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<InviteIcon />}
          onClick={() => setInviteOpen(true)}
        >
          {t('invite.button')}
        </Button>
      </Box>

      {/* Filter bar */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap', alignItems: 'center', '& > *': { minWidth: { xs: '100%', sm: 'auto' } } }}>
        <TextField
          size="small"
          placeholder={t('filter.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 220 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />

        <ToggleButtonGroup
          value={roleFilter}
          exclusive
          onChange={(_, v) => v && setRoleFilter(v)}
          size="small"
        >
          <ToggleButton value="all">{t('filter.all')}</ToggleButton>
          <ToggleButton value="admin">{t('role.admin')}</ToggleButton>
          <ToggleButton value="standard">{t('role.standard')}</ToggleButton>
        </ToggleButtonGroup>

        {departments.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <Select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              displayEmpty
            >
              <MenuItem value="all">{t('filter.allDepts')}</MenuItem>
              {departments.map((d) => (
                <MenuItem key={d} value={d}>{d}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {(search || roleFilter !== 'all' || deptFilter !== 'all') && (
          <Button
            size="small"
            onClick={() => { setSearch(''); setRoleFilter('all'); setDeptFilter('all'); }}
          >
            {t('filter.clear')}
          </Button>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          {t('filter.showing')
            .replace('{{count}}', String(filtered.length))
            .replace('{{total}}', String(data?.length ?? 0))}
        </Typography>
      </Box>

      {updateError && <Alert severity="error" sx={{ mb: 2 }}>{updateError}</Alert>}

      {/* Bulk action toolbar */}
      {selected.size > 0 && (
        <BulkActionToolbar
          count={selected.size}
          onClear={() => setSelected(new Set())}
          onRoleChange={handleBulkRole}
          onVipChange={handleBulkVip}
          isApplying={bulkApplying}
          t={t}
        />
      )}

      {/* Table */}
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{
          borderRadius: selected.size > 0 ? '0 0 8px 8px' : 2,
          borderTop: selected.size > 0 ? 0 : undefined,
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={someChecked}
                  checked={allChecked}
                  onChange={toggleAll}
                  size="small"
                />
              </TableCell>
              <TableCell>{t('col.name')}</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{t('col.email')}</TableCell>
              <TableCell>{t('col.role')}</TableCell>
              <TableCell>{t('col.vipLevel')}</TableCell>
              {mode === AppMode.ADMIN && <TableCell sx={{ width: 48 }} />}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((user) => {
              const isChecked = selected.has(user.id);
              const canImpersonate = mode === AppMode.ADMIN && !isImpersonating && user.oid !== currentUser?.oid;
              return (
                <TableRow
                  key={user.id}
                  hover
                  selected={isChecked}
                  sx={{ cursor: 'pointer' }}
                  onClick={() => toggleOne(user.id)}
                >
                  <TableCell padding="checkbox">
                    <Checkbox checked={isChecked} size="small" />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar
                        src={`/api/users/${user.id}/avatar`}
                        alt={user.name}
                        sx={{ width: 32, height: 32, fontSize: '0.85rem', flexShrink: 0 }}
                      >
                        {user.name?.charAt(0)?.toUpperCase()}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {user.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ display: { xs: 'block', md: 'none' } }}>
                          {user.email}
                        </Typography>
                        {(user.jobTitle || user.department) && (
                          <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ opacity: 0.7 }}>
                            {[user.jobTitle, user.department].filter(Boolean).join(' · ')}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    <Typography variant="body2" noWrap>{user.email}</Typography>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={user.role}
                      size="small"
                      variant="outlined"
                      onChange={(e: SelectChangeEvent) =>
                        updateMutation.mutate({ id: user.id, data: { role: e.target.value as UserRole } })
                      }
                      disabled={updateMutation.isPending}
                      sx={{ fontSize: '0.8rem', '& .MuiSelect-select': { py: 0.5 } }}
                    >
                      <MenuItem value="admin">
                        <Chip label={t('role.admin')} size="small" color="primary" />
                      </MenuItem>
                      <MenuItem value="standard">
                        <Chip label={t('role.standard')} size="small" />
                      </MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 100 }}>
                      {user.vipLevel > 0 && (
                        <VipIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                      )}
                      <Slider
                        value={user.vipLevel}
                        onChange={(_, val) =>
                          updateMutation.mutate({ id: user.id, data: { vipLevel: val as number } })
                        }
                        min={0}
                        max={10}
                        step={1}
                        size="small"
                        valueLabelDisplay="auto"
                        disabled={updateMutation.isPending}
                        sx={{ width: { xs: 60, sm: 100 } }}
                      />
                    </Box>
                  </TableCell>
                  {mode === AppMode.ADMIN && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {canImpersonate && (
                        <Tooltip title={tShared('impersonate.tooltip')}>
                          <IconButton size="small" color="secondary" onClick={async () => { await impersonate(user.id); navigate('/'); }} sx={{ p: 0.5 }}>
                            <ImpersonateIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary" textAlign="center" sx={{ py: 6 }}>
                    {t('filter.noResults')}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} t={t} tShared={tShared} />
    </Box>
  );
}
