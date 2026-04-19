import React from 'react';
import { Navigate, RouteObject, useRoutes } from 'react-router-dom';
import MainLayout from './shared/layouts/MainLayout';
import LoginPage from './features/auth/pages/LoginPage';
import LandingPage from './features/landing/LandingPage';
import StakeholderHome from './features/stakeholder-home/StakeholderHome';
import { useAuth } from './features/auth/AuthContext';
import { useMode } from './shared/ModeContext';
import { productRoutes } from './features/products/routes';
import { userRoutes } from './features/users/routes';
import { AppMode } from './shared/constants';

function PublicRoute({ element }: { element: React.ReactElement }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" replace /> : element;
}

/**
 * Central route config — composed from feature route slices.
 *
 * New user (hasSeenLanding=false):  /welcome → LandingPage
 * Stakeholder mode:  /  → StakeholderHome landing, no users route
 * Admin mode:        /  → redirect to /products, users route included
 */
function AppRoutes() {
  const { isAuthenticated, isNewUser } = useAuth();
  const { mode } = useMode();

  const indexRoute: RouteObject =
    mode === AppMode.STAKEHOLDER
      ? { index: true, element: <StakeholderHome /> }
      : { index: true, element: <Navigate to="/products" replace /> };

  const routes: RouteObject[] = [
    { path: '/login', element: <PublicRoute element={<LoginPage />} /> },
    // Landing page for new users — standalone, no MainLayout
    { path: '/welcome', element: isAuthenticated ? <LandingPage /> : <Navigate to="/login" replace /> },
    {
      element: isAuthenticated
        ? (isNewUser ? <Navigate to="/welcome" replace /> : <MainLayout />)
        : <Navigate to="/login" replace />,
      children: [
        indexRoute,
        ...productRoutes,
        ...(mode === AppMode.ADMIN ? userRoutes : []),
      ],
    },
  ];

  return useRoutes(routes);
}

export default function Router() {
  return <AppRoutes />;
}
