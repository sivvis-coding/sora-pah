import { RouteObject } from 'react-router-dom';
import NarrativeList from './pages/NarrativeList';
import NarrativeDetail from './pages/NarrativeDetail';

export const narrativeRoutes: RouteObject[] = [
  { path: 'narratives', element: <NarrativeList /> },
  { path: 'narratives/:id', element: <NarrativeDetail /> },
];
