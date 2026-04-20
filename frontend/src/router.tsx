import React from 'react';
import { Navigate, RouteObject, useRoutes } from 'react-router-dom';
import MainLayout from './shared/layouts/MainLayout';
import LoginPage from './features/auth/pages/LoginPage';
import LandingPage from './features/landing/LandingPage';
import StakeholderHome from './features/stakeholder-home/StakeholderHome';
import { useAuth } from './features/auth/AuthContext';
import { useMode } from './shared/ModeContext';
import { narrativeRoutes } from './features/narratives/routes';
import { ideaRoutes } from './features/ideas/routes';
import { categoryRoutes } from './features/categories/routes';
import { userRoutes } from './features/users/routes';
import { decisionRoutes } from './features/decisions/routes';
import { helpRoutes } from './features/help/routes';
import { myActivityRoutes } from './features/my-activity/routes';
import { AppMode } from './shared/constants';

function PublicRoute({ element }: { element: React.ReactElement }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" replace /> : element;
}

/**
 * Central route config — composed from feature route slices.
 *
 * New user (hasSeenLanding=false):  /welcome → LandingPage
 * Both modes:  /  → StakeholderHome (activity feed)
 * Admin mode:  extra routes for categories + users
 */
function AppRoutes() {
  const { isAuthenticated, isNewUser } = useAuth();
  const { mode } = useMode();

  const routes: RouteObject[] = [
    { path: '/login', element: <PublicRoute element={<LoginPage />} /> },
    { path: '/welcome', element: isAuthenticated ? <LandingPage /> : <Navigate to="/login" replace /> },
    {
      element: isAuthenticated
        ? (isNewUser ? <Navigate to="/welcome" replace /> : <MainLayout />)
        : <Navigate to="/login" replace />,
      children: [
        { index: true, element: <StakeholderHome /> },
        ...narrativeRoutes,
        ...ideaRoutes,
        ...decisionRoutes,
        ...helpRoutes,
        ...myActivityRoutes,
        ...(mode === AppMode.ADMIN ? [...categoryRoutes, ...userRoutes] : []),
      ],
    },
  ];

  return useRoutes(routes);
}

export default function Router() {
  return <AppRoutes />;
}
