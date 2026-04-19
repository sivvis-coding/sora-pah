import React from 'react';
import { RouteObject } from 'react-router-dom';
import IdeaList from './pages/IdeaList';
import IdeaDetail from './pages/IdeaDetail';
import CreateIdea from './pages/CreateIdea';

export const ideaRoutes: RouteObject[] = [
  { path: 'ideas', element: <IdeaList /> },
  { path: 'ideas/new', element: <CreateIdea /> },
  { path: 'ideas/:id', element: <IdeaDetail /> },
];
