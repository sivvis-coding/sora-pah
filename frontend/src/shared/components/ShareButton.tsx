import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  ListItem,
  ListItemAvatar,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Snackbar,
  Alert,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Share as ShareIcon,
  ContentCopy as CopyIcon,
  Send as SendIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { graphApi, type AdPerson } from '../../features/ideas/api/graph.api';
import { ideasApi } from '../../features/ideas/api/ideas.api';

// ─── Teams inline SVG ────────────────────────────────────────────────────────

function TeamsIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20.625 6.75h-5.25a.375.375 0 0 0-.375.375v5.25c0 2.07 1.68 3.75 3.75 3.75s3.75-1.68 3.75-3.75V7.5a.75.75 0 0 0-.75-.75h-.75z"
        fill="#5059C9"
      />
      <circle cx="18.75" cy="4.875" r="1.875" fill="#5059C9" />
      <circle cx="12" cy="4.5" r="2.25" fill="#7B83EB" />
      <path
        d="M15.75 9H8.25A.75.75 0 0 0 7.5 9.75v5.625A4.875 4.875 0 0 0 12 20.25a4.875 4.875 0 0 0 4.5-4.875V9.75A.75.75 0 0 0 15.75 9z"
        fill="#7B83EB"
      />
      <path
        d="M12 9v11.25a4.866 4.866 0 0 1-4.5-4.875V9.75A.75.75 0 0 1 8.25 9H12z"
        fill="rgba(0,0,0,0.1)"
      />
    </svg>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getEmail(person: AdPerson): string {
  return person.mail || person.userPrincipalName;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface ShareButtonProps {
  /** Idea ID for the share API call */
  ideaId: string;
  /** Full title of the idea */
  title: string;
  /** Path relative to origin, e.g. /ideas/abc123 */
  path: string;
  /** Pre-built share message from i18n */
  message?: string;
}

export default function ShareButton({ ideaId, title, path, message }: ShareButtonProps) {
  const { t } = useTranslation('shared');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; severity: 'success' | 'error'; message: string }>({
    open: false,
    severity: 'success',
    message: '',
  });

  // ─── People picker state ─────────────────────────────────────────────────

  const [selected, setSelected] = useState<AdPerson[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<AdPerson[]>([]);
  const [searching, setSearching] = useState(false);

  const url = `${window.location.origin}${path}`;

  // ─── Debounced search ────────────────────────────────────────────────────

  const searchTimerRef = React.useRef<ReturnType<typeof setTimeout>>();

  const handleInputChange = useCallback((_: unknown, value: string) => {
    setInputValue(value);

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (value.length < 2) {
      setOptions([]);
      return;
    }

    setSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await graphApi.searchPeople(value);
        setOptions(results);
      } catch {
        setOptions([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  // ─── Share mutation ──────────────────────────────────────────────────────

  const shareMutation = useMutation({
    mutationFn: () => {
      const emails = selected.map(getEmail);
      return ideasApi.share(ideaId, emails, message);
    },
    onSuccess: (data) => {
      setDialogOpen(false);
      setSelected([]);
      setInputValue('');
      setSnack({
        open: true,
        severity: 'success',
        message: t('share.sent', { count: data.recipientCount }),
      });
    },
    onError: () => {
      setSnack({ open: true, severity: 'error', message: t('share.error') });
    },
  });

  // ─── Menu handlers ───────────────────────────────────────────────────────

  const handleTeamsShare = () => {
    setAnchor(null);
    setDialogOpen(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
    }
    setAnchor(null);
  };

  const handleOutlook = () => {
    const subject = encodeURIComponent(`💡 ${title}`);
    const body = encodeURIComponent(`${message ?? title}\n\n${url}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
    setAnchor(null);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setSelected([]);
    setInputValue('');
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <Tooltip title={t('share.tooltip')}>
        <IconButton
          size="small"
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{ color: 'text.secondary' }}
        >
          <ShareIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* ── Dropdown menu ── */}
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 180 } } }}
      >
        <MenuItem onClick={handleTeamsShare} sx={{ gap: 0 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <TeamsIcon />
          </ListItemIcon>
          <ListItemText primary={t('share.teams')} />
        </MenuItem>

        <MenuItem onClick={handleCopy} sx={{ gap: 0 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <CopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t('share.copyUrl')} />
        </MenuItem>

        <MenuItem onClick={handleOutlook} sx={{ gap: 0 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <EmailIcon fontSize="small" sx={{ color: '#0078D4' }} />
          </ListItemIcon>
          <ListItemText primary={t('share.outlook')} />
        </MenuItem>
      </Menu>

      {/* ── Share dialog with people picker ── */}
      <Dialog
        open={dialogOpen}
        onClose={handleClose}
        fullScreen={isMobile}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TeamsIcon size={22} />
            <Typography variant="h6" fontWeight={700}>
              {t('share.dialogTitle')}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t('share.dialogSubtitle', { title })}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          <Autocomplete
            multiple
            options={options}
            value={selected}
            inputValue={inputValue}
            onInputChange={handleInputChange}
            onChange={(_, value) => setSelected(value)}
            getOptionLabel={(option) => option.displayName}
            isOptionEqualToValue={(a, b) => a.oid === b.oid}
            filterSelectedOptions
            loading={searching}
            noOptionsText={
              inputValue.length < 2
                ? t('share.typeToSearch')
                : t('share.noResults')
            }
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder={t('share.searchPlaceholder')}
                variant="outlined"
                size="small"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {searching && <CircularProgress size={18} />}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
                sx={{ mt: 1 }}
              />
            )}
            renderOption={(props, option) => (
              <ListItem {...props} key={option.oid} dense>
                <ListItemAvatar sx={{ minWidth: 40 }}>
                  <Avatar sx={{ width: 32, height: 32, fontSize: 14, bgcolor: 'primary.main' }}>
                    {getInitials(option.displayName)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={option.displayName}
                  secondary={
                    [option.jobTitle, option.department].filter(Boolean).join(' · ') ||
                    getEmail(option)
                  }
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItem>
            )}
            renderTags={(value, getTagProps) =>
              value.map((person, index) => (
                <Chip
                  {...getTagProps({ index })}
                  key={person.oid}
                  avatar={
                    <Avatar sx={{ width: 24, height: 24, fontSize: 11 }}>
                      {getInitials(person.displayName)}
                    </Avatar>
                  }
                  label={person.displayName}
                  size="small"
                  sx={{ borderRadius: 2 }}
                />
              ))
            }
            sx={{ mb: 1 }}
          />

          {/* Preview of what they'll receive */}
          {selected.length > 0 && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                bgcolor: 'action.hover',
                borderRadius: 2,
                borderLeft: '3px solid',
                borderColor: 'primary.main',
              }}
            >
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mb: 0.5, display: 'block' }}>
                {t('share.preview')}
              </Typography>
              <Typography variant="body2">
                {message ?? title}
              </Typography>
              <Typography variant="body2" color="primary" sx={{ mt: 0.5, wordBreak: 'break-all' }}>
                {url}
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} color="inherit">
            {t('share.cancel')}
          </Button>
          <Button
            variant="contained"
            disabled={selected.length === 0 || shareMutation.isPending}
            onClick={() => shareMutation.mutate()}
            startIcon={
              shareMutation.isPending ? <CircularProgress size={16} /> : <SendIcon />
            }
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
          >
            {t('share.send', { count: selected.length })}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbars ── */}
      <Snackbar
        open={copied}
        autoHideDuration={2500}
        onClose={() => setCopied(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" sx={{ borderRadius: 2 }} onClose={() => setCopied(false)}>
          {t('share.copied')}
        </Alert>
      </Snackbar>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snack.severity}
          variant="filled"
          sx={{ borderRadius: 2 }}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </>
  );
}
