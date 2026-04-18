import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AppBar,
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useAuth } from '../../features/auth/AuthContext';
import { navItems } from '../nav';

/** Brand name — never translated. */
const BRAND_NAME = 'SORA — Product Alignment Hub';

const DRAWER_WIDTH = 240;

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation('shared');
  const { t: tAuth } = useTranslation('auth');

  const handleLanguageChange = (_: React.MouseEvent, newLang: string | null) => {
    if (newLang) {
      i18n.changeLanguage(newLang);
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (th) => th.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
          {BRAND_NAME}
          </Typography>

          <ToggleButtonGroup
            value={i18n.language?.startsWith('es') ? 'es' : 'en'}
            exclusive
            onChange={handleLanguageChange}
            size="small"
            sx={{
              mr: 2,
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
            <ToggleButton value="en">EN</ToggleButton>
            <ToggleButton value="es">ES</ToggleButton>
          </ToggleButtonGroup>

          {user && (
            <>
              <Typography variant="body2" sx={{ mr: 1 }}>
                {user.name}
              </Typography>
              <IconButton color="inherit" onClick={logout} title={tAuth('logout')}>
                <LogoutIcon />
              </IconButton>
            </>
          )}
        </Toolbar>
      </AppBar>

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
        <Toolbar />
        <List>
          {navItems.map((item) => (
            <ListItemButton
              key={item.path}
              selected={location.pathname.startsWith(item.path)}
              onClick={() => navigate(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={t(item.labelKey)} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
