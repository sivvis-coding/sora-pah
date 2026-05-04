import React from 'react';
import { Navigate, RouteObject, useRoutes } from 'react-router-dom';
import MainLayout from './shared/layouts/MainLayout';
import LoginPage from './features/auth/pages/LoginPage';
import LandingPage from './features/landing/LandingPage';
import StakeholderHome from './features/stakeholder-home/StakeholderHome';
import SetupWizard from './features/setup/pages/SetupWizard';
import { useAuth } from './features/auth/AuthContext';
import { useSetup } from './features/setup/SetupProvider';
import { useMode } from './shared/ModeContext';
import { narrativeRoutes } from './features/narratives/routes';
import { ideaRoutes } from './features/ideas/routes';
import { tagRoutes } from './features/tags/routes';
import { userRoutes } from './features/users/routes';
import { decisionRoutes } from './features/decisions/routes';
import { docsRoutes } from './features/docs/routes';
import { learnRoutes } from './features/learn/routes';
import { myActivityRoutes } from './features/my-activity/routes';
import { adminRoutes } from './features/admin/routes';
import { aboutRoutes } from './features/about/routes';
import { progressBoardRoutes } from './features/progress-board/routes';
import { setupRoutes } from './features/setup/routes';
import { AppMode } from './shared/constants';

function PublicRoute({ element }: { element: React.ReactElement }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" replace /> : element;
}

function AppRoutes() {
  const { status } = useSetup();
  const { isAuthenticated, isNewUser } = useAuth();
  const { mode } = useMode();

  const hasClickup = !!status?.features?.clickup;
  const hasOpenAI = !!status?.features?.openai;

  // Not bootstrapped → only show setup wizard
  if (!status?.bootstrapped) {
    const routes: RouteObject[] = [
      { path: '/setup', element: <SetupWizard /> },
      { path: '*', element: <Navigate to="/setup" replace /> },
    ];
    return useRoutes(routes);
  }

  // Normal app routes
  const routes: RouteObject[] = [
    { path: '/login', element: <PublicRoute element={<LoginPage />} /> },
    { path: '/setup', element: <Navigate to="/" replace /> },
    { path: '/welcome', element: isAuthenticated ? <LandingPage /> : <Navigate to="/login" replace /> },
    {
      element: isAuthenticated
        ? (isNewUser ? <Navigate to="/welcome" replace /> : <MainLayout />)
        : <Navigate to="/login" replace />,
      children: [
        { index: true, element: <StakeholderHome /> },
        ...narrativeRoutes,
        ...ideaRoutes(hasOpenAI),
        ...decisionRoutes,
        ...docsRoutes,
        ...learnRoutes,
        ...myActivityRoutes,
        ...aboutRoutes,
        ...(hasClickup ? progressBoardRoutes : []),
        ...(mode === AppMode.ADMIN ? [...tagRoutes, ...userRoutes, ...adminRoutes, ...setupRoutes] : []),
      ],
    },
  ];

  return useRoutes(routes);
}

export default function Router() {
  return <AppRoutes />;
}
