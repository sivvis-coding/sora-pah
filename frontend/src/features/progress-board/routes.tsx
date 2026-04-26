import React from 'react';
import { RouteObject } from 'react-router-dom';
import ProgressBoardPage from './pages/ProgressBoardPage';

export const progressBoardRoutes: RouteObject[] = [
  { path: 'progress', element: <ProgressBoardPage /> },
];
