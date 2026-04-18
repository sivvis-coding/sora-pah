import React from 'react';
import { RouteObject } from 'react-router-dom';
import UserList from './pages/UserList';

export const userRoutes: RouteObject[] = [
  { path: 'users', element: <UserList /> },
];
