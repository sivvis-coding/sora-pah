import React from 'react';
import {
  Inventory as ProductsIcon,
  People as UsersIcon,
  Home as HomeIcon,
} from '@mui/icons-material';

export interface NavItem {
  labelKey: string;
  path: string;
  icon: React.ReactElement;
}

/** Full nav for admin mode */
export const adminNavItems: NavItem[] = [
  { labelKey: 'nav.products', path: '/products', icon: <ProductsIcon /> },
  { labelKey: 'nav.users',    path: '/users',    icon: <UsersIcon /> },
];

/** Minimal nav for stakeholder mode */
export const stakeholderNavItems: NavItem[] = [
  { labelKey: 'nav.home',     path: '/',         icon: <HomeIcon /> },
  { labelKey: 'nav.products', path: '/products', icon: <ProductsIcon /> },
];

/** @deprecated use adminNavItems / stakeholderNavItems directly */
export const navItems = adminNavItems;
