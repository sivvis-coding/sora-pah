import type { RouteObject } from 'react-router-dom';
import DecisionsPage from './pages/DecisionsPage';

export const decisionRoutes: RouteObject[] = [
  { path: 'decisions', element: <DecisionsPage /> },
];
