import React, { lazy, Suspense } from 'react';
import { RouteObject } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';

const TagsPage = lazy(() => import('./pages/TagsPage'));

const Loader = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
    <CircularProgress />
  </Box>
);

export const tagRoutes: RouteObject[] = [
  {
    path: 'tags',
    element: (
      <Suspense fallback={<Loader />}>
        <TagsPage />
      </Suspense>
    ),
  },
];
