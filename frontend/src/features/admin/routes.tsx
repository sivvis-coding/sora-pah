import React from 'react';
import { RouteObject } from 'react-router-dom';
import AdminPage from './pages/AdminPage';
import UserStoryWorkspace from './pages/UserStoryWorkspace';

export const adminRoutes: RouteObject[] = [
  { path: 'admin', element: <AdminPage /> },
  { path: 'admin/user-story', element: <UserStoryWorkspace /> },
];
