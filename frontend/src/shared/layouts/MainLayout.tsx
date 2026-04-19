import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  ListItemAvatar,
  Toolbar,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Logout as LogoutIcon,
  AdminPanelSettings as AdminIcon,
  Person as StakeholderIcon,
  Menu as MenuIcon,
  VisibilityOff as ExitImpersonateIcon,
  HelpOutline as HelpIcon,
  History as ActivityIcon,
} from '@mui/icons-material';
import { useAuth } from '../../features/auth/AuthContext';
import { useMode } from '../ModeContext';
import { mainNavItems, adminSectionItems, secondaryNavItems } from '../nav';
import { APP_NAME, DRAWER_WIDTH, RAIL_WIDTH, AppMode } from '../constants';

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isImpersonating, stopImpersonating } = useAuth();
  const { mode, setMode, canSwitchMode } = useMode();
  const { t, i18n } = useTranslation('shared');
  const { t: tAuth } = useTranslation('auth');

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); // <900px
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));      // <600px

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [avatarMenuAnchor, setAvatarMenuAnchor] = useState<null | HTMLElement>(null);

  const isAdmin = mode === AppMode.ADMIN;

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const handleLanguageChange = (_: React.MouseEvent, newLang: string | null) => {
    if (newLang) i18n.changeLanguage(newLang);
  };

  const handleModeChange = (_: React.MouseEvent, newMode: string | null) => {
    if (newMode && canSwitchMode) {
      setMode(newMode as AppMode);
      navigate('/');
    }
  };

  const handleXsModeToggle = () => {
    if (!canSwitchMode) return;
    const next = mode === AppMode.ADMIN ? AppMode.STAKEHOLDER : AppMode.ADMIN;
    setMode(next);
    navigate('/');
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    if (isMobile) setDrawerOpen(false);
  };

  // ─── Language toggle ───────────────────────────────────────────────────
  const langToggle = (
    <ToggleButtonGroup
      value={i18n.language?.startsWith('es') ? 'es' : 'en'}
      exclusive
      onChange={handleLanguageChange}
      size="small"
      sx={{
        '& .MuiToggleButton-root': {
          color: isXs ? undefined : 'rgba(255,255,255,0.7)',
          borderColor: isXs ? undefined : 'rgba(255,255,255,0.3)',
          px: 1.5,
          py: 0.25,
          fontSize: '0.75rem',
          '&.Mui-selected': {
            color: isXs ? undefined : '#fff',
            backgroundColor: isXs ? undefined : 'rgba(255,255,255,0.2)',
          },
        },
      }}
    >
      <ToggleButton value="en">EN</ToggleButton>
      <ToggleButton value="es">ES</ToggleButton>
    </ToggleButtonGroup>
  );

  // ─── Desktop icon rail ─────────────────────────────────────────────────
  const railContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        height: '100%',
        pt: 1,
      }}
    >
      <Toolbar />

      {/* Main nav items */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, px: 0.75, width: '100%' }}>
        {mainNavItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Tooltip key={item.path} title={t(item.labelKey)} placement="right" arrow>
              <Box
                onClick={() => navigate(item.path)}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.25,
                  py: 1,
                  borderRadius: 2,
                  cursor: 'pointer',
                  bgcolor: active ? 'action.selected' : 'transparent',
                  color: active ? 'primary.main' : 'text.secondary',
                  transition: 'background-color 0.15s, color 0.15s',
                  '&:hover': {
                    bgcolor: active ? 'action.selected' : 'action.hover',
                  },
                }}
              >
                {React.cloneElement(item.icon, { sx: { fontSize: 22 } })}
                <Typography
                  sx={{
                    fontSize: '0.6rem',
                    fontWeight: active ? 700 : 500,
                    lineHeight: 1,
                    textAlign: 'center',
                    userSelect: 'none',
                  }}
                >
                  {t(item.labelKey)}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      {/* Admin section */}
      {isAdmin && (
        <>
          <Divider sx={{ width: '60%', my: 1 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, px: 0.75, width: '100%' }}>
            {adminSectionItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Tooltip key={item.path} title={t(item.labelKey)} placement="right" arrow>
                  <Box
                    onClick={() => navigate(item.path)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      py: 0.75,
                      borderRadius: 2,
                      cursor: 'pointer',
                      bgcolor: active ? 'action.selected' : 'transparent',
                      color: active ? 'primary.main' : 'text.disabled',
                      transition: 'background-color 0.15s, color 0.15s',
                      '&:hover': {
                        bgcolor: active ? 'action.selected' : 'action.hover',
                        color: 'text.secondary',
                      },
                    }}
                  >
                    {React.cloneElement(item.icon, { sx: { fontSize: 18 } })}
                  </Box>
                </Tooltip>
              );
            })}
          </Box>
        </>
      )}
    </Box>
  );

  // ─── Mobile drawer content (full labels) ───────────────────────────────
  const mobileDrawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar />
      <List sx={{ flex: 1, px: 1 }}>
        {mainNavItems.map((item) => (
          <ListItemButton
            key={item.path}
            selected={isActive(item.path)}
            onClick={() => handleNavClick(item.path)}
            sx={{
              borderRadius: 2,
              mb: 0.25,
              '&.Mui-selected': {
                bgcolor: 'action.selected',
                '&:hover': { bgcolor: 'action.selected' },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>{item.icon}</ListItemIcon>
            <ListItemText
              primary={t(item.labelKey)}
              primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
            />
          </ListItemButton>
        ))}

        {/* Admin section in mobile */}
        {isAdmin && (
          <>
            <Divider sx={{ my: 1.5, mx: 1 }} />
            <Typography
              variant="caption"
              sx={{
                px: 2,
                pb: 0.5,
                display: 'block',
                fontSize: '0.65rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'text.disabled',
              }}
            >
              {t('nav.adminSection')}
            </Typography>
            {adminSectionItems.map((item) => (
              <ListItemButton
                key={item.path}
                selected={isActive(item.path)}
                onClick={() => handleNavClick(item.path)}
                sx={{
                  borderRadius: 2,
                  mb: 0.25,
                  '&.Mui-selected': {
                    bgcolor: 'action.selected',
                    '&:hover': { bgcolor: 'action.selected' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={t(item.labelKey)}
                  primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
                />
              </ListItemButton>
            ))}
          </>
        )}

        {/* Secondary items (Help, My Activity) in mobile drawer */}
        <Divider sx={{ my: 1.5, mx: 1 }} />
        {secondaryNavItems.map((item) => (
          <ListItemButton
            key={item.path}
            selected={isActive(item.path)}
            onClick={() => handleNavClick(item.path)}
            sx={{
              borderRadius: 2,
              mb: 0.25,
              '&.Mui-selected': {
                bgcolor: 'action.selected',
                '&:hover': { bgcolor: 'action.selected' },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>{item.icon}</ListItemIcon>
            <ListItemText
              primary={t(item.labelKey)}
              primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
            />
          </ListItemButton>
        ))}
      </List>
      {/* Language toggle in mobile drawer footer */}
      {isXs && (
        <>
          <Divider />
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
            {langToggle}
          </Box>
        </>
      )}
    </Box>
  );

  // ─── Avatar dropdown menu ──────────────────────────────────────────────
  const avatarMenu = (
    <Menu
      anchorEl={avatarMenuAnchor}
      open={Boolean(avatarMenuAnchor)}
      onClose={() => setAvatarMenuAnchor(null)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{
        paper: {
          sx: {
            mt: 1,
            minWidth: 180,
            borderRadius: 2,
            boxShadow: theme.shadows[8],
          },
        },
      }}
    >
      {/* User info header */}
      {user && (
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" fontWeight={700}>
            {user.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user.email}
          </Typography>
        </Box>
      )}

      {/* My Activity */}
      <MenuItem
        onClick={() => {
          setAvatarMenuAnchor(null);
          navigate('/my-activity');
        }}
        sx={{ gap: 1.5, py: 1 }}
      >
        <ActivityIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
        <Typography variant="body2">{t('nav.myActivity')}</Typography>
      </MenuItem>

      <Divider />

      {/* Impersonation or Logout */}
      {isImpersonating ? (
        <MenuItem
          onClick={() => {
            setAvatarMenuAnchor(null);
            stopImpersonating();
          }}
          sx={{ gap: 1.5, py: 1, color: 'warning.main' }}
        >
          <ExitImpersonateIcon sx={{ fontSize: 18 }} />
          <Typography variant="body2">{t('impersonate.stop')}</Typography>
        </MenuItem>
      ) : (
        <MenuItem
          onClick={() => {
            setAvatarMenuAnchor(null);
            logout();
          }}
          sx={{ gap: 1.5, py: 1 }}
        >
          <LogoutIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Typography variant="body2">{tAuth('logout')}</Typography>
        </MenuItem>
      )}
    </Menu>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* ─── AppBar ─── */}
      <AppBar position="fixed" sx={{ zIndex: (th) => th.zIndex.drawer + 1 }}>
        <Toolbar sx={{ gap: 1 }}>
          {/* Hamburger on mobile */}
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: 0.5 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Brand */}
          <Typography
            variant="h6"
            noWrap
            onClick={() => navigate('/')}
            sx={{
              flexGrow: 1,
              fontSize: { xs: '1rem', sm: '1.25rem' },
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            {APP_NAME}
          </Typography>

          {/* Mode switch — only for admins, hidden on xs */}
          {canSwitchMode && !isXs && (
            <Tooltip title={t('mode.switchTooltip')}>
              <ToggleButtonGroup
                value={mode}
                exclusive
                onChange={handleModeChange}
                size="small"
                sx={{
                  '& .MuiToggleButton-root': {
                    color: 'rgba(255,255,255,0.7)',
                    borderColor: 'rgba(255,255,255,0.3)',
                    px: 1.5,
                    py: 0.25,
                    fontSize: '0.75rem',
                    '&.Mui-selected': {
                      color: '#fff',
                      backgroundColor: 'rgba(255,255,255,0.2)',
                    },
                  },
                }}
              >
                <ToggleButton value="admin">
                  <AdminIcon sx={{ fontSize: 14, mr: 0.5 }} />
                  {t('mode.admin')}
                </ToggleButton>
                <ToggleButton value="stakeholder">
                  <StakeholderIcon sx={{ fontSize: 14, mr: 0.5 }} />
                  {t('mode.stakeholder')}
                </ToggleButton>
              </ToggleButtonGroup>
            </Tooltip>
          )}

          {/* Compact mode switch — xs only, admin */}
          {canSwitchMode && isXs && (
            <Tooltip title={t('mode.switchTooltip')}>
              <IconButton color="inherit" onClick={handleXsModeToggle} size="small">
                {mode === AppMode.ADMIN ? <AdminIcon /> : <StakeholderIcon />}
              </IconButton>
            </Tooltip>
          )}

          {/* Language toggle — hidden on xs */}
          {!isXs && <Box sx={{ ml: 1 }}>{langToggle}</Box>}

          {/* Help icon — desktop only (mobile has it in drawer) */}
          {!isMobile && (
            <Tooltip title={t('nav.help')}>
              <IconButton
                color="inherit"
                onClick={() => navigate('/help')}
                size="small"
                sx={{ opacity: 0.8, '&:hover': { opacity: 1 } }}
              >
                <HelpIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {/* Avatar — opens dropdown menu */}
          {user && (
            <>
              <Tooltip title={user.name}>
                <IconButton
                  onClick={(e) => setAvatarMenuAnchor(e.currentTarget)}
                  size="small"
                  sx={{ ml: 0.5 }}
                >
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    badgeContent={
                      isImpersonating ? (
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: 'warning.main',
                            border: '1.5px solid',
                            borderColor: 'primary.main',
                          }}
                        />
                      ) : null
                    }
                  >
                    <Avatar
                      src="/api/me/avatar"
                      alt={user.name}
                      sx={{ width: 32, height: 32, fontSize: '0.85rem' }}
                    >
                      {user.name?.charAt(0)?.toUpperCase()}
                    </Avatar>
                  </Badge>
                </IconButton>
              </Tooltip>
              {avatarMenu}
            </>
          )}
        </Toolbar>
      </AppBar>

      {/* ─── Navigation ─── */}
      {isMobile ? (
        // Mobile: temporary full-width drawer
        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
            },
          }}
        >
          {mobileDrawerContent}
        </Drawer>
      ) : (
        // Desktop: icon rail
        <Drawer
          variant="permanent"
          sx={{
            width: RAIL_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: RAIL_WIDTH,
              boxSizing: 'border-box',
              borderRight: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
            },
          }}
        >
          {railContent}
        </Drawer>
      )}

      {/* ─── Main content ─── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { xs: '100%', md: `calc(100% - ${RAIL_WIDTH}px)` },
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
