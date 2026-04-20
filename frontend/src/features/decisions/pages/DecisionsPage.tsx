import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Box, Typography, CircularProgress, Chip } from '@mui/material';
import { Gavel as DecisionIcon, Lightbulb as IdeaIcon } from '@mui/icons-material';
import { decisionsApi, type Decision } from '../api/decisions.api';

export default function DecisionsPage() {
  const { t } = useTranslation('decisions');

  const { data: decisions, isLoading } = useQuery<Decision[]>({
    queryKey: ['decisions'],
    queryFn: decisionsApi.list,
  });

  if (isLoading) {
    return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 8 }} />;
  }

  if (!decisions?.length) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          textAlign: 'center',
          px: 3,
        }}
      >
        <DecisionIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
          {t('title')}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400, lineHeight: 1.7 }}>
          {t('empty')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: { xs: '100%', md: 720 }, mx: 'auto' }}>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>
        {t('title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        {t('subtitle')}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {decisions.map((decision, idx) => (
          <Box
            key={decision.id}
            sx={{
              py: 2.5,
              borderTop: idx === 0 ? 'none' : '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="body1" sx={{ fontWeight: 700, mb: 0.5 }}>
              {decision.title}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ lineHeight: 1.6, mb: 1 }}
            >
              {decision.rationale}
            </Typography>
            {decision.linkedIdeaIds.length > 0 && (
              <Chip
                size="small"
                icon={<IdeaIcon sx={{ fontSize: '12px !important' }} />}
                label={t('linkedIdeas', { count: decision.linkedIdeaIds.length })}
                sx={{ fontSize: '0.65rem', height: 20 }}
              />
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
