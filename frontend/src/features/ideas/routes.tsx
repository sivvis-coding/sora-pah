import React from 'react';
import { RouteObject, useSearchParams } from 'react-router-dom';
import IdeaList from './pages/IdeaList';
import IdeaDetail from './pages/IdeaDetail';
import ConversationalIdeaCreator from './pages/ConversationalIdeaCreator';
import CreateIdea from './pages/CreateIdea';

function IdeaNewPage({ hasOpenAI }: { hasOpenAI: boolean }) {
  const [params] = useSearchParams();
  if (!hasOpenAI || params.get('mode') === 'manual') return <CreateIdea />;
  return <ConversationalIdeaCreator />;
}

export function ideaRoutes(hasOpenAI: boolean): RouteObject[] {
  return [
    { path: 'ideas', element: <IdeaList /> },
    { path: 'ideas/new', element: <IdeaNewPage hasOpenAI={hasOpenAI} /> },
    { path: 'ideas/:id', element: <IdeaDetail /> },
  ];
}
