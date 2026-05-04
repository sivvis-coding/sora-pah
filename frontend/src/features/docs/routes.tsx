import React from 'react';
import type { RouteObject } from 'react-router-dom';
import DocsPage from './pages/DocsPage';

export const docsRoutes: RouteObject[] = [
  { path: 'docs', element: <DocsPage /> },
];
