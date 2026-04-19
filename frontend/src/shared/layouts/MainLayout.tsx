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
} from '@mui/icons-material';
import { useAuth } from '../../features/auth/AuthContext';
import { useMode } from '../ModeContext';
import { adminNavItems, stakeholderNavItems } from '../nav';
import { APP_NAME, DRAWER_WIDTH, AppMode } from '../constants';

const BRAND_NAME = APP_NAME;

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

  const navItems = mode === AppMode.ADMIN ? adminNavItems : stakeholderNavItems;

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

  // ─── Language toggle (reused in AppBar and drawer footer) ──────────────
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

  // ─── Drawer content ────────────────────────────────────────────────────
  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar />
      <List sx={{ flex: 1 }}>
        {navItems.map((item) => (
          <ListItemButton
            key={item.path}
            selected={
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path)
            }
            onClick={() => handleNavClick(item.path)}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={t(item.labelKey)} />
          </ListItemButton>
        ))}
      </List>
      {/* Drawer footer: language on mobile */}
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

  const impersonateBannerHeight = 0;

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

          <Typography variant="h6" noWrap sx={{ flexGrow: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            {BRAND_NAME}
          </Typography>

          {/* Mode switch — only for admins, hidden on very small screens */}
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

          {/* Language toggle — hidden on xs (moved to drawer) */}
          {!isXs && <Box sx={{ ml: 1 }}>{langToggle}</Box>}

          {/* Avatar + action button */}
          {user && (
            <>
              <Tooltip title={user.name}>
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
                    sx={{ width: 32, height: 32, ml: 1, fontSize: '0.85rem' }}
                  >
                    {user.name?.charAt(0)?.toUpperCase()}
                  </Avatar>
                </Badge>
              </Tooltip>
              {!isXs && (
                <Typography variant="body2" sx={{ ml: 0.5 }} noWrap>
                  {user.name}
                </Typography>
              )}
              {isImpersonating ? (
                <Tooltip title={t('impersonate.stop')}>
                  <IconButton
                    color="inherit"
                    onClick={stopImpersonating}
                    size="small"
                    sx={{ color: 'warning.light' }}
                  >
                    <ExitImpersonateIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : (
                <IconButton color="inherit" onClick={logout} title={tAuth('logout')} size="small">
                  <LogoutIcon fontSize="small" />
                </IconButton>
              )}
            </>
          )}
        </Toolbar>
      </AppBar>

      {/* ─── Drawer ─── */}
      {isMobile ? (
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
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* ─── Main content ─── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
