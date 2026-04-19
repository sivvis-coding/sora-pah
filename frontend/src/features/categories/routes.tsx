import React from 'react';
import { RouteObject } from 'react-router-dom';
import CategoriesList from './pages/CategoriesList';

export const categoryRoutes: RouteObject[] = [
  { path: 'categories', element: <CategoriesList /> },
];
