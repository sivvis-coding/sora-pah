import React from 'react';
import {
  Home as HomeIcon,
  Lightbulb as IdeasIcon,
  Gavel as DecisionsIcon,
  HelpOutline as HelpIcon,
  History as ActivityIcon,
  Inventory as ProductsIcon,
  Category as CategoryIcon,
  People as UsersIcon,
} from '@mui/icons-material';

export interface NavItem {
  labelKey: string;
  path: string;
  icon: React.ReactElement;
}

/** Core navigation — always visible in rail + mobile drawer */
export const mainNavItems: NavItem[] = [
  { labelKey: 'nav.home',      path: '/',          icon: <HomeIcon /> },
  { labelKey: 'nav.ideas',     path: '/ideas',     icon: <IdeasIcon /> },
  { labelKey: 'nav.decisions', path: '/decisions',  icon: <DecisionsIcon /> },
];

/** Admin-only management section */
export const adminSectionItems: NavItem[] = [
  { labelKey: 'nav.products',   path: '/products',   icon: <ProductsIcon /> },
  { labelKey: 'nav.categories', path: '/categories', icon: <CategoryIcon /> },
  { labelKey: 'nav.users',      path: '/users',      icon: <UsersIcon /> },
];

/** Secondary items — shown in mobile drawer footer & avatar menu, not in rail */
export const secondaryNavItems: NavItem[] = [
  { labelKey: 'nav.help',       path: '/help',        icon: <HelpIcon /> },
  { labelKey: 'nav.myActivity', path: '/my-activity',  icon: <ActivityIcon /> },
];
