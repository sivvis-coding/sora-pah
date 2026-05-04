import React from 'react';
import {
  Home as HomeIcon, Lightbulb as IdeasIcon, Gavel as DecisionsIcon,
  History as ActivityIcon,
  People as UsersIcon,
  InfoOutlined as AboutIcon,
  RocketLaunch as ProgressIcon, AutoAwesome as WorkspaceIcon,
  Extension as IntegrationsIcon, LocalOffer as TagsIcon,
  MenuBook as DocsIcon,
  School as LearnIcon,
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
  { labelKey: 'nav.decisions', path: '/decisions', icon: <DecisionsIcon /> },
  { labelKey: 'nav.progress',  path: '/progress',  icon: <ProgressIcon /> },
  { labelKey: 'nav.docs',      path: '/docs',      icon: <DocsIcon /> },
  { labelKey: 'nav.learn',     path: '/learn',     icon: <LearnIcon /> },
];

/** Admin-only management section */
export const adminSectionItems: NavItem[] = [
  { labelKey: 'nav.tags',          path: '/tags',               icon: <TagsIcon /> },
  { labelKey: 'nav.users',         path: '/users',              icon: <UsersIcon /> },
  { labelKey: 'nav.workspace',     path: '/admin/user-story',   icon: <WorkspaceIcon /> },
  { labelKey: 'nav.integrations',  path: '/admin/integrations', icon: <IntegrationsIcon /> },
];

/** Secondary items — shown in mobile drawer footer & avatar menu, not in rail */
export const secondaryNavItems: NavItem[] = [
  { labelKey: 'nav.about',      path: '/about',       icon: <AboutIcon /> },
  { labelKey: 'nav.myActivity', path: '/my-activity',  icon: <ActivityIcon /> },
];
