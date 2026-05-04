import React from 'react';
import type { RouteObject } from 'react-router-dom';
import LearnPage from './pages/LearnPage';

export const learnRoutes: RouteObject[] = [
  { path: 'learn', element: <LearnPage /> },
];
