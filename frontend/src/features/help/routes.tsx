import type { RouteObject } from 'react-router-dom';
import HelpPage from './pages/HelpPage';

export const helpRoutes: RouteObject[] = [
  { path: 'help', element: <HelpPage /> },
];
