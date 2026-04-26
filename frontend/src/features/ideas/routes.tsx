import React from 'react';
import { RouteObject } from 'react-router-dom';
import IdeaList from './pages/IdeaList';
import IdeaDetail from './pages/IdeaDetail';
import ConversationalIdeaCreator from './pages/ConversationalIdeaCreator';

export const ideaRoutes: RouteObject[] = [
  { path: 'ideas', element: <IdeaList /> },
  { path: 'ideas/new', element: <ConversationalIdeaCreator /> },
  { path: 'ideas/:id', element: <IdeaDetail /> },
];
