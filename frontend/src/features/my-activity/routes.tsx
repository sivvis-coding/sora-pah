import type { RouteObject } from 'react-router-dom';
import MyActivityPage from './pages/MyActivityPage';

export const myActivityRoutes: RouteObject[] = [
  { path: 'my-activity', element: <MyActivityPage /> },
];
