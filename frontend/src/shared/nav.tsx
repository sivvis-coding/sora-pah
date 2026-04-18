import {
  Inventory as ProductsIcon,
  People as UsersIcon,
} from '@mui/icons-material';

export interface NavItem {
  labelKey: string;  // i18n key within the 'shared' namespace
  path: string;
  icon: React.ReactElement;
}

/**
 * Central nav config — drives the sidebar.
 * Add a new entry here when a feature gets a top-level nav item.
 */
import React from 'react';

export const navItems: NavItem[] = [
  { labelKey: 'nav.products', path: '/products', icon: <ProductsIcon /> },
  { labelKey: 'nav.users',    path: '/users',    icon: <UsersIcon /> },
];
