import React from 'react';
import { Navigate, RouteObject, useRoutes } from 'react-router-dom';
import MainLayout from './shared/layouts/MainLayout';
import LoginPage from './features/auth/pages/LoginPage';
import { useAuth } from './features/auth/AuthContext';
import { productRoutes } from './features/products/routes';
import { userRoutes } from './features/users/routes';

/**
 * Redirects to /products if already authenticated, otherwise renders the login page.
 */
function PublicRoute({ element }: { element: React.ReactElement }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/products" replace /> : element;
}

/**
 * Wraps routes that require authentication.
 * Renders the main layout + children if authenticated, redirects to /login otherwise.
 */
function ProtectedLayout() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <MainLayout />;
}

/**
 * Central route config — composed from feature route slices.
 * Adding a new feature: import its RouteObject[] and spread into the children array.
 */
const routes: RouteObject[] = [
  { path: '/login', element: <PublicRoute element={<LoginPage />} /> },
  {
    element: <ProtectedLayout />,
    children: [
      { index: true, element: <Navigate to="/products" replace /> },
      ...productRoutes,
      ...userRoutes,
    ],
  },
];

export default function Router() {
  return useRoutes(routes);
}
