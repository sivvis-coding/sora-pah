import React from 'react';
import { RouteObject } from 'react-router-dom';
import IntegrationsPage from './pages/IntegrationsPage';

export const setupRoutes: RouteObject[] = [
  { path: 'admin/integrations', element: <IntegrationsPage /> },
];
